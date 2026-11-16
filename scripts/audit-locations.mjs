// Location audit for Foodfind.
//
// This script never edits restaurant data. It audits the stored location fields
// and, when a Google Places API (New) key is available, verifies each listing
// against the live API and writes a review report.
//
//   npm run locations:audit -- --only=al-haseer,white-house
//   npm run locations:audit -- --live --only=al-haseer --yes
//   npm run locations:audit -- --live --limit=5 --yes
//   npm run locations:audit -- --live --all --yes
//
// Environment:
//   GOOGLE_PLACES_API_KEY=...   (in .env.local or .env; never commit it)
//
// Output:
//   reports/location-audit.json
//   reports/location-audit.md
//   reports/location-audit.html
//
// The live mode uses Place Details (New) for stored Place IDs and Text Search
// (New) for branches without one. A search result is only ever a suggestion:
// it is marked "Needs review" until a human confirms it. Existing accurate data
// is never overwritten.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restaurants } from "../src/data/restaurants.js";
import { GOOGLE_PLACES } from "../src/data/google-places.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_BASE = path.join(REPORT_DIR, "location-audit");

const BAHRAIN = {
  low: { latitude: 25.5, longitude: 50.35 },
  high: { latitude: 26.35, longitude: 50.85 },
};

const DETAILS_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "googleMapsUri",
  "businessStatus",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "regularOpeningHours",
  "currentOpeningHours",
  "websiteUri",
  "addressComponents",
  "types",
  "primaryType",
].join(",");

const SEARCH_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.types",
  "places.primaryType",
].join(",");

// Approximate Places API (New) rates in USD per 1,000 requests. They are shown
// only to make an order-of-magnitude estimate; check the current Google price
// sheet before a large run.
const RATES = {
  details: 17 / 1000,
  textSearch: 32 / 1000,
};

const STOP_WORDS = new Set([
  "the", "and", "of", "restaurant", "restaurants", "grill", "grills", "cafe",
  "café", "kitchen", "food", "foods", "wll", "co", "company", "bahrain",
  "branch", "branches",
]);

// ---------------------------------------------------------------------------
// command line + environment
// ---------------------------------------------------------------------------

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  }
}

loadEnvFiles();

const argv = process.argv.slice(2);

function hasFlag(name) {
  return argv.includes(`--${name}`);
}

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--")) {
    return argv[index + 1];
  }
  return fallback;
}

const live = hasFlag("live");
const estimateOnly = hasFlag("estimate");
const confirmed = hasFlag("yes");
const discover = hasFlag("discover");
const writeReports = !hasFlag("no-write");
const only = argValue("only")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const limit = Number(argValue("limit", "0")) || 0;
const maxPages = Math.max(1, Math.min(5, Number(argValue("pages", "2")) || 2));
const language = argValue("lang", "en");
const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";
const generatedAt = new Date().toISOString();

// ---------------------------------------------------------------------------
// matching helpers
// ---------------------------------------------------------------------------

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_AREAS = new Set(["restaurant", "restaurants", "cafe", "café", "grill", "grills"]);

function isGenericArea(value) {
  return !normalize(value) || GENERIC_AREAS.has(normalize(value));
}

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function nameScore(left, right) {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  const precision = overlap / a.size;
  const recall = overlap / b.size;
  if (!overlap) return 0;
  return (2 * precision * recall) / (precision + recall);
}

function addressSimilar(left, right) {
  const a = normalize(left).replace(/\bbahrain\b/g, "").trim();
  const b = normalize(right).replace(/\bbahrain\b/g, "").trim();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  const overlap = [...ta].filter((token) => tb.has(token)).length;
  return overlap / Math.max(ta.size, tb.size) >= 0.6;
}

function phoneEqual(left, right) {
  const a = String(left || "").replace(/\D/g, "");
  const b = String(right || "").replace(/\D/g, "");
  if (!a || !b) return false;
  return a === b || a.slice(-8) === b.slice(-8);
}

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inBahrain(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= BAHRAIN.low.latitude &&
    lat <= BAHRAIN.high.latitude &&
    lng >= BAHRAIN.low.longitude &&
    lng <= BAHRAIN.high.longitude
  );
}

function isPlaceId(value) {
  return /^ChI[A-Za-z0-9_-]{10,}$/.test(String(value || ""));
}

