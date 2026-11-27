// Map-pin check against OpenStreetMap.
//
// This script never edits restaurant data. It compares every stored pin (the
// restaurant pin and every branch pin) with OpenStreetMap and writes a report:
//
//   1. Name match: is there a food place in OSM with the same name near the
//      pin? If OSM only has it somewhere else, the pin may be wrong.
//   2. Area match: is the pin inside (or close to) the area the listing names?
//   3. Area centres: is each AREA_COORDS centre near the OSM place of that name?
//   4. Plain sanity: inside Bahrain, not a duplicate of another restaurant's pin.
//
// Pins come from restaurants.js (restaurant and branch locations) and from
// src/data/branch-coords.json, which the site map and distance sort also use.
//
// OSM is a second opinion, not the truth. Small Bahrain restaurants are often
// missing from OSM, so "not in OSM" is not an error. Only flags that a person
// has confirmed should lead to a data change.
//
//   node scripts/check-locations-osm.mjs                # query Nominatim
//   node scripts/check-locations-osm.mjs --save=osm.json  # keep the answers
//   node scripts/check-locations-osm.mjs --input=osm.json # reuse saved answers
//
// It uses the public Nominatim API (OpenStreetMap's geocoder) at one request
// per second, as its usage policy asks: about 330 requests, so ~6 minutes.
// The answers file maps "r:<lat,lng>" (reverse lookup of a pin), "a:<area>"
// (area search) and "n:<name>" (restaurant name search) to compact rows, so
// the same file can be produced by any client that can reach Nominatim.
//
// Output: reports/location-osm-check.json and reports/location-osm-check.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restaurants, AREA_COORDS_EXPORT as AREA_COORDS } from "../src/data/restaurants.js";
import branchCoords from "../src/data/branch-coords.json" with { type: "json" };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = path.join(ROOT, "reports");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  })
);

// Thresholds in metres.
const NAME_NEAR = 300; // a same-name OSM place this close confirms the pin
const NAME_FAR = 800; // a same-name OSM place only beyond this flags the pin
const CENTRE_NEAR = 2000; // AREA_COORDS centre to the OSM place of that name
const NOMINATIM = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
const FOOD_TYPES = /^(amenity\/(restaurant|fast_food|cafe|food_court|ice_cream)|shop\/(bakery|pastry|confectionery))$/;

