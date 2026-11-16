// Researches each branch of a multi-branch restaurant on Google Maps, so the
// site can show the real address, hours, phone and pin for every branch.
//
//   node scripts/research-branches.mjs                 # only the branches missing
//   node scripts/research-branches.mjs --all           # every branch, again
//   node scripts/research-branches.mjs --refresh       # ignore the cache
//
// Output: research/branch-locations.json (nothing in src/ is touched here).
// Apply it with: node scripts/apply-branches.mjs [--write]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restaurants } from "../src/data/restaurants.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "research");
const OUT_FILE = path.join(OUT_DIR, "branch-locations.json");

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

// Google answers the same query differently each time. Keep the first
// payload that resolved to a place, and keep looking for one that also
// carries the rating, which it leaves out about half the time.
async function placePayload(query) {
  let best = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const body = await get(`https://www.google.com/search?tbm=map&hl=en&gl=bh&q=${encodeURIComponent(query)}`);
    const payload = body.replace(/^\)\]\}'\s*/, "");
    if (!payload || !/0x[0-9a-f]{6,20}:0x[0-9a-f]{6,20}/i.test(payload)) continue;
    if (/null,null,null,\d\.\d,\d+\]/.test(payload)) return payload;
    if (!best) best = payload;
    await sleep(400 + Math.random() * 400);
  }
  return best;
}