function placeIdUrl(placeId) {
  return placeId
    ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`
    : "";
}

function coordinatesUrl(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : "";
}

function directionsUrl(lat, lng, placeId = "") {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const suffix = placeId ? `&destination_place_id=${encodeURIComponent(placeId)}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${suffix}`;
}

function weekdayLabels(hours) {
  if (!hours) return [];
  return Object.values(hours).filter(Boolean);
}

function googleHoursText(regularOpeningHours) {
  return Array.isArray(regularOpeningHours?.weekdayDescriptions)
    ? regularOpeningHours.weekdayDescriptions
    : [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMarkdown(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// ---------------------------------------------------------------------------
// build the audit rows from Foodfind's stored data
// ---------------------------------------------------------------------------

function branchRow(restaurant, branch) {
  const lat = Number(branch.lat);
  const lng = Number(branch.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const placeId = branch.placeId || "";
  const branchName = branch.name || branch.area || "Unnamed branch";
  const area = branch.area || branch.name || "";
  const matchArea = isGenericArea(area) ? branch.name || "" : area;
  return {
    key: `${restaurant.id}::${branchName}`,
    brandId: restaurant.id,
    brandName: restaurant.name,
    googleName: restaurant.googleName || "",
    nameVariants: searchNames(restaurant),
    branchName,
    source: "foodfind",
    placeId,
    hasPlaceId: Boolean(placeId),
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    hasCoords,
    coordSource: branch.coordSource || (hasCoords ? "researched" : "missing"),
    address: branch.address || "",
    area,
    matchArea,
    phone: branch.phone || "",
    hours: branch.hours || null,
    hoursText: weekdayLabels(branch.hours),
    storedVerification: branch.verification || null,
    status: "",
    statusLabel: "",
    branchConfirmed: false,
    notes: [],
    conflicts: [],
    live: null,
    suggested: null,
    candidates: [],
    discovered: [],
    lastChecked: branch.lastChecked || null,
    confidence: null,
  };
}

function brandRow(restaurant) {
  const lat = Number(restaurant.lat);
  const lng = Number(restaurant.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const placeId = restaurant.mapsPlaceId || restaurant.placeId || "";
  const area = restaurant.area || "";
  return {
    key: `${restaurant.id}::main`,
    brandId: restaurant.id,
    brandName: restaurant.name,
    googleName: restaurant.googleName || "",
    nameVariants: searchNames(restaurant),
    branchName: restaurant.area || "Main",
    source: "foodfind",
    placeId,
    hasPlaceId: Boolean(placeId),
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    hasCoords,
    coordSource: restaurant.coordSource || "unknown",
    address: restaurant.address || "",
    area,
    matchArea: isGenericArea(area) ? "" : area,
    phone: restaurant.phone || "",
    hours: restaurant.openingHours || null,
    hoursText: weekdayLabels(restaurant.openingHours),
    storedVerification: restaurant.verification || null,
    status: "",
    statusLabel: "",
    branchConfirmed: false,
    notes: [],
    conflicts: [],
    live: null,
    suggested: null,
    candidates: [],
    discovered: [],
    lastChecked: restaurant.verification?.lastChecked || null,
    confidence: null,
  };
}

function unassignedBrandRow(restaurant, existingPlaceIds) {
  const placeId = restaurant.mapsPlaceId || restaurant.placeId || "";
  if (!placeId || existingPlaceIds.has(placeId)) return null;
  const row = brandRow(restaurant);
  row.key = `${restaurant.id}::unassigned`;
  row.branchName = "Brand listing (unassigned)";
  row.notes.push(
    "The main Foodfind listing is not linked to a branch. Verify which branch it represents before using it."
  );
  return row;
}

function applyStoredVerification(row) {
  if (row.placeId && !isPlaceId(row.placeId)) {
    row.notes.push("Stored Place ID does not look like a Google Place ID.");
  }
  if (row.hasCoords && !inBahrain(row.lat, row.lng)) {
    row.notes.push("Stored coordinates fall outside Bahrain.");
  }
  if (row.coordSource === "area") {
    row.notes.push("Stored coordinates are only the area centre; they must not be used as the restaurant pin.");
  }
  if (row.area && ["restaurant", "restaurants", "cafe", "café", "grill"].includes(normalize(row.area))) {
    row.notes.push("Area field looks like a category rather than a neighbourhood.");
  }
  if (row.address && row.area && normalize(row.address) === normalize(row.area)) {
    row.notes.push("Address is area-only; a full Google-formatted address is still needed.");
  }
  if (row.hasPlaceId && !row.hasCoords) {
    row.notes.push("Place ID is stored, but coordinates are missing.");
  }
  if (!row.hasPlaceId && row.hasCoords) {
    row.notes.push("Coordinates are stored, but there is no Place ID to confirm the exact business.");
  }
  if (!row.hasPlaceId && !row.hasCoords) {
    row.notes.push("No Place ID or exact coordinates are stored.");
  }
  if (row.hasPlaceId && row.hasCoords) {
    row.notes.push("Stored Place ID and coordinates only; live Google Places verification has not run.");
  }

  const brand = GOOGLE_PLACES?.brands?.[row.brandId];
  const googleBranch = brand?.branches?.find(
    (branch) =>
      (row.placeId && branch.placeId === row.placeId) ||
      normalize(branch.branchName || branch.name) === normalize(row.branchName)
  );
  const googleBrandMatch = !googleBranch && brand?.placeId && brand.placeId === row.placeId;
  const record = googleBranch || (googleBrandMatch ? brand : null);
  if (record?.status === "verified" && record.lastChecked) {
    row.status = record.conflicts?.length ? "needs-review" : "verified";
    row.statusLabel = row.status === "verified" ? "Verified" : "Needs review";
    row.source = "google";
    row.lastChecked = record.lastChecked;
    row.confidence = record.match?.confidence ?? null;
    row.notes = row.notes.filter((note) => !note.includes("live Google Places verification has not run"));
    if (record.conflicts?.length) {
      row.conflicts = record.conflicts;
      row.notes.push("Google and Foodfind disagree; review the conflicts.");
    }
    row.branchConfirmed = row.status === "verified";
    return;
  }

  if (row.hasPlaceId && row.hasCoords && isPlaceId(row.placeId) && inBahrain(row.lat, row.lng)) {
    row.status = "needs-review";
    row.statusLabel = "Needs review";
  } else {
    row.status = "missing";
    row.statusLabel = "Missing";
  }
  row.branchConfirmed = false;
}

function buildRows(restaurant) {
  const locations = Array.isArray(restaurant.locations) ? restaurant.locations : [];
  const rows = [];

  if (locations.length) {
    for (const branch of locations) rows.push(branchRow(restaurant, branch));
    const existingPlaceIds = new Set(rows.map((row) => row.placeId).filter(Boolean));
    const unassigned = unassignedBrandRow(restaurant, existingPlaceIds);
    if (unassigned) rows.push(unassigned);
  } else {
    rows.push(brandRow(restaurant));
  }

  for (const row of rows) {
    row.listingUrl = placeIdUrl(row.placeId);
    row.coordsUrl = coordinatesUrl(row.lat, row.lng);
    row.directionsUrl = directionsUrl(row.lat, row.lng, row.placeId);
    applyStoredVerification(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// live Google Places (New) verification
// ---------------------------------------------------------------------------

async function googleFetch(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Goog-Api-Key": apiKey,
      ...(options?.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }
  return data;
}

async function fetchPlaceDetails(placeId) {
  return googleFetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(language)}&regionCode=BH`,
    { headers: { "X-Goog-FieldMask": DETAILS_MASK } }
  );
}