// Area names as the site writes them, mapped to the spellings OSM uses.
const AREA_ALIASES = {
  "Hamad Town": ["Hamad Town", "Madinat Hamad", "مدينة حمد"],
  "East Riffa": ["East Riffa", "الرفاع الشرقي"],
  Riffa: ["Riffa", "West Riffa", "East Riffa", "الرفاع", "الرفاع الغربي", "الرفاع الشرقي"],
  "Riffa Views": ["Riffa Views", "Riffa", "الرفاع"],
  "Dar Kulaib": ["Dar Kulaib", "Dar Kulayb", "دار كليب"],
  Seef: ["Seef", "Al Seef", "السيف"],
  Saar: ["Saar", "سار"],
  Manama: ["Manama", "المنامة"],
  "Bilad Al Qadeem": ["Bilad Al Qadeem", "Bilad al Qadim", "البلاد القديم"],
  "Zayed Town": ["Zayed Town", "Madinat Zayed", "مدينة زايد"],
  "Isa Town": ["Isa Town", "Madinat Isa", "مدينة عيسى"],
  Zinj: ["Zinj", "الزنج"],
  Malkiya: ["Malkiya", "Malkiyah", "Al Malikiyah", "Malikiya", "المالكية"],
  Jidhafs: ["Jidhafs", "Jidd Hafs", "جدحفص"],
  Budaiya: ["Budaiya", "Al Budayyi", "البديع"],
  "A'ali": ["A'ali", "Aali", "A'Ali", "عالي"],
  Muqaba: ["Maqabah", "Muqaba", "Al Maqsha", "مقابة"],
  Maqabah: ["Maqabah", "Muqaba", "مقابة"],
  Juffair: ["Juffair", "Al Juffair", "الجفير"],
  Tubli: ["Tubli", "توبلي"],
  Jerdab: ["Jurdab", "Jerdab", "Jardab", "جرداب"],
  Samaheej: ["Samaheej", "Samahij", "سماهيج"],
  Janabiyah: ["Janabiyah", "Al Janabiyah", "الجنبية"],
  Jannusan: ["Jannusan", "Jannosan", "جنوسان"],
  "Al Sayh": ["Al Sayh", "Al Sayah", "Sayah", "السايه", "السايح"],
  Sitra: ["Sitra", "سترة"],
  Galaly: ["Galaly", "Galali", "قلالي"],
  Busaiteen: ["Busaiteen", "Al Busaiteen", "البسيتين"],
  Sanad: ["Sanad", "سند"],
  Hidd: ["Hidd", "Al Hidd", "الحد"],
  "Al Hidd": ["Hidd", "Al Hidd", "الحد"],
  Karzakkan: ["Karzakkan", "Karzakan", "كرزكان"],
  Arad: ["Arad", "عراد"],
  Hamala: ["Hamala", "Hamalah", "الهملة"],
  "Jid Ali": ["Jid Ali", "Jidd Ali", "جد علي"],
  Adliya: ["Adliya", "Al Adliya", "العدلية"],
  "Al Hoora": ["Al Hoora", "Hoora", "Al Hura", "الحورة"],
  Muharraq: ["Muharraq", "Al Muharraq", "المحرق"],
  Amwaj: ["Amwaj", "Amwaj Islands", "جزر أمواج"],
  Shakura: ["Shakhura", "Shakura", "الشاخورة"],
  Zallaq: ["Zallaq", "Az Zallaq", "الزلاق"],
  Diyar: ["Diyar Al Muharraq", "Diyar", "ديار المحرق"],
  "Umm Al Hassam": ["Umm Al Hassam", "Umm al Hasam", "أم الحصم"],
  "Al Lawzi": ["Al Lawzi", "Lawzi", "اللوزي"],
  Daih: ["Daih", "Diah", "Al Daih", "الديه"],
  Qudaibiya: ["Qudaibiya", "Gudaibiya", "Al Qudaibiya", "القضيبية"],
  "Sea Front": ["Sea Front", "Seef", "Manama"],
  "City Centre": ["Seef", "Manama"],
  Alhajiyat: ["Al Hajiyat", "Hajiyat", "الحجيات", "Riffa"],
};

