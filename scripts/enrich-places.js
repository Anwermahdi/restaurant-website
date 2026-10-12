// Usage:
//   GOOGLE_PLACES_API_KEY=AIza... npm run enrich:places
// Uses Google Places API (New) Text Search + Place Details to fill
// rating / reviews / address / hours / phone / photo for every restaurant.
// Output: src/data/places-overrides.json (merged at runtime via applyPlaceOverrides).
// Without a key the site keeps curated estimates — nothing breaks.

import fs from "node:fs";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
const DATA_FILE = new URL("../src/data/restaurants.js", import.meta.url);
const OUT_FILE = new URL("../src/data/places-overrides.json", import.meta.url);

if (!API_KEY) {
  console.error("Missing GOOGLE_PLACES_API_KEY. Get one at https://developers.google.com/maps/documentation/places/web-service/get-api-key");
  process.exit(1);
}

// Parse ids + names from restaurants.js without importing TSX-bound modules.
const src = fs.readFileSync(DATA_FILE, "utf8");
const entries = Array.from(src.matchAll(/mk\("([^"]+)",\s*"([^"]+)"/g)).map((m) => ({ id: m[1], name: m[2] }));
console.log(`Found ${entries.length} restaurants.`);

const overrides = {};
for (const { id, name } of entries) {
  try {
    // 1. Text search
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.internationalPhoneNumber,places.regularOpeningHours,places.photos" },
      body: JSON.stringify({ textQuery: `${name}, Bahrain`, maxResultCount: 1 }),
    });
    if (!searchRes.ok) { console.warn(`search failed ${id}: ${searchRes.status}`); continue; }
    const searchJson = await searchRes.json();
    const p = searchJson.places?.[0];
    if (!p) { console.warn(`no place found: ${id} (${name})`); continue; }

    const o = { placeId: p.id };
    if (p.rating) o.rating = p.rating;
    if (p.userRatingCount) o.reviews = p.userRatingCount;
    if (p.formattedAddress) o.address = p.formattedAddress.replace(/, Bahrain$/, "");
    if (p.internationalPhoneNumber) o.phone = p.internationalPhoneNumber;
    if (p.regularOpeningHours?.weekdayDescriptions) o.hours = p.regularOpeningHours.weekdayDescriptions.join(" • ");
    const photo = p.photos?.[0]?.name;
    if (photo) o.image = `https://places.googleapis.com/v1/${photo}/media?maxWidthPx=800&key=${API_KEY}`;
    overrides[id] = o;
    console.log(`ok ${id}: rating=${o.rating ?? "-"} reviews=${o.reviews ?? "-"}`);
    await new Promise((r) => setTimeout(r, 200)); // be nice to quota
  } catch (e) {
    console.warn(`error ${id}: ${e.message}`);
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(overrides, null, 2));
console.log(`Wrote ${Object.keys(overrides).length}/${entries.length} overrides to src/data/places-overrides.json`);