async function searchTextOnce(query, pageToken = "") {
  const body = {
    textQuery: query,
    languageCode: language,
    regionCode: "BH",
    pageSize: 10,
    locationRestriction: { rectangle: BAHRAIN },
  };
  if (pageToken) body.pageToken = pageToken;
  return googleFetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-FieldMask": SEARCH_MASK,
    },
    body: JSON.stringify(body),
  });
}

async function searchPlaces(query) {
  const places = [];
  const seen = new Set();
  let pageToken = "";
  let pages = 0;
  do {
    const data = await searchTextOnce(query, pageToken);
    for (const place of data.places || []) {
      if (!place.id || seen.has(place.id)) continue;
      seen.add(place.id);
      places.push(place);
    }
    pageToken = data.nextPageToken || "";
    pages += 1;
  } while (pageToken && pages < maxPages);
  return places;
}

function searchNames(restaurant) {
  const names = new Set();
  const add = (value) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text) names.add(text);
  };
  add(restaurant.name);
  add(restaurant.googleName);
  add(restaurant.arabicName);
  for (const alias of restaurant.aliases || []) add(alias);
  // Google listings often omit apostrophes, spaces or hyphens. Try both forms
  // without inventing a different brand name.
  for (const value of [...names]) {
    add(value.replace(/[’'`.-]/g, " "));
    add(value.replace(/[^\p{L}\p{N}]+/gu, ""));
  }
  return [...names].slice(0, 6);
}

function searchQueries(restaurant, row) {
  const names = searchNames(restaurant);
  const branch = row.branchName && !row.branchName.includes("unassigned") ? row.branchName : "";
  const area = row.matchArea && normalize(row.matchArea) !== normalize(branch) ? row.matchArea : "";
  const queries = [];
  for (const name of names) {
    const parts = [name, branch, area, "Bahrain"].filter(Boolean);
    queries.push(parts.join(" "));
  }
  return [...new Set(queries.map((query) => query.replace(/\s+/g, " ").trim()))]
    .filter(Boolean)
    .slice(0, 4);
}

function candidateScore(candidate, restaurant, row) {
  const name = candidate.displayName?.text || "";
  const brandScore = Math.max(
    ...searchNames(restaurant).map((candidateName) => nameScore(name, candidateName))
  );
  const branchScore =
    row.branchName && !row.branchName.includes("unassigned")
      ? nameScore(name, row.branchName)
      : 0;
  const address = candidate.formattedAddress || "";
  const addressMatch = row.matchArea
    ? addressSimilar(address, row.matchArea) || normalize(address).includes(normalize(row.matchArea))
    : false;
  const candidateLat = candidate.location?.latitude;
  const candidateLng = candidate.location?.longitude;
  const distance =
    row.hasCoords && Number.isFinite(candidateLat) && Number.isFinite(candidateLng)
      ? haversine(row.lat, row.lng, candidateLat, candidateLng)
      : null;
  const score =
    brandScore * 0.6 +
    branchScore * 0.15 +
    (addressMatch ? 0.15 : 0) +
    (distance !== null && distance <= 400 ? 0.1 : 0);
  return { brandScore, branchScore, addressMatch, distance, score };
}

function candidateSummary(candidate, score) {
  return {
    placeId: candidate.id || "",
    name: candidate.displayName?.text || "",
    address: candidate.formattedAddress || "",
    lat: candidate.location?.latitude ?? null,
    lng: candidate.location?.longitude ?? null,
    businessStatus: candidate.businessStatus || "",
    mapsUrl: candidate.googleMapsUri || placeIdUrl(candidate.id || ""),
    listingUrl: placeIdUrl(candidate.id || ""),
    coordsUrl: coordinatesUrl(
      candidate.location?.latitude,
      candidate.location?.longitude
    ),
    score: Number(score.score.toFixed(2)),
    brandScore: Number(score.brandScore.toFixed(2)),
    branchScore: Number(score.branchScore.toFixed(2)),
    addressMatch: score.addressMatch,
    distanceMeters:
      score.distance === null ? null : Math.round(score.distance),
  };
}

function applyLiveDetails(row, details, mode) {
  const name = details.displayName?.text || "";
  const address = details.formattedAddress || "";
  const lat = details.location?.latitude;
  const lng = details.location?.longitude;
  const phone = details.nationalPhoneNumber || details.internationalPhoneNumber || "";
  const mapsUrl = details.googleMapsUri || placeIdUrl(details.id || row.placeId);
  const hours = googleHoursText(details.regularOpeningHours);

  const brandNameScore = Math.max(
    ...(row.nameVariants?.length
      ? row.nameVariants
      : [row.brandName, row.googleName || ""]
    ).map((candidateName) => nameScore(name, candidateName))
  );
  const addressMatch = row.matchArea ? addressSimilar(address, row.matchArea) : false;
  const distance =
    row.hasCoords && Number.isFinite(lat) && Number.isFinite(lng)
      ? haversine(row.lat, row.lng, lat, lng)
      : null;
  const phoneMatch = phoneEqual(phone, row.phone);
  const branchLabel =
    row.branchName && !row.branchName.includes("unassigned") ? row.branchName : "";
  const branchMatch = !branchLabel
    ? true
    : nameScore(name, branchLabel) >= 0.5 ||
      (row.matchArea ? addressSimilar(address, row.matchArea) : false) ||
      normalize(`${name} ${address}`).includes(normalize(branchLabel)) ||
      (distance !== null && distance <= 300);

  const conflicts = [];
  if (brandNameScore < 0.35) {
    conflicts.push({
      field: "name",
      foodfind: row.brandName,
      google: name,
      note: "Live listing name does not match the Foodfind brand strongly.",
    });
  }
  if (row.address && !addressMatch && distance !== null && distance > 750) {
    conflicts.push({
      field: "address",
      foodfind: row.address,
      google: address,
      note: "Live listing address/area and stored coordinates do not line up.",
    });
  }
  if (distance !== null && distance > 750) {
    conflicts.push({
      field: "coordinates",
      foodfind: `${row.lat}, ${row.lng}`,
      google: `${lat}, ${lng}`,
      note: `Stored pin is ${Math.round(distance)} m from the live Google pin.`,
    });
  }
  if (row.phone && phone && !phoneMatch) {
    conflicts.push({
      field: "phone",
      foodfind: row.phone,
      google: phone,
      note: "Phone numbers differ; check before overwriting.",
    });
  }
  if (!branchMatch && (distance === null || distance > 500)) {
    conflicts.push({
      field: "branch",
      foodfind: branchLabel,
      google: `${name} — ${address}`,
      note: "Live listing may belong to a different branch. Confirm before using it.",
    });
  }

  let confidence = 0.35;
  if (brandNameScore >= 0.5) confidence += 0.35;
  else if (brandNameScore >= 0.3) confidence += 0.15;
  if (addressMatch) confidence += 0.15;
  if (distance !== null && distance <= 300) confidence += 0.1;
  if (branchMatch) confidence += 0.1;
  if (phoneMatch) confidence += 0.05;
  confidence = Math.min(1, Number(confidence.toFixed(2)));

  row.live = {
    placeId: details.id || row.placeId,
    name,
    address,
    lat: lat ?? null,
    lng: lng ?? null,
    phone,
    website: details.websiteUri || "",
    businessStatus: details.businessStatus || "",
    mapsUrl,
    listingUrl: placeIdUrl(details.id || row.placeId),
    coordsUrl: coordinatesUrl(lat, lng),
    directionsUrl: directionsUrl(lat, lng, details.id || row.placeId),
    hours,
    types: details.types || [],
    primaryType: details.primaryType || "",
    confidence,
    brandScore: Number(brandNameScore.toFixed(2)),
    addressMatch,
    branchMatch,
    distanceMeters: distance === null ? null : Math.round(distance),
    phoneMatch,
  };
  row.lastChecked = generatedAt;
  row.confidence = confidence;
  row.conflicts = conflicts;

  if (mode === "stored" && row.branchName.includes("unassigned")) {
    row.status = "needs-review";
    row.statusLabel = "Needs review";
    row.notes.push("Live listing is valid, but it is still not assigned to a branch.");
    row.branchConfirmed = false;
    return;
  }

  const majorConflict = conflicts.some(
    (conflict) =>
      conflict.field === "name" ||
      conflict.field === "coordinates" ||
      conflict.field === "branch"
  );
  if (confidence >= 0.7 && !majorConflict) {
    row.status = "verified";
    row.statusLabel = "Verified";
    row.branchConfirmed = true;
  } else {
    row.status = "needs-review";
    row.statusLabel = "Needs review";
    row.branchConfirmed = false;
    row.notes.push("Live Google data is available, but this match needs a human check.");
  }
}

async function verifyExistingPlace(row) {
  try {
    const details = await fetchPlaceDetails(row.placeId);
    applyLiveDetails(row, details, "stored");
    row.notes = row.notes.filter(
      (note) => !note.includes("live Google Places verification has not run")
    );
  } catch (error) {
    row.status = "needs-review";
    row.statusLabel = "Needs review";
    row.branchConfirmed = false;
    row.notes.push(`Place Details failed: ${error.message}`);
  }
}

async function searchForBranch(row, restaurant) {
  const queries = searchQueries(restaurant, row);
  row.searchQueries = queries;
  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    let places = [];
    try {
      places = await searchPlaces(query);
    } catch (error) {
      row.notes.push(`Text Search failed for "${query}": ${error.message}`);
      continue;
    }
    for (const place of places) {
      if (!place.id || seen.has(place.id)) continue;
      if (!inBahrain(place.location?.latitude, place.location?.longitude)) continue;
      seen.add(place.id);
      const score = candidateScore(place, restaurant, row);
      if (score.brandScore < 0.2 && !score.addressMatch && (score.distance === null || score.distance > 750)) {
        continue;
      }
      candidates.push(candidateSummary(place, score));
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  row.candidates = candidates.slice(0, 8);
  if (!row.candidates.length) {
    row.notes.push("Text Search found no plausible listing for this branch.");
    return;
  }

  const best = row.candidates[0];
  if (row.candidates.length === 1 || best.score >= 0.7) {
    row.suggested = best;
    try {
      const details = await fetchPlaceDetails(best.placeId);
      applyLiveDetails(row, details, "suggested");
      row.status = "needs-review";
      row.statusLabel = "Needs review";
      row.branchConfirmed = false;
      row.notes.push("Suggested from Text Search; confirm the listing before applying it.");
    } catch (error) {
      row.status = "needs-review";
      row.statusLabel = "Needs review";
      row.notes.push(`Suggested listing details failed: ${error.message}`);
    }
  } else {
    row.status = "needs-review";
    row.statusLabel = "Needs review";
    row.notes.push("Several possible listings were found; choose the correct one manually.");
  }
}

async function discoverBrandBranches(restaurant) {
  const names = searchNames(restaurant);
  const seen = new Set();
  const candidates = [];
  for (const name of names) {
    let places = [];
    try {
      places = await searchPlaces(`${name} Bahrain`);
    } catch (error) {
      return [{ error: `Text Search failed: ${error.message}` }];
    }
    for (const place of places) {
      if (!place.id || seen.has(place.id)) continue;
      if (!inBahrain(place.location?.latitude, place.location?.longitude)) continue;
      seen.add(place.id);
      const score = candidateScore(place, restaurant, {
        branchName: "",
        area: restaurant.area || "",
        hasCoords: false,
        lat: null,
        lng: null,
      });
      if (score.brandScore < 0.35 && !score.addressMatch) continue;
      candidates.push(candidateSummary(place, score));
    }
  }
  return candidates.sort((left, right) => right.score - left.score).slice(0, 12);
}

function estimateRequests(selected) {
  let details = 0;
  let searches = 0;
  for (const restaurant of selected) {
    const rows = buildRows(restaurant);
    for (const row of rows) {
      if (row.placeId) details += 1;
      else searches += searchQueries(restaurant, row).length;
    }
    if (discover) searches += Math.max(1, searchNames(restaurant).length);
  }
  return {
    details,
    searches,
    cost: details * RATES.details + searches * RATES.textSearch,
  };
}

async function runLiveAudit(selected) {
  const results = [];
  for (const restaurant of selected) {
    const rows = buildRows(restaurant);
    const output = [];
    for (const row of rows) {
      if (row.placeId) {
        await verifyExistingPlace(row);
      } else {
        await searchForBranch(row, restaurant);
      }
      output.push(row);
    }
    let discovered = [];
    if (discover) {
      discovered = await discoverBrandBranches(restaurant);
      for (const row of output) row.discovered = discovered;
    }
    results.push({ restaurant, rows: output });
  }
  return results;
}

function runStoredAudit(selected) {
  return selected.map((restaurant) => ({
    restaurant,
    rows: buildRows(restaurant),
  }));
}

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------

function summarise(results) {
  const rows = results.flatMap((result) => result.rows);
  return {
    brands: results.length,
    locations: rows.length,
    verified: rows.filter((row) => row.status === "verified").length,
    needsReview: rows.filter((row) => row.status === "needs-review").length,
    missing: rows.filter((row) => row.status === "missing").length,
    multiBrands: results.filter((result) => result.rows.length > 1).length,
    withPlaceId: rows.filter((row) => row.hasPlaceId).length,
    withCoords: rows.filter((row) => row.hasCoords).length,
    areaCentrePins: rows.filter((row) => row.coordSource === "area").length,
  };
}

function rowDisplayName(row) {
  return `${row.brandName} — ${row.branchName}`;
}

function consoleReport(results, summary, mode) {
  console.log("");
  console.log("FOODFIND LOCATION AUDIT");
  console.log("=======================");
  console.log(`Mode: ${mode}`);
  console.log(`Generated: ${generatedAt}`);
  console.log("");
  console.log(`Brands: ${summary.brands}`);
  console.log(`Locations: ${summary.locations}`);
  console.log(`Verified: ${summary.verified}`);
  console.log(`Needs review: ${summary.needsReview}`);
  console.log(`Missing: ${summary.missing}`);
  console.log(`Area-centre pins: ${summary.areaCentrePins}`);
  console.log("");

  for (const { rows } of results) {
    for (const row of rows) {
      console.log(`${rowDisplayName(row)}`);
      console.log(`  Status: ${row.statusLabel}`);
      console.log(`  Place ID: ${row.placeId || "Pending verification"}`);
      console.log(
        `  Coordinates: ${row.hasCoords ? `${row.lat}, ${row.lng}` : "Not yet verified"}`
      );
      console.log(`  Google Maps listing: ${row.live?.listingUrl || row.listingUrl || "Not yet matched"}`);
      if (row.live?.directionsUrl || row.directionsUrl) {
        console.log(`  Directions: ${row.live?.directionsUrl || row.directionsUrl}`);
      }
      if (row.suggested) {
        console.log(
          `  Suggested listing: ${row.suggested.name} · ${row.suggested.placeId} · ${row.suggested.listingUrl}`
        );
      }
      for (const note of row.notes) console.log(`  Note: ${note}`);
      for (const conflict of row.conflicts) {
        console.log(`  Conflict (${conflict.field}): ${conflict.foodfind} → ${conflict.google}`);
      }
      console.log("");
    }
  }
  if (!writeReports) {
    console.log("Reports were not written (--no-write).");
  } else {
    console.log(`Reports: ${path.relative(ROOT, REPORT_BASE)}.json`);
    console.log(`         ${path.relative(ROOT, REPORT_BASE)}.md`);
    console.log(`         ${path.relative(ROOT, REPORT_BASE)}.html`);
  }
}

function markdownReport(results, summary, mode) {
  const lines = [];
  lines.push("# Foodfind location audit");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push("");
  lines.push(`Mode: **${mode}**`);
  lines.push("");
  if (mode === "stored") {
    lines.push(
      "> Live Google Places verification has not run. The Place IDs and coordinates below are stored Foodfind data, shown for review. They are not marked verified."
    );
    lines.push("");
  }
  lines.push("## Summary");
  lines.push("");
  lines.push("| Check | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Brands checked | ${summary.brands} |`);
  lines.push(`| Locations audited | ${summary.locations} |`);
  lines.push(`| Verified | ${summary.verified} |`);
  lines.push(`| Needs review | ${summary.needsReview} |`);
  lines.push(`| Missing | ${summary.missing} |`);
  lines.push(`| Multi-location brands | ${summary.multiBrands} |`);
  lines.push(`| With a stored Place ID | ${summary.withPlaceId} |`);
  lines.push(`| With stored coordinates | ${summary.withCoords} |`);
  lines.push(`| Area-centre pins (must not be shown) | ${summary.areaCentrePins} |`);
  lines.push("");

  for (const { rows } of results) {
    for (const row of rows) {
      lines.push(`## ${rowDisplayName(row)}`);
      lines.push("");
      lines.push(`- **Status:** ${row.statusLabel}`);
      lines.push(
        `- **Google Place ID:** ${row.placeId ? `\`${row.placeId}\` (${row.live ? "live" : "stored"})` : "Pending verification"}`
      );
      lines.push(
        `- **Exact coordinates:** ${row.hasCoords ? `${row.coordsUrl ? `[${row.lat}, ${row.lng}](${row.coordsUrl})` : `\`${row.lat}, ${row.lng}\``} (${row.live ? "live" : "stored"})` : "Not yet verified"}`
      );
      lines.push(
        `- **Google Maps listing:** ${row.live?.listingUrl || row.listingUrl ? `[Open listing](${row.live?.listingUrl || row.listingUrl})` : "Not yet matched"}`
      );
      if (row.live?.directionsUrl || row.directionsUrl) {
        lines.push(`- **Directions:** [Open directions](${row.live?.directionsUrl || row.directionsUrl})`);
      }
      if (row.live) {
        lines.push(`- **Google name:** ${row.live.name || "—"}`);
        lines.push(`- **Google address:** ${row.live.address || "—"}`);
        lines.push(`- **Google phone:** ${row.live.phone || "—"}`);
        lines.push(`- **Business status:** ${row.live.businessStatus || "—"}`);
        lines.push(`- **Match confidence:** ${Math.round((row.confidence || 0) * 100)}%`);
      } else {
        lines.push(`- **Address:** ${row.address || "—"}`);
        lines.push(`- **Area:** ${row.area || "—"}`);
        lines.push(`- **Phone:** ${row.phone || "—"}`);
      }
      lines.push(`- **Branch confirmed:** ${row.branchConfirmed ? "Yes" : "No"}`);
      if (row.notes.length) {
        lines.push("- **Notes:**");
        for (const note of row.notes) lines.push(`  - ${note}`);
      }
      if (row.conflicts.length) {
        lines.push("- **Conflicts:**");
        for (const conflict of row.conflicts) {
          lines.push(
            `  - ${conflict.field}: Foodfind \`${escapeMarkdown(conflict.foodfind)}\` vs Google \`${escapeMarkdown(conflict.google)}\``
          );
        }
      }
      if (row.suggested) {
        lines.push(
          `- **Suggested listing:** [${row.suggested.name}](${row.suggested.listingUrl}) · \`${row.suggested.placeId}\` · score ${row.suggested.score}`
        );
      }
      if (row.candidates.length > 1) {
        lines.push("- **Possible listings:**");
        for (const candidate of row.candidates) {
          lines.push(
            `  - [${candidate.name || candidate.placeId}](${candidate.listingUrl}) · \`${candidate.placeId}\` · ${candidate.address || "address unavailable"} · score ${candidate.score}`
          );
        }
      }
      if (row.discovered?.length) {
        lines.push("- **Possible additional branches:**");
        for (const candidate of row.discovered) {
          lines.push(
            `  - [${candidate.name || candidate.placeId}](${candidate.listingUrl}) · \`${candidate.placeId}\` · ${candidate.address || "address unavailable"} · score ${candidate.score}`
          );
        }
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

function statusClass(status) {
  if (status === "verified") return "verified";
  if (status === "missing") return "missing";
  return "review";
}

function htmlReport(results, summary, mode) {
  const cards = results
    .flatMap((result) => result.rows)
    .map((row) => {
      const live = row.live;
      const placeId = row.placeId || live?.placeId || "";
      const lat = live?.lat ?? row.lat;
      const lng = live?.lng ?? row.lng;
      const listing = live?.listingUrl || row.listingUrl;
      const coords = live?.coordsUrl || row.coordsUrl;
      const directions = live?.directionsUrl || row.directionsUrl;
      const address = live?.address || row.address;
      const phone = live?.phone || row.phone;
      const hours = live?.hours?.length ? live.hours : row.hoursText;
      return `
        <article class="card" data-status="${escapeHtml(row.status)}">
          <div class="card-head">
            <div>
              <h2>${escapeHtml(row.brandName)} <span>— ${escapeHtml(row.branchName)}</span></h2>
              <p class="muted">${escapeHtml(row.area || "Area not stored")}</p>
            </div>
            <span class="badge ${statusClass(row.status)}">${escapeHtml(row.statusLabel)}</span>
          </div>
          <dl>
            <div>
              <dt>Google Place ID</dt>
              <dd class="mono">${placeId ? escapeHtml(placeId) : "Pending verification"}</dd>
            </div>
            <div>
              <dt>Exact coordinates</dt>
              <dd class="mono">${Number.isFinite(lat) && Number.isFinite(lng) ? (coords ? `<a href="${escapeHtml(coords)}" target="_blank" rel="noopener noreferrer">${escapeHtml(lat)}, ${escapeHtml(lng)}</a>` : `${escapeHtml(lat)}, ${escapeHtml(lng)}`) : "Not yet verified"}</dd>
            </div>
            <div>
              <dt>Google Maps listing</dt>
              <dd>${listing ? `<a href="${escapeHtml(listing)}" target="_blank" rel="noopener noreferrer">Open listing</a>` : "Not yet matched"}</dd>
            </div>
            <div>
              <dt>Directions</dt>
              <dd>${directions ? `<a href="${escapeHtml(directions)}" target="_blank" rel="noopener noreferrer">Open directions</a>` : "Not available"}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>${escapeHtml(address || "—")}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>${escapeHtml(phone || "—")}</dd>
            </div>
            <div>
              <dt>Branch confirmed</dt>
              <dd>${row.branchConfirmed ? "Yes" : "No"}</dd>
            </div>
            ${live ? `<div><dt>Match confidence</dt><dd>${Math.round((row.confidence || 0) * 100)}%</dd></div>` : ""}
          </dl>
          ${hours.length ? `<details><summary>Opening hours</summary><ul>${hours.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></details>` : ""}
          ${row.notes.length ? `<ul class="notes">${row.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
          ${row.conflicts.length ? `<div class="conflicts"><strong>Conflicts</strong><ul>${row.conflicts.map((conflict) => `<li><span>${escapeHtml(conflict.field)}</span> Foodfind: ${escapeHtml(conflict.foodfind)} · Google: ${escapeHtml(conflict.google)}</li>`).join("")}</ul></div>` : ""}
          ${row.suggested ? `<p class="suggested"><strong>Suggested listing:</strong> <a href="${escapeHtml(row.suggested.listingUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.suggested.name || row.suggested.placeId)}</a> · <span class="mono">${escapeHtml(row.suggested.placeId)}</span></p>` : ""}
          ${row.candidates.length > 1 ? `<details><summary>Possible listings (${row.candidates.length})</summary><ul>${row.candidates.map((candidate) => `<li><a href="${escapeHtml(candidate.listingUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(candidate.name || candidate.placeId)}</a> · <span class="mono">${escapeHtml(candidate.placeId)}</span> · ${escapeHtml(candidate.address || "address unavailable")} · score ${candidate.score}</li>`).join("")}</ul></details>` : ""}
          ${row.discovered?.length ? `<details><summary>Possible additional branches (${row.discovered.length})</summary><ul>${row.discovered.map((candidate) => `<li><a href="${escapeHtml(candidate.listingUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(candidate.name || candidate.placeId)}</a> · <span class="mono">${escapeHtml(candidate.placeId)}</span> · ${escapeHtml(candidate.address || "address unavailable")}</li>`).join("")}</ul></details>` : ""}
        </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foodfind — Location verification</title>
<style>
  :root { --green:#0b5d45; --deep:#083c2d; --gold:#c9963f; --cream:#faf8f2; --line:#e5e1d6; --ink:#1c2a24; --muted:#6d7a73; --review:#b26a1f; --missing:#a53a2d; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--cream); color:var(--ink); font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
  header { padding:34px 28px 22px; background:linear-gradient(135deg, #f3f7f1, #fbf7ee); border-bottom:1px solid var(--line); }
  header h1 { margin:0; color:var(--deep); font-size:clamp(24px,3vw,36px); letter-spacing:-.02em; }
  header p { margin:8px 0 0; color:var(--muted); max-width:900px; }
  .banner { margin-top:16px; padding:12px 16px; border:1px solid #eadcc4; border-radius:12px; background:#fff8ea; color:#7a541a; font-size:14px; }
  main { max-width:1280px; margin:0 auto; padding:24px 28px 60px; }
  .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-bottom:20px; }
  .stat { padding:14px 16px; border:1px solid var(--line); border-radius:14px; background:#fff; }
  .stat b { display:block; color:var(--deep); font-size:24px; line-height:1.2; }
  .stat span { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
  .filters { display:flex; gap:8px; flex-wrap:wrap; margin:0 0 20px; }
  .filters button { padding:8px 14px; border:1px solid var(--line); border-radius:999px; background:#fff; color:var(--deep); font-weight:650; cursor:pointer; }
  .filters button:hover { border-color:var(--green); }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:16px; }
  .card { border:1px solid var(--line); border-radius:16px; background:#fff; padding:18px; box-shadow:0 8px 24px rgba(8,60,45,.04); }
  .card-head { display:flex; gap:12px; align-items:flex-start; justify-content:space-between; }
  .card h2 { margin:0; color:var(--deep); font-size:17px; line-height:1.25; }
  .card h2 span { color:var(--muted); font-weight:500; }
  .muted { color:var(--muted); margin:4px 0 0; font-size:13px; }
  .badge { flex:0 0 auto; padding:5px 10px; border-radius:999px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; }
  .badge.verified { background:#e7f4ed; color:#146b4c; }
  .badge.review { background:#fdf0df; color:var(--review); }
  .badge.missing { background:#fbe8e4; color:var(--missing); }
  dl { display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; margin:16px 0 0; }
  dt { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.07em; }
  dd { margin:2px 0 0; overflow-wrap:anywhere; font-size:13px; }
  .mono { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:12px; }
  a { color:var(--green); text-decoration:none; font-weight:650; }
  a:hover { text-decoration:underline; }
  details { margin-top:14px; }
  summary { cursor:pointer; color:var(--deep); font-weight:650; font-size:13px; }
  ul { margin:8px 0 0; padding-left:18px; }
  li { margin:4px 0; font-size:13px; }
  .notes { color:var(--muted); }
  .conflicts { margin-top:14px; padding:10px 12px; border-radius:10px; background:#fff4f0; color:#80311f; font-size:13px; }
  .conflicts span { font-weight:700; }
  .suggested { margin:14px 0 0; padding:10px 12px; border-radius:10px; background:#f3f8f4; font-size:13px; }
  .footer { margin-top:28px; color:var(--muted); font-size:12px; }
  .hidden { display:none; }
  @media (max-width:560px) { dl { grid-template-columns:1fr; } }
</style>
</head>
<body>
<header>
  <h1>Restaurant location verification</h1>
  <p>Foodfind locations compared against their Google Maps listings. A location is only marked Verified after a live Google Places (New) check. Search results are suggestions, not automatic matches.</p>
  <div class="banner">
    ${mode === "stored"
      ? "Stored-data audit: live Google Places verification has not run. Add GOOGLE_PLACES_API_KEY to .env.local, then run npm run locations:audit -- --live --only=… --yes."
      : `Live Google Places audit run at ${escapeHtml(generatedAt)}. Existing Foodfind data has not been overwritten.`}
  </div>
</header>
<main>
  <div class="summary">
    <div class="stat"><b>${summary.brands}</b><span>Brands checked</span></div>
    <div class="stat"><b>${summary.locations}</b><span>Locations audited</span></div>
    <div class="stat"><b>${summary.verified}</b><span>Verified</span></div>
    <div class="stat"><b>${summary.needsReview}</b><span>Needs review</span></div>
    <div class="stat"><b>${summary.missing}</b><span>Missing</span></div>
    <div class="stat"><b>${summary.areaCentrePins}</b><span>Area-centre pins</span></div>
  </div>
  <div class="filters">
    <button type="button" data-filter="all">All</button>
    <button type="button" data-filter="verified">Verified</button>
    <button type="button" data-filter="needs-review">Needs review</button>
    <button type="button" data-filter="missing">Missing</button>
  </div>
  <div class="grid">${cards}</div>
  <p class="footer">${summary.multiBrands} multi-location brands · ${summary.withPlaceId} locations have a stored Place ID · ${summary.withCoords} have stored coordinates · ${summary.areaCentrePins} use only an area-centre pin. Generated by scripts/audit-locations.mjs.</p>
</main>
<script>
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.card')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      for (const card of cards) {
        card.classList.toggle('hidden', filter !== 'all' && card.dataset.status !== filter);
      }
    });
  }
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function selectRestaurants() {
  let selected = only.length
    ? restaurants.filter((restaurant) => only.includes(restaurant.id))
    : restaurants;
  if (limit > 0) selected = selected.slice(0, limit);
  if (only.length && selected.length !== only.length) {
    const found = new Set(selected.map((restaurant) => restaurant.id));
    const missing = only.filter((id) => !found.has(id));
    if (missing.length) {
      console.warn(`Unknown restaurant ids: ${missing.join(", ")}`);
    }
  }
  return selected;
}

async function main() {
  const selected = selectRestaurants();
  if (!selected.length) {
    console.error("No restaurants matched. Use --only=id1,id2 or --limit=5.");
    process.exit(1);
  }

  if (estimateOnly || (live && !confirmed)) {
    const estimate = estimateRequests(selected);
    console.log("Live Google Places audit - estimate only");
    console.log(`  Restaurants:            ${selected.length}`);
    console.log(`  Place Details requests: ${estimate.details}`);
    console.log(`  Text Search requests:   ${estimate.searches}`);
    console.log(`  Estimated API cost:     ~$${estimate.cost.toFixed(2)} USD (approximate)`);
    if (discover) console.log("  Includes brand-level branch discovery searches.");
    console.log("");
    console.log("No requests were sent. Rerun with --live --yes to execute.");
    return;
  }

  if (live && !apiKey) {
    console.error("Missing GOOGLE_PLACES_API_KEY.");
    console.error("Add it to .env.local (server-side only, never VITE_):");
    console.error("  GOOGLE_PLACES_API_KEY=your-key");
    console.error("Then rerun with --live --yes.");
    process.exit(1);
  }

  if (live && !only.length && !limit && !hasFlag("all")) {
    console.error("Refusing an accidental bulk run.");
    console.error("Use --only=id1,id2, --limit=5, or --all with --yes.");
    process.exit(1);
  }

  const results = live ? await runLiveAudit(selected) : runStoredAudit(selected);
  const summary = summarise(results);
  const mode = live ? "live" : "stored";

  consoleReport(results, summary, mode);

  if (writeReports) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const payload = {
      generatedAt,
      mode,
      live,
      apiKeyPresent: Boolean(apiKey),
      summary,
      results: results.map((result) => ({
        restaurant: {
          id: result.restaurant.id,
          name: result.restaurant.name,
          googleName: result.restaurant.googleName || "",
          area: result.restaurant.area || "",
        },
        rows: result.rows,
      })),
    };
    fs.writeFileSync(`${REPORT_BASE}.json`, `${JSON.stringify(payload, null, 2)}\n`);
    fs.writeFileSync(`${REPORT_BASE}.md`, `${markdownReport(results, summary, mode)}\n`);
    fs.writeFileSync(`${REPORT_BASE}.html`, htmlReport(results, summary, mode));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