export function parsePlace(payload) {
  const hex = payload.match(/0x[0-9a-f]{6,20}:0x[0-9a-f]{6,20}/i)?.[0] || "";
  if (!hex) return null; // the query did not resolve to a place
  const chij = payload.match(/ChIJ[A-Za-z0-9_-]{15,}/)?.[0] || "";

  const tail = payload.slice(payload.indexOf(hex) + hex.length);
  const name =
    tail.match(/"?\s*,\s*"([^"]{2,90})",null,\[/)?.[1] ||
    tail.match(/"?\s*,\s*"([^"]{2,90})"/)?.[1] ||
    "";
  if (!name) return null;

  const categories = [];
  const afterName = tail.slice(tail.indexOf(`"${name}"`) + name.length + 2);
  const catBlock = afterName.match(/^\s*,\s*null\s*,\s*\[((?:"[^"]+"\s*,?\s*){1,24})\]/);
  if (catBlock) {
    for (const m of catBlock[1].matchAll(/"((?:[^"\\]|\\.)+)"/g)) {
      const value = m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/").trim();
      if (value && value.length < 60) categories.push(value);
    }
  }

  const ratingBlock = payload.match(/null,null,null,(\d\.\d),(\d+)\]/);
  const reviewsText = payload.match(/"([\d,]+) reviews"/)?.[1] || "";
  const rating = ratingBlock ? Number(ratingBlock[1]) : null;
  const reviews = ratingBlock ? Number(ratingBlock[2]) : reviewsText ? Number(reviewsText.replace(/,/g, "")) : null;

  const fullAddress = payload.match(new RegExp(`"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, ([^"]{6,180})"`))?.[1] || "";
  const pair = payload.match(/\["([^"]{4,120})","([^"]{3,40})"\]/);
  const latlng = payload.match(/\[null,null,(\d{2}\.\d{4,}),(\d{2}\.\d{4,})\]/);
  const phoneFull = payload.match(/\+973[\s-]?\d{4}[\s-]?\d{4}/)?.[0];
  const phoneBare = payload.match(/(?:^|["\s,)])(\d{4}\s\d{4})(?:["\s,\]]|$)/)?.[1];
  const openNow = payload.match(/"(Open · [^"]{0,30}|Closed · [^"]{0,30}|24 hours)"/)?.[1] || "";

  const hours = {};
  for (const match of payload.matchAll(/"(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)",\d+,\[[\d,]+\],\[\["([^"]+)"/g)) {
    if (!hours[match[1]]) hours[match[1]] = match[2].replace(/[\u2013\u2014]/g, "-").trim();
  }

  const area = pair?.[2] || fullAddress.split(",").slice(-2).join(",").trim() || "";
  const address = fullAddress || (pair ? `${pair[1]}${pair[2] ? `, ${pair[2]}` : ""}` : "");
  return {
    name,
    categories,
    address,
    street: pair?.[1] || "",
    area,
    phone: phoneFull || (phoneBare ? `+973 ${phoneBare}` : ""),
    rating,
    reviews,
    openNow,
    hours: Object.keys(hours).length ? hours : null,
    lat: latlng ? Number(latlng[1]) : null,
    lng: latlng ? Number(latlng[2]) : null,
    placeId: chij || hex,
  };
}

// The brand words a branch name may not contain on its own.
const GENERIC_WORDS = new Set([
  "restaurant", "restaurants", "grill", "grills", "grilled", "cafe", "coffee", "shop", "store",
  "house", "center", "centre", "kitchen", "and", "the", "al", "el", "fast", "food", "eat",
  "eatery", "place", "branch", "main", "bakery", "sweets", "buffet", "company", "co", "wll",
  "international", "llc", "ltd", "bldg", "building", "shop", "express", "corner", "market",
]);

function coreName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !GENERIC_WORDS.has(w))
    .join(" ");
}

/** True when the resolved place is the brand, in the branch we asked for. */
export function isBranchOf(resolved, brand, branch) {
  const brandWords = coreName(brand).split(" ").filter(Boolean);
  const resolvedWords = coreName(resolved.name).split(" ").filter(Boolean);
  if (!brandWords.length) return false;
  const matched = brandWords.filter((w) => resolvedWords.some((r) => r.startsWith(w.slice(0, 4)) && w.length > 2));
  if (matched.length < brandWords.length) return false;
  // The branch must show up in the address, or in the place name.
  const haystack = `${resolved.name} ${resolved.address} ${resolved.area}`.toLowerCase();
  const needle = coreName(branch);
  return needle ? haystack.includes(needle) : true;
}

export async function main() {
  const args = process.argv.slice(2);
  const REFRESH = args.includes("--refresh");
  const ALL = args.includes("--all");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let cache = { results: {} };
  if (fs.existsSync(OUT_FILE) && !REFRESH) {
    try { cache = JSON.parse(fs.readFileSync(OUT_FILE, "utf8")); } catch { cache = { results: {} }; }
  }
  cache.results = cache.results || {};

  // Every branch of every restaurant that has more than one.
  const targets = [];
  for (const restaurant of restaurants) {
    if (!ALL && restaurant.branches.length < 2) continue;
    for (const branch of restaurant.branches) {
      const key = `${restaurant.id}::${branch}`;
      if (!ALL && cache.results[key]) continue;
      targets.push({ key, id: restaurant.id, name: restaurant.name, branch });
    }
  }

  console.log(`branches to research: ${targets.length} (${Object.keys(cache.results).length} already known)`);
  let done = 0;
  for (const target of targets) {
    done += 1;
    // A brand is often listed under its own name plus the area, sometimes
    // with the type word, sometimes without "Bahrain". Try the shapes in turn.
    const queries = [
      `${target.name} ${target.branch} Bahrain`,
      `${target.name} ${target.branch}`,
      `${target.name} ${target.branch} restaurant`,
      `${target.name} ${target.branch} Bahrain menu`,
    ];
    let record = null;
    for (const query of queries) {
      try {
        const payload = await placePayload(query);
        const parsed = payload ? parsePlace(payload) : null;
        if (parsed && isBranchOf(parsed, target.name, target.branch)) {
          record = {
            name: parsed.name,
            address: parsed.address,
            area: parsed.area,
            phone: parsed.phone,
            rating: parsed.rating,
            reviews: parsed.reviews,
            openNow: parsed.openNow,
            hours: parsed.hours,
            lat: parsed.lat,
            lng: parsed.lng,
            placeId: parsed.placeId,
          };
          break;
        }
      } catch {
        record = null;
      }
      await jitter(600);
    }
    cache.results[target.key] = record;
    cache.at = new Date().toISOString();
    fs.writeFileSync(OUT_FILE, JSON.stringify(cache, null, 1));
    const found = record ? `${record.address || record.area || "?"}` : "not found";
    console.log(`  [${done}/${targets.length}] ${target.key} -> ${found}`);
    await jitter(500);
  }
  console.log(`done. ${Object.keys(cache.results).length} branch records in ${OUT_FILE}`);
}

if (process.argv[1] && process.argv[1].endsWith("research-branches.mjs")) {
  await main();
}