const toRad = (d) => (d * Math.PI) / 180;
export function distanceM(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const GENERIC = new Set([
  "restaurant", "restaurants", "cafe", "café", "coffee", "grill", "grills", "and", "the",
  "bahrain", "co", "wll", "w", "l", "spc", "kitchen", "مطعم", "مقهى", "كافيه", "و", "ال",
]);
export function nameTokens(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/['’`]/g, "")
    .split(/[^a-z0-9\u0600-\u06ff]+/)
    .filter((t) => t && !GENERIC.has(t));
}

// Two names match when the shorter one's tokens are all in the longer one
// (so "Tren Tren" matches "Tren Tren Riffa Restaurant & Grills").
export function namesMatch(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.join("").length < 3) return false;
  const set = new Set(long);
  if (short.every((t) => set.has(t))) return true;
  return long.join("").includes(short.join("")) && short.join("").length >= 5;
}

const key5 = (lat, lng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

function pinsOf(r) {
  const pins = [];
  const multi = (r.locations || []).length > 1;
  if (r.coordSource !== "area" && Number.isFinite(r.lat) && Number.isFinite(r.lng) && !multi) {
    pins.push({ id: r.id, branch: "", area: r.area, address: r.address, lat: r.lat, lng: r.lng });
  }
  for (const l of r.locations || []) {
    if (!Number.isFinite(l.lat) || !Number.isFinite(l.lng)) continue;
    if (!multi && pins.some((p) => p.lat === l.lat && p.lng === l.lng)) continue;
    pins.push({ id: r.id, branch: l.name, area: l.area || r.area, address: l.address, lat: l.lat, lng: l.lng });
  }
  // The site map and "Nearest to me" also use src/data/branch-coords.json.
  for (const b of r.branches || []) {
    const c = branchCoords[`${r.id}|${b}`];
    if (!c || pins.some((p) => p.lat === c.lat && p.lng === c.lng)) continue;
    pins.push({ id: r.id, branch: b, area: b, address: "", lat: c.lat, lng: c.lng, from: "branch-coords" });
  }
  return pins;
}

const searchNames = (r) =>
  [...new Set([r.name, r.googleName].filter(Boolean).map((n) => n.replace(/\\u0026/g, "&").trim()))];

export function buildJobs() {
  const jobs = new Map();
  for (const r of restaurants) {
    for (const p of pinsOf(r)) {
      const k = key5(p.lat, p.lng);
      jobs.set(`r:${k}`, `/reverse?lat=${k.split(",")[0]}&lon=${k.split(",")[1]}&format=jsonv2&zoom=17&accept-language=en`);
    }
  }
  for (const a of Object.keys(AREA_COORDS)) {
    jobs.set(`a:${a}`, `/search?q=${encodeURIComponent(`${a}, Bahrain`)}&format=jsonv2&limit=3&accept-language=en`);
  }
  for (const r of restaurants) {
    for (const n of searchNames(r)) {
      jobs.set(`n:${n}`, `/search?q=${encodeURIComponent(n)}&countrycodes=bh&format=jsonv2&limit=10&accept-language=en`);
    }
  }
  return jobs;
}

// Reverse rows: "name|amenity|road|neighbourhood|suburb|town|state".
// Search rows: [lat, lng, "category/type", name, "rest of the address"].
function compact(kind, j) {
  if (kind === "r") {
    const a = j.address || {};
    return [j.name, a.amenity, a.road, a.neighbourhood || a.quarter || a.residential || a.retail,
      a.suburb || a.village || a.hamlet, a.town || a.city, a.state].map((v) => v || "").join("|");
  }
  return (Array.isArray(j) ? j : []).map((x) => [
    +(+x.lat).toFixed(5), +(+x.lon).toFixed(5), `${x.category}/${x.type}`,
    (x.name || "").slice(0, 40), x.display_name.split(", ").slice(1, 4).join(", "),
  ]);
}

async function fetchAll(jobs, have = {}) {
  const out = { ...have };
  let i = 0;
  for (const [k, u] of jobs) {
    i++;
    if (out[k] && !String(out[k]).startsWith("ERR")) continue;
    try {
      const res = await fetch(NOMINATIM + u, { headers: { "User-Agent": "foodfind-location-check/1.0" } });
      out[k] = compact(k[0], await res.json());
    } catch (e) {
      out[k] = `ERR ${e.message}`;
    }
    if (i % 25 === 0) console.error(`${i}/${jobs.size}`);
    await new Promise((r) => setTimeout(r, 1100));
  }
  return out;
}

function areaMatches(area, text) {
  const t = String(text || "").toLowerCase();
  return (AREA_ALIASES[area] || [area]).some((a) => t.includes(a.toLowerCase()));
}

function check(ans) {
  const results = [];
  const seen = new Map();
  for (const r of restaurants) {
    const names = searchNames(r);
    const hits = names
      .flatMap((n) => (Array.isArray(ans[`n:${n}`]) ? ans[`n:${n}`] : []))
      .filter(([, , type, name]) => FOOD_TYPES.test(type) && names.some((n) => namesMatch(n, name)))
      .map(([lat, lng, type, name, where]) => ({ lat, lng, type, name, where }));
    for (const pin of pinsOf(r)) {
      const flags = [];
      if (pin.lat < 25.5 || pin.lat > 26.35 || pin.lng < 50.3 || pin.lng > 50.85) flags.push("outside Bahrain");

      const near = hits.map((h) => ({ ...h, d: distanceM(pin, h) })).sort((a, b) => a.d - b.d);
      let osmName = "not in OSM";
      if (near[0]?.d <= NAME_NEAR) osmName = `confirmed by "${near[0].name}" (${near[0].d} m)`;
      else if (near[0]) {
        osmName = `OSM has "${near[0].name}" ${near[0].d} m away at ${near[0].lat}, ${near[0].lng} (${near[0].where})`;
        // Another branch of the same chain is not a wrong pin.
        const otherPins = pinsOf(r).filter((p) => p !== pin);
        const isOtherBranch = otherPins.some((p) => distanceM(p, near[0]) <= NAME_NEAR);
        if (near[0].d > NAME_FAR && !isOtherBranch && (r.locations || []).length <= 1) flags.push("name found elsewhere in OSM");
      }

      const rev = ans[`r:${key5(pin.lat, pin.lng)}`] || "";
      const label = pin.branch && AREA_ALIASES[pin.branch] ? pin.branch : pin.area;
      let osmArea = `OSM says: ${String(rev).split("|").filter(Boolean).join(", ")}`;
      if (label && AREA_ALIASES[label] && rev && !String(rev).startsWith("ERR") && !areaMatches(label, rev)) {
        flags.push(`listed as ${label}, OSM puts the pin elsewhere`);
      }

      const k = key5(pin.lat, pin.lng);
      if (seen.has(k) && seen.get(k) !== r.id) flags.push(`same pin as ${seen.get(k)}`);
      else seen.set(k, r.id);

      results.push({ ...pin, name: r.name, osmName, osmArea, flags });
    }
  }

  const centres = Object.entries(AREA_COORDS).map(([area, [lat, lng]]) => {
    const rows = (Array.isArray(ans[`a:${area}`]) ? ans[`a:${area}`] : []).filter(([, , type]) =>
      /^(place|boundary)\//.test(type)
    );
    if (!rows.length) return { area, lat, lng, osm: null, d: null, flag: "no OSM place" };
    const [olat, olng, type, name] = rows[0];
    const d = distanceM({ lat, lng }, { lat: olat, lng: olng });
    return { area, lat, lng, osm: { name, type, lat: olat, lng: olng }, d, flag: d > CENTRE_NEAR ? "far" : "" };
  });
  return { results, centres };
}

function writeReport({ results, centres }) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, "location-osm-check.json"), JSON.stringify({ results, centres }, null, 2));
  const flagged = results.filter((r) => r.flags.length);
  const confirmed = results.filter((r) => r.osmName.startsWith("confirmed"));
  const lines = [
    "# Map pins vs OpenStreetMap",
    "",
    `Pins checked: ${results.length}. Confirmed by a same-name OSM place: ${confirmed.length}. Flagged: ${flagged.length}.`,
    "",
    "## Flagged pins",
    "",
    ...flagged.map((r) => `- **${r.id}${r.branch ? ` / ${r.branch}` : ""}** (${r.lat}, ${r.lng}): ${r.flags.join("; ")}. ${r.osmName}. ${r.osmArea}.`),
    "",
    "## Area centres (AREA_COORDS)",
    "",
    ...centres.filter((c) => c.flag).map((c) => `- **${c.area}** [${c.lat}, ${c.lng}]: ${c.flag}${c.osm ? `, OSM ${c.osm.name} at ${c.osm.lat.toFixed(4)}, ${c.osm.lng.toFixed(4)} (${c.d} m)` : ""}`),
    "",
    "## All pins",
    "",
    ...results.map((r) => `- ${r.id}${r.branch ? ` / ${r.branch}` : ""}: ${r.osmName}; ${r.osmArea}`),
  ];
  fs.writeFileSync(path.join(REPORT_DIR, "location-osm-check.md"), lines.join("\n") + "\n");
  console.log(lines.slice(0, 6 + flagged.length + 4 + centres.filter((c) => c.flag).length).join("\n"));
}

const saved = args.input ? JSON.parse(fs.readFileSync(path.resolve(args.input), "utf8")) : {};
const jobs = buildJobs();
const answers = args.offline ? saved : await fetchAll(jobs, saved);
if (args.save) fs.writeFileSync(path.resolve(args.save), JSON.stringify(answers));
writeReport(check(answers));
