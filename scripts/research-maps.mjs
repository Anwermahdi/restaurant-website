// Google Maps research pass: for every restaurant, resolve the real place record
// so locations and cuisine come from Google instead of guesses.
//
//   node scripts/research-maps.mjs                    # all restaurants
//   node scripts/research-maps.mjs aseeri-star milano  # only these
//   node scripts/research-maps.mjs --refresh          # ignore the cache
//
// Output: research/maps-scan.json (nothing in src/ is touched by this script).
// Apply it with: node scripts/apply-research.mjs [--write]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restaurants } from "../src/data/restaurants.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "research");
const OUT_FILE = path.join(OUT_DIR, "maps-scan.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const HEADERS = { "user-agent": UA, "accept-language": "en-US,en;q=0.9" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base) => sleep(base + Math.random() * 600);

async function get(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(40000) });
      if (res.status === 429 || res.status === 503) { await sleep(2600 * attempt); continue; }
      return await res.text();
    } catch (error) {
      if (attempt === tries) throw error;
      await sleep(1100 * attempt);
    }
  }
  throw new Error("request failed");
}

// tbm=map resolves a query to one place record; the payload is a nested array.
// Google omits the rating block on roughly half the responses, so retry once.
async function placePayload(query) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const body = await get(`https://www.google.com/search?tbm=map&hl=en&gl=bh&q=${encodeURIComponent(query)}`);
    const payload = body.replace(/^\)\]\}'\s*/, "");
    if (attempt === 0 && !/null,null,null,\d\.\d,\d+\]/.test(payload)) {
      await sleep(500 + Math.random() * 400);
      continue;
    }
    return payload;
  }
  return "";
}

function parsePlace(payload) {
  const hex = payload.match(/0x[0-9a-f]{6,20}:0x[0-9a-f]{6,20}/i)?.[0] || "";
  if (!hex) return null; // "spotlight" stub: the query did not resolve to a place
  const chij = payload.match(/ChIJ[A-Za-z0-9_-]{15,}/)?.[0] || "";

  // Real name sits right after the hex id, followed by the category array.
  const tail = payload.slice(payload.indexOf(hex) + hex.length);
  const name =
    tail.match(/"?\s*,\s*"([^"]{2,90})",null,\[/)?.[1] ||
    tail.match(/"?\s*,\s*"([^"]{2,90})"/)?.[1] ||
    "";
  if (!name) return null;

  // Category list: the array of type names that follows the name.
  const categories = [];
  const afterName = tail.slice(tail.indexOf(`"${name}"`) + name.length + 2);
  const catBlock = afterName.match(/^\s*,\s*null\s*,\s*\[((?:"[^"]+"\s*,?\s*){1,24})\]/);
  if (catBlock) {
    for (const m of catBlock[1].matchAll(/"((?:[^"\\]|\\.)+)"/g)) {
      const value = m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/").trim();
      if (value && value.length < 60) categories.push(value);
    }
  }

  // rating + review count live together: ...,"496 reviews",null,"id"],null,null,null,4.6,496]
  const ratingBlock = payload.match(/null,null,null,(\d\.\d),(\d+)\]/);
  const reviewsText = payload.match(/"([\d,]+) reviews"/)?.[1] || "";
  const rating = ratingBlock ? Number(ratingBlock[1]) : null;
  const reviews = ratingBlock ? Number(ratingBlock[2]) : reviewsText ? Number(reviewsText.replace(/,/g, "")) : null;

  // Address: "<name>, <street>, <area>, <area2>" plus the bare street/area pair.
  const fullAddress = payload.match(new RegExp(`"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, ([^"]{6,180})"`))?.[1] || "";
  const pair = payload.match(/\["([^"]{4,120})","([^"]{3,40})"\]/);
  const latlng = payload.match(/\[null,null,(\d{2}\.\d{4,}),(\d{2}\.\d{4,})\]/);
  const phoneFull = payload.match(/\+973[\s-]?\d{4}[\s-]?\d{4}/)?.[0];
  const phoneBare = payload.match(/(?:^|["\s,)])(\d{4}\s\d{4})(?:["\s,\]]|$)/)?.[1];
  // Website: the [url, domain] pair, but never a Google-owned property.
  const siteMatch = payload.match(/\["(https?:\/\/[^"]{6,160})","([^"]{4,80})"/);
  const website =
    siteMatch && !/(^|\.)(google|googleusercontent|search\.google|gstatic|googleapis)\./i.test(siteMatch[2]) &&
    /\.[a-z]{2,}/i.test(siteMatch[2]) && !/^\d[\d,]*$/.test(siteMatch[2])
      ? siteMatch[2]
      : "";
  const openNow = payload.match(/"(Open · [^"]{0,30}|Closed · [^"]{0,30}|24 hours)"/)?.[1] || "";
  const arabicName = payload.match(/"([؀-ۿ][^"]{2,60})"/)?.[1] || "";

  // Weekly hours: ["Sunday",7,[2026,9,27],[["11 AM-11 PM",[[11],[23]]]],0,1]
  const hours = {};
  for (const match of payload.matchAll(/"(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)",\d+,\[[\d,]+\],\[\["([^"]+)"/g)) {    if (!hours[match[1]]) hours[match[1]] = match[2].replace(/[\u2013\u2014]/g, "-").trim();
  }

  const area = pair?.[2] || fullAddress.split(",").slice(-2).join(",").trim() || "";
  // Some payloads only carry the street/area pair, so fall back to it.
  const address = fullAddress || (pair ? `${pair[1]}${pair[2] ? `, ${pair[2]}` : ""}` : "");
  return {
    name,
    nameAr: arabicName,
    categories,
    address,
    street: pair?.[1] || "",
    area,
    phone: phoneFull || (phoneBare ? `+973 ${phoneBare}` : ""),
    rating,
    reviews,
    website,
    openNow,
    hours: Object.keys(hours).length ? hours : null,
    lat: latlng ? Number(latlng[1]) : null,
    lng: latlng ? Number(latlng[2]) : null,
    placeId: chij || hex,
    hexId: hex,
  };
}

// Google appends the type to the name ("Al Farhan Turkish Grills"). Score the
// distinctive part of the name so those still count as a match.
const GENERIC_WORDS = new Set([
  "restaurant", "restaurants", "grill", "grills", "grilled", "cafe", "coffee", "shop", "store",
  "house", "center", "centre", "kitchen", "and", "the", "al", "el", "fast", "food", "eat",
  "eatery", "place", "branch", "main", "restaurant", "bakery", "sweets", "kitchen", "buffet",
]);
function coreName(value) {
  const words = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !GENERIC_WORDS.has(w));
  return words.length ? words.join(" ") : String(value || "");
}

// Strip accents and spell numbers out as digits, so "5 Spoons" matches
// "Five Spoons Restaurant" and "MELENZANE" matches "Melenzané".
const NUMBER_WORDS = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12" };
const norm = (v) =>
  String(v || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (w) => NUMBER_WORDS[w])
    .replace(/[^a-z0-9]/g, "");

// Trigram Dice coefficient: robust against "Aseeri" vs "Aseer", "Le" vs "La".
function trigrams(value) {
  const s = ` ${norm(value)} `;
  const out = new Set();
  for (let i = 0; i < s.length - 2; i += 1) out.add(s.slice(i, i + 3));
  return out;
}
function similarity(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const diceOf = (p, q) => {
    const ta = trigrams(p);
    const tb = trigrams(q);
    let shared = 0;
    for (const g of ta) if (tb.has(g)) shared += 1;
    return (2 * shared) / (ta.size + tb.size);
  };
  const full = Math.max(x.includes(y) || y.includes(x) ? 0.88 : 0, diceOf(x, y));
  const core = Math.max(norm(coreName(a)) === norm(coreName(b)) ? 1 : 0, diceOf(` ${coreName(a)} `, ` ${coreName(b)} `));
  if (coreName(a) && coreName(b) && (norm(coreName(a)).includes(norm(coreName(b))) || norm(coreName(b)).includes(norm(coreName(a))))) {
    return Math.max(0.9, core, full);
  }
  return Math.max(full, core * 0.95);
}

// A place only counts if Google says it is food. This is what stops a "Milano"
// shoe store from being accepted as the pizza place.
const FOOD_CATEGORIES = new RegExp(
  "^(restaurant|cafe|coffee shop|tea house|juice bar|smoothie shop|fast food restaurant|pizza restaurant|burger restaurant|sandwich shop|chicken restaurant|fried chicken|grill|bbq|barbecue|kebab|shawarma|steakhouse|meat restaurant|butcher|seafood restaurant|sea food restaurant|fish|pasta restaurant|italian restaurant|trattoria|pizzeria|indian restaurant|south indian restaurant|modern indian restaurant|biryani restaurant|pakistani restaurant|bengali restaurant|chinese restaurant|asian restaurant|japanese restaurant|sushi restaurant|thai restaurant|korean restaurant|vietnamese restaurant|filipino restaurant|nepalese restaurant|tibetan restaurant|malay restaurant|indonesian restaurant|lebanese restaurant|middle eastern restaurant|syrian restaurant|iraqi restaurant|palestinian restaurant|jordanian restaurant|egyptian restaurant|turkish restaurant|greek restaurant|cypriot restaurant|persian restaurant|iranian restaurant|afghan restaurant|uzbek restaurant|kazakh restaurant|moroccan restaurant|berber restaurant|tunisian restaurant|ethiopian restaurant|eritrean restaurant|american restaurant|mexican restaurant|tex-mex restaurant|french restaurant|spanish restaurant|portuguese restaurant|italian mediterranean|russian restaurant|european restaurant|breakfast restaurant|brunch restaurant|buffet restaurant|food court|bakery|bakery|cake shop|dessert shop|ice cream shop|sweets shop|confectionery|delicatessen|deli|roastery|coffee roastery|market|supermarket|grocery|food establishment|caterer|catering|hotel restaurant|resort|cafe & restaurant|hookah lounge|lounge|club|pub|bar)$",
  "i",
);
const FOOD_NAME_HINT = /(restaurant|grill|pizza|burger|chicken|broast|kebab|shawarma|sweets|bakery|cafe|coffee|kitchen|food|fish|meat|steak|pasta|lassi|juice|falafel|mandi|chapati|karahi|biryani|mandi|restaurant|poultry|donair|manakish|ayala|mabrouk|barbecue)/i;

function isFoodPlace(place) {
  if (place.categories.some((c) => FOOD_CATEGORIES.test(c.trim()))) return true;
  if (/^(Market|Supermarket|Grocery|Caterer|Hotel|Resort)$/i.test(place.categories[0] || "")) return false;
  return FOOD_NAME_HINT.test(place.name);
}

const BAHRAIN_AREAS = [
  "Manama", "Adliya", "Amwaj", "Gudaif", "Juffair", "Seef", "Jidar Al Aali", "A'ali", "Aali",
  "Busaiteen", "Busaiteen", "Riffa", "Riffa", "Sitra", "Sahlat", "Al Saya", "Karbabad", "Janabiyah",
  "Al Budaiya", "Budaiya", "Saar", "Al Qalali", "Qalali", "Tubarat", "Muharraq", "Hidd", "Halat Al Sahlat",
  "Abu Rayyan", "Ain Ashi", "Diyar Al Muharraq", "Hamad Town", "Isa Town", "Awl", "Kalaif", "Karranah",
  "Malkiya", "Al Malkiyah", "Awala", "Um Al Hassam", "Jidir Al Aali", "Madinat Um Al Hassam", "Adhariya",
  "Arad", "Askar", "Zinjawar", "Al Zinjawar", "Diyar Al Muharraq", "Al Qalaliya", "Samir", "Baharna",
  "Awali", "Durrat Al Bahrain", "Dar Zoom", "Al Areen", "Valley City", "Sadeen", "Al Jurf",
];

function areaFrom(text) {
  const value = String(text || "");
  const hits = BAHRAIN_AREAS.filter((a) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(value));
  return hits[0] || "";
}

async function researchOne(restaurant) {
  const area = areaFrom(restaurant.address) || areaFrom(restaurant.branches?.join(" "));
  const queries = [
    `${restaurant.name} Bahrain`,
    `${restaurant.name} ${area} Bahrain`,
    `${restaurant.name} ${restaurant.cuisine} Bahrain`,
    restaurant.branches?.length ? `${restaurant.name} ${restaurant.branches[0]} Bahrain` : null,
    `${restaurant.name} restaurant Bahrain`,
  ].filter(Boolean);

  const seenQueries = new Set();
  const places = [];
  const attempts = [];
  for (const q of queries) {
    if (seenQueries.has(q.toLowerCase())) continue;
    seenQueries.add(q.toLowerCase());
    try {
      const payload = await placePayload(q);
      const place = parsePlace(payload);
      if (!place) { attempts.push({ q, resolved: false }); await jitter(700); continue; }
      place.query = q;
      place.nameScore = similarity(restaurant.name, place.name);
      place.areaFromAddress = areaFrom(place.address) || areaFrom(place.area);
      place.isFood = isFoodPlace(place);
      if (!place.isFood) {
        attempts.push({ q, resolved: true, rejected: "not a food place", name: place.name, categories: place.categories });
        await jitter(700);
        continue;
      }
      if (!places.some((p) => p.placeId === place.placeId)) places.push(place);
      attempts.push({ q, resolved: true, name: place.name, nameScore: Number(place.nameScore.toFixed(2)), rating: place.rating });
      if (place.nameScore >= 0.92 && place.rating !== null) break;
    } catch (error) {
      attempts.push({ q, error: error.message });
    }
    await jitter(1000);
    if (places.length >= 3) break;
  }

  if (!places.length) return { id: restaurant.id, name: restaurant.name, error: "not resolved", attempts };
  // Prefer a name match, then one that agrees with our area.
  places.sort((a, b) => {
    const areaBonus = (p) => (p.areaFromAddress && area && p.areaFromAddress.toLowerCase() === area.toLowerCase() ? 0.1 : 0);
    return b.nameScore + areaBonus(b) - (a.nameScore + areaBonus(a));
  });
  const best = places[0];

  // Google sometimes omits the rating block entirely; one more attempt with the
  // exact Google name usually returns it.
  if (best.rating === null) {
    try {
      const again = parsePlace(await placePayload(`${best.name} Bahrain`));
      if (again && again.rating !== null) {
        best.rating = again.rating;
        best.reviews = again.reviews;
        best.categories = best.categories.length ? best.categories : again.categories;
        best.address = best.address || again.address;
        best.website = best.website || again.website;
        best.hours = best.hours || again.hours;
      }
    } catch { /* keep what we have */ }
    await jitter(700);
  }
  return {
    id: restaurant.id,
    name: restaurant.name,
    current: {
      cuisine: restaurant.cuisine,
      address: restaurant.address,
      branches: restaurant.branches,
      phone: restaurant.phone,
      hours: restaurant.hours,
      rating: restaurant.rating,
      reviews: restaurant.reviews,
    },
    resolved: {
      name: best.name,
      nameAr: best.nameAr,
      categories: best.categories,
      address: best.address,
      area: areaFrom(best.address) || best.areaFromAddress || "",
      phone: best.phone,
      rating: best.rating,
      reviews: best.reviews,
      website: best.website,
      openNow: best.openNow,
      hours: best.hours,
      lat: best.lat,
      lng: best.lng,
      placeId: best.placeId,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${best.name} Bahrain`)}`,
    },
    nameScore: Number(best.nameScore.toFixed(2)),
    alsoFound: places.slice(1).map((p) => ({ name: p.name, categories: p.categories, address: p.address, nameScore: Number(p.nameScore.toFixed(2)) })),
    attempts,
  };
}

const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith("--"));
const refresh = args.includes("--refresh");
// --hours only re-queries the places whose opening times are still missing.
const hoursOnly = args.includes("--hours");

const targets = ids.length
  ? restaurants.filter((r) => ids.includes(r.id) || ids.some((i) => norm(r.name).includes(norm(i))))
  : restaurants;

fs.mkdirSync(OUT_DIR, { recursive: true });
const previous = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) : { results: [] };
const store = previous.results || [];

async function fillHours(restaurant) {
  const record = store.find((s) => s.id === restaurant.id);
  if (!record?.resolved) return null;
  const name = record.resolved.name;
  const place = parsePlace(await placePayload(`${name} Bahrain`));
  if (!place?.hours) return null;
  record.resolved.hours = place.hours;
  if (!record.resolved.openNow && place.openNow) record.resolved.openNow = place.openNow;
  if (!record.resolved.address && place.address) record.resolved.address = place.address;
  return place.hours;
}

if (hoursOnly) {
  const todo = store.filter((r) => r.resolved && (!r.resolved.hours || Object.keys(r.resolved.hours).length < 2));
  console.log(`filling hours for ${todo.length} places`);
  for (let i = 0; i < todo.length; i += 1) {
    try {
      const hours = await fillHours({ id: todo[i].id });
      console.log(`  [${i + 1}/${todo.length}] ${todo[i].id}: ${hours ? Object.values(hours).slice(0, 2).join(" / ") + ` (${Object.keys(hours).length} days)` : "still none"}`);
    } catch (error) {
      console.log(`  [${i + 1}/${todo.length}] ${todo[i].id}: ERROR ${error.message}`);
    }
    fs.writeFileSync(OUT_FILE, JSON.stringify({ at: new Date().toISOString(), count: store.length, results: store }, null, 2));
    await jitter(1000);
  }
  console.log("done.");
  process.exit(0);
}

console.log(`researching ${targets.length} restaurant(s) -> ${path.relative(ROOT, OUT_FILE)}`);
for (let i = 0; i < targets.length; i += 1) {
  const restaurant = targets[i];
  const cached = store.find((s) => s.id === restaurant.id);
  if (cached?.resolved && !refresh) {
    console.log(`  [${i + 1}/${targets.length}] ${restaurant.id}: cached`);
    continue;
  }
  const t0 = Date.now();
  try {
    const result = await researchOne(restaurant);
    const at = store.findIndex((s) => s.id === restaurant.id);
    const record = { ...result, at: new Date().toISOString() };
    if (at >= 0) store[at] = record; else store.push(record);
    fs.writeFileSync(OUT_FILE, JSON.stringify({ at: new Date().toISOString(), count: store.length, results: store }, null, 2));
    if (result.error) console.log(`  [${i + 1}/${targets.length}] ${restaurant.id}: ${result.error} (${Math.round((Date.now() - t0) / 1000)}s)`);
    else {
      const r = result.resolved;
      console.log(
        `  [${i + 1}/${targets.length}] ${restaurant.id} -> "${r.name}" [${r.categories.slice(0, 4).join(", ")}] @ ${r.area || "?"} | ${r.rating ?? "-"}${(r.reviews ?? 0) ? ` (${r.reviews})` : ""} | ${r.phone || "no phone"} | match ${result.nameScore} | ${Math.round((Date.now() - t0) / 1000)}s`,
      );
    }
  } catch (error) {
    console.log(`  [${i + 1}/${targets.length}] ${restaurant.id}: ERROR ${error.message}`);
  }
  await jitter(900);
}
console.log(`done. ${store.length} records cached.`);
