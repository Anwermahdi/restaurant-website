#!/usr/bin/env node
/**
 * Google Places API (New) + Place Photos API -> local, attributed photo cache.
 *
 * Why a build-time script instead of a runtime fetch?
 *   A Vite site cannot hold an API key in the browser. This script is the only
 *   place that ever sees GOOGLE_PLACES_API_KEY; the generated JSON contains no
 *   key, and the app only ever reads the downloaded files.
 *
 * What it does, per restaurant:
 *   1. Tries the curated Google Place ID (mapsPlaceId), then a branch Place ID.
 *   2. Verifies the name/address/coordinates instead of trusting the first hit.
 *   3. Falls back to Places Text Search and keeps a result only when it is a
 *      strong name + location match.
 *   4. Downloads a few Place Photos to public/restaurants/google/<id>/.
 *   5. Writes credit (author name + Google Maps profile) for every photo.
 *
 * Usage:
 *   npm run photos:google                  fetch/refresh the 30-day cache
 *   npm run photos:google -- --limit=6     more photos per restaurant
 *   npm run photos:google -- --only=al-haseer,white-house
 *   npm run photos:plan                    show Place ID coverage, no API calls
 *   npm run photos:check                   validate cache files + credits
 *
 * Key setup (never commit it):
 *   .env.local -> GOOGLE_PLACES_API_KEY=...
 *   Enable "Places API (New)" in Google Cloud and set a billing limit.
 *
 * Google does not label photos as "storefront" or "food". The script uses
 * Google's relevance order and recommends a landscape photo from the first
 * few; use `npm run photos:select -- <id>` to choose the real primary.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { restaurants } from "../src/data/restaurants.js";
import { GOOGLE_PHOTOS } from "../src/data/google-photos.js";
import { PHOTO_SELECTION } from "../src/data/photo-selection.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const PHOTO_ROOT = path.join(PUBLIC_DIR, "restaurants", "google");
const MANIFEST_FILE = path.join(ROOT, "src", "data", "google-photos.js");
const API_ROOT = "https://places.googleapis.com/v1";
const DEFAULT_MAX_AGE_DAYS = 30;

// ---------------------------------------------------------------------------
// Arguments + environment
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (!token.startsWith("--")) continue;
  const [name, inline] = token.slice(2).split("=");
  if (inline !== undefined) flags.set(name, inline);
  else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
    flags.set(name, argv[i + 1]);
    i += 1;
  } else {
    flags.set(name, true);
  }
}

function numberFlag(name, fallback) {
  const value = Number(flags.get(name));
  return Number.isFinite(value) && flags.has(name) ? value : fallback;
}

const onlyIds = new Set(
  String(flags.get("only") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
const force = flags.has("force");
const limit = Math.max(1, Math.min(10, Math.round(numberFlag("limit", 4))));
const maxWidth = Math.max(400, Math.min(2400, Math.round(numberFlag("max-width", 1600))));
const maxHeight = Math.max(400, Math.min(2400, Math.round(numberFlag("max-height", 1600))));
const maxAgeDays = Math.max(1, Math.round(numberFlag("max-age-days", DEFAULT_MAX_AGE_DAYS)));

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    if (process.env[match[1]]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function publicFile(src) {
  if (!src || src.startsWith("data:") || src.startsWith("http")) return "";
  const relative = src.replace(/^\//, "");
  const file = path.join(PUBLIC_DIR, relative);
  return fs.existsSync(file) ? file : "";
}

function hashFile(file) {
  try {
    return sha256(fs.readFileSync(file));
  } catch {
    return "";
  }
}

function formatBytes(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const STOP_WORDS = new Set([
  "the", "and", "restaurant", "restaurants", "rest", "resto", "cafe", "cafeteria",
  "coffee", "grill", "grills", "kitchen", "company", "wll", "bahrain", "food",
  "مطعم", "مطاعم", "كافيه", "مقهى", "البحرين", "مطعم",
]);

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function nameTokens(value) {
  return new Set(
    normalizeName(value)
      .split(" ")
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

function tokenScore(left, right) {
  const a = nameTokens(left);
  const b = nameTokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.min(a.size, b.size);
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** How well a Google place matches the curated restaurant record. */
function matchScore(restaurant, place) {
  const names = [restaurant.name, restaurant.googleName].filter(Boolean);
  const candidateName = place.displayName?.text || "";
  const nameScore = names.reduce((best, name) => Math.max(best, tokenScore(name, candidateName)), 0);

  const lat = Number(place.location?.latitude);
  const lng = Number(place.location?.longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const hasRestaurantPoint = Number.isFinite(Number(restaurant.lat)) && Number.isFinite(Number(restaurant.lng));
  const distance = hasPoint && hasRestaurantPoint
    ? distanceMeters(Number(restaurant.lat), Number(restaurant.lng), lat, lng)
    : null;

  const area = normalizeName(restaurant.area || restaurant.shortAddress || "");
  const address = normalizeName(place.formattedAddress || "");
  const areaHit = Boolean(area) && area
    .split(" ")
    .filter((token) => token.length > 2)
    .some((token) => address.includes(token));

  return { nameScore, distance, areaHit };
}

function isConfident(score) {
  if (score.nameScore >= 0.6) return true;
  if (score.nameScore >= 0.45 && score.areaHit) return true;
  if (score.distance !== null && score.distance < 150 && score.nameScore >= 0.25) return true;
  return false;
}

function matchDetails(place, score, source, confidence) {
  return {
    status: "ok",
    source,
    confidence,
    name: place.displayName?.text || "",
    address: place.formattedAddress || "",
    nameScore: Math.round(score.nameScore * 100) / 100,
    distanceMeters: score.distance === null ? null : Math.round(score.distance),
  };
}

function creditsFor(photo) {
  const list = Array.isArray(photo.authorAttributions) ? photo.authorAttributions : [];
  const credits = list
    .map((author) => ({
      name: author.displayName || "Google Maps",
      url: author.uri || "",
    }))
    .filter((credit) => credit.name);
  if (!credits.length) credits.push({ name: "Google Maps", url: "https://maps.google.com/" });
  return credits.filter(
    (credit, index, all) =>
      all.findIndex((other) => other.name === credit.name && other.url === credit.url) === index
  );
}

/** Width/height from JPEG, PNG or WebP headers, with no image dependency. */
function imageSize(buffer) {
  if (!buffer || buffer.length < 24) return null;

  if (buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return {
        width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
        height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
      };
    }
    if (chunk === "VP8 ") {
      const start = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
      if (start > 0) {
        return {
          width: buffer.readUInt16LE(start + 3) & 0x3fff,
          height: buffer.readUInt16LE(start + 5) & 0x3fff,
        };
      }
    }
    if (chunk === "VP8L") {
      const bits = buffer.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (offset + 4 > buffer.length) break;
      const length = buffer.readUInt16BE(offset + 2);
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  return null;
}

function extensionFor(contentType) {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

// ---------------------------------------------------------------------------
// Google Places API (New)
// ---------------------------------------------------------------------------

async function apiRequest(url, { method = "GET", headers = {}, body } = {}, key) {
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: { ...headers, "X-Goog-Api-Key": key },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) return response;

      const text = (await response.text()).slice(0, 400);
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 700 * 2 ** attempt);
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${text}`);
    } catch (error) {
      lastError = error;
      if (attempt < 3 && error.name !== "AbortError") {
        await sleep(700 * 2 ** attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("Request failed");
}

async function fetchPlaceDetails(placeId, key) {
  const fields = "id,displayName,formattedAddress,location,photos";
  const response = await apiRequest(
    `${API_ROOT}/places/${encodeURIComponent(placeId)}`,
    { headers: { "X-Goog-FieldMask": fields } },
    key
  );
  return response.json();
}

async function searchPlaces(restaurant, key) {
  const query = [restaurant.name, restaurant.googleName, restaurant.area, "Bahrain"]
    .filter(Boolean)
    .join(" ");
  const body = {
    textQuery: query,
    includedRegionCodes: ["bh"],
    maxResultCount: 5,
  };
  if (Number.isFinite(Number(restaurant.lat)) && Number.isFinite(Number(restaurant.lng))) {
    body.locationBias = {
      circle: {
        center: { latitude: Number(restaurant.lat), longitude: Number(restaurant.lng) },
        radius: 3000,
      },
    };
  }
  const response = await apiRequest(
    `${API_ROOT}/places:searchText`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.photos",
      },
      body: JSON.stringify(body),
    },
    key
  );
  const data = await response.json();
  return Array.isArray(data.places) ? data.places : [];
}

async function resolvePlace(restaurant, key) {
  const candidates = [];
  const curated = String(restaurant.mapsPlaceId || "").trim();
  if (curated) candidates.push({ id: curated, source: "curated" });
  for (const location of restaurant.locations || []) {
    if (location.placeId && location.placeId !== curated) {
      candidates.push({ id: location.placeId, source: "branch" });
      break;
    }
  }

  for (const candidate of candidates) {
    try {
      const place = await fetchPlaceDetails(candidate.id, key);
      const score = matchScore(restaurant, place);
      const confident = isConfident(score);
      const distanceOnly = !confident && score.distance !== null && score.distance <= 800;
      if (confident || distanceOnly) {
        return {
          place,
          match: matchDetails(place, score, candidate.source, confident ? "name" : "distance"),
        };
      }
    } catch (error) {
      console.warn(`  ! ${candidate.source} Place ID failed: ${error.message}`);
    }
  }

  const results = await searchPlaces(restaurant, key);
  const ranked = results
    .map((place) => ({ place, score: matchScore(restaurant, place) }))
    .filter(({ score }) => isConfident(score) && score.nameScore >= 0.5)
    .sort((left, right) => {
      const rank = (entry) => {
        const distanceBonus =
          entry.score.distance === null ? 0 : Math.max(0, 1 - entry.score.distance / 2500) * 0.2;
        return entry.score.nameScore + distanceBonus + (entry.score.areaHit ? 0.1 : 0);
      };
      return rank(right) - rank(left);
    });

  if (!ranked.length) {
    return {
      place: null,
      match: {
        status: "needs-review",
        source: "search",
        reason: "No confident name + location match",
        candidates: results.slice(0, 3).map((place) => ({
          id: place.id,
          name: place.displayName?.text || "",
          address: place.formattedAddress || "",
        })),
      },
    };
  }

  const best = ranked[0];
  return { place: best.place, match: matchDetails(best.place, best.score, "search", "search") };
}

async function downloadPhotoMedia(photo, key) {
  const resource = photo.name.split("/").map(encodeURIComponent).join("/");
  const url = `${API_ROOT}/${resource}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&skipHttpRedirect=true`;
  const response = await apiRequest(url, {}, key);
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (!data.photoUri) throw new Error("no photoUri returned");
    const imageResponse = await fetch(data.photoUri, { signal: AbortSignal.timeout(30000) });
    if (!imageResponse.ok) throw new Error(`photo download HTTP ${imageResponse.status}`);
    const imageType = (imageResponse.headers.get("content-type") || "").toLowerCase();
    if (!imageType.startsWith("image/")) throw new Error(`not an image (${imageType})`);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    if (buffer.length < 5000) throw new Error("image too small");
    if (buffer.length > 12 * 1024 * 1024) throw new Error("image too large");
    return { buffer, contentType: imageType };
  }

  if (!contentType.startsWith("image/")) throw new Error(`unexpected content type (${contentType})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 5000) throw new Error("image too small");
  return { buffer, contentType };
}

async function downloadPhotos(restaurant, place, key, blockedHashes, existingHash) {
  const available = Array.isArray(place.photos) ? place.photos : [];
  const candidates = available
    .filter((photo) => photo.name && Number(photo.widthPx) >= 500 && Number(photo.heightPx) >= 350)
    .slice(0, Math.max(limit * 3, limit));

  const photos = [];
  const seenNames = new Set();
  let attempted = 0;
  let failed = 0;

  for (const photo of candidates) {
    if (photos.length >= limit) break;
    if (seenNames.has(photo.name)) continue;
    seenNames.add(photo.name);
    attempted += 1;

    try {
      const media = await downloadPhotoMedia(photo, key);
      const hash = sha256(media.buffer);
      if (hash === existingHash) {
        console.log("    · skipped a Google photo that duplicates the Foodfind photo");
        continue;
      }
      if (blockedHashes.has(hash)) {
        console.log("    · skipped a duplicate Google photo");
        continue;
      }

      const dimensions = imageSize(media.buffer) || {
        width: Number(photo.widthPx) || 0,
        height: Number(photo.heightPx) || 0,
      };
      if (!dimensions.width || !dimensions.height) throw new Error("could not read image dimensions");
      if (Math.max(dimensions.width, dimensions.height) < 500) throw new Error("image is too small");

      const dir = path.join(PHOTO_ROOT, restaurant.id);
      fs.mkdirSync(dir, { recursive: true });
      const filename = `${photos.length + 1}-${hash.slice(0, 8)}${extensionFor(media.contentType)}`;
      const file = path.join(dir, filename);
      fs.writeFileSync(file, media.buffer);
      blockedHashes.add(hash);

      photos.push({
        src: `/restaurants/google/${restaurant.id}/${filename}`,
        width: dimensions.width,
        height: dimensions.height,
        bytes: media.buffer.length,
        sha256: hash,
        credits: creditsFor(photo),
      });
      await sleep(180);
    } catch (error) {
      failed += 1;
      console.warn(`    ! photo skipped: ${error.message}`);
    }
  }

  return { photos, attempted, failed, available: available.length };
}

function recommendPrimary(photos) {
  const firstFew = photos.slice(0, 3);
  // Storefront photos are usually landscape. Google does not label them, so
  // this only picks the recommended candidate; manual selection is final.
  const landscape = firstFew.find(
    (photo) => photo.width && photo.height && photo.width >= photo.height * 1.15
  );
  return landscape ? photos.indexOf(landscape) : 0;
}

function existingPhotoInfo(restaurant) {
  const src = restaurant.foodfindImage || restaurant.image || "";
  const file = publicFile(src);
  if (!file) return { suitable: false, hash: "", src };
  const width = Number(restaurant.foodfindImageWidth) || 0;
  const height = Number(restaurant.foodfindImageHeight) || 0;
  const suitable = !width && !height ? true : Math.max(width, height) >= 480;
  return { suitable, hash: hashFile(file), src };
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

function isFresh(entry) {
  if (!entry || entry.match?.status !== "ok" || !entry.fetchedAt) return false;
  const age = Date.now() - Date.parse(entry.fetchedAt);
  if (!Number.isFinite(age) || age > maxAgeDays * 86400000) return false;
  return (entry.photos || []).every((photo) => {
    const file = publicFile(photo.src);
    return Boolean(file);
  });
}

function cleanupOldPhotos(restaurantId, photos) {
  const dir = path.join(PHOTO_ROOT, restaurantId);
  if (!fs.existsSync(dir)) return;
  const keep = new Set(photos.map((photo) => path.basename(photo.src)));
  for (const name of fs.readdirSync(dir)) {
    if (!keep.has(name)) {
      try {
        fs.unlinkSync(path.join(dir, name));
      } catch {
        // Not fatal; a stale file is harmless.
      }
    }
  }
}

function writeManifest(manifest) {
  const header = [
    "// GENERATED by scripts/fetch-google-photos.mjs - do not edit by hand.",
    "// Google Places API (New) photo cache, including the attribution that",
    "// must be shown with every photo. Refresh with: npm run photos:google",
    `// Cached at: ${manifest.generatedAt}`,
    `// Refresh interval: ${manifest.maxAgeDays} days`,
    "export const GOOGLE_PHOTOS = ",
  ].join("\n");
  fs.writeFileSync(MANIFEST_FILE, `${header}${JSON.stringify(manifest, null, 2)};\n`, "utf8");
}

function plan() {
  const curated = restaurants.filter((restaurant) => String(restaurant.mapsPlaceId || "").trim());
  const branches = restaurants.filter(
    (restaurant) =>
      !String(restaurant.mapsPlaceId || "").trim() &&
      (restaurant.locations || []).some((location) => location.placeId)
  );
  const missing = restaurants.filter(
    (restaurant) =>
      !String(restaurant.mapsPlaceId || "").trim() &&
      !(restaurant.locations || []).some((location) => location.placeId)
  );
  const cached = Object.keys(GOOGLE_PHOTOS.restaurants || {}).length;
  const photoCount = Object.values(GOOGLE_PHOTOS.restaurants || {}).reduce(
    (total, entry) => total + (entry.photos?.length || 0),
    0
  );

  console.log(`Restaurants: ${restaurants.length}`);
  console.log(`  curated Google Place ID: ${curated.length}`);
  console.log(`  branch Place ID only:    ${branches.length}`);
  console.log(`  need Text Search:        ${missing.length}`);
  console.log(`Cached Google photos: ${photoCount} across ${cached} restaurants`);
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.log("");
    console.log("No key found. Add this to .env.local (never commit it):");
    console.log("  GOOGLE_PLACES_API_KEY=your-key");
  }
  if (missing.length) {
    console.log("");
    console.log("Need a search: " + missing.slice(0, 12).map((restaurant) => restaurant.id).join(", ") +
      (missing.length > 12 ? `, +${missing.length - 12} more` : ""));
  }
}

function check() {
  const entries = GOOGLE_PHOTOS.restaurants || {};
  const ids = Object.keys(entries);
  const globalHashes = new Map();
  let photos = 0;
  let missingFiles = 0;
  let missingCredits = 0;
  let stale = 0;
  let duplicateHashes = 0;
  let badSelections = 0;
  const maxAge = Number(GOOGLE_PHOTOS.maxAgeDays) || DEFAULT_MAX_AGE_DAYS;

  for (const [id, entry] of Object.entries(entries)) {
    if (!entry) continue;
    if (entry.fetchedAt) {
      const age = Date.now() - Date.parse(entry.fetchedAt);
      if (!Number.isFinite(age) || age > maxAge * 86400000) {
        stale += 1;
        console.log(`STALE ${id} (older than ${maxAge} days)`);
      }
    }
    if (entry.match?.status !== "ok") {
      console.log(`UNVERIFIED ${id}: ${entry.match?.status || "missing match"}`);
    }
    for (const photo of entry.photos || []) {
      photos += 1;
      if (!photo.src || !publicFile(photo.src)) {
        missingFiles += 1;
        console.log(`MISSING FILE ${id}: ${photo.src}`);
      }
      if (!Array.isArray(photo.credits) || !photo.credits.length) {
        missingCredits += 1;
        console.log(`NO CREDIT ${id}: ${photo.src}`);
      }
      if (photo.sha256) {
        if (globalHashes.has(photo.sha256) && globalHashes.get(photo.sha256) !== id) {
          duplicateHashes += 1;
          console.log(`DUPLICATE ${id} and ${globalHashes.get(photo.sha256)}`);
        } else {
          globalHashes.set(photo.sha256, id);
        }
      }
    }

    const choice = PHOTO_SELECTION[id];
    if (choice !== undefined) {
      const match = /^google:(\d+)$/.exec(choice);
      if (choice !== "existing" && !match) {
        badSelections += 1;
        console.log(`BAD SELECTION ${id}: ${choice}`);
      } else if (match && !entry.photos?.[Number(match[1])]) {
        badSelections += 1;
        console.log(`BAD SELECTION ${id}: ${choice} (no such Google photo)`);
      }
    }
  }

  console.log("");
  console.log(`Cached restaurants: ${ids.length} / ${restaurants.length}`);
  console.log(`Photos: ${photos}`);
  console.log(`Missing files: ${missingFiles}`);
  console.log(`Missing credits: ${missingCredits}`);
  console.log(`Stale entries: ${stale}`);
  console.log(`Duplicate photos: ${duplicateHashes}`);
  console.log(`Invalid primary-photo choices: ${badSelections}`);
  if (!ids.length) {
    console.log("");
    console.log("No Google photos cached yet. Run: npm run photos:google");
  }
  if (missingFiles || missingCredits || badSelections) process.exitCode = 1;
}

async function fetchAll(key) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    maxAgeDays,
    attribution: "Photos from Google Maps",
    restaurants: { ...(GOOGLE_PHOTOS.restaurants || {}) },
  };

  const targets = restaurants.filter((restaurant) => !onlyIds.size || onlyIds.has(restaurant.id));
  if (!targets.length) {
    console.error(`No restaurants matched --only=${[...onlyIds].join(",")}`);
    process.exitCode = 1;
    return;
  }

  // Hashes of every cached photo, used to avoid showing the same image twice.
  const blockedHashes = new Set();
  for (const [id, entry] of Object.entries(manifest.restaurants)) {
    if (onlyIds.size && onlyIds.has(id)) continue;
    for (const photo of entry.photos || []) if (photo.sha256) blockedHashes.add(photo.sha256);
  }
  // Also protect against a Google photo that is the same file as another
  // restaurant's Foodfind photo.
  const foodfindHashes = new Map();
  for (const restaurant of restaurants) {
    const file = publicFile(restaurant.foodfindImage || restaurant.image);
    if (!file) continue;
    const hash = hashFile(file);
    if (hash) foodfindHashes.set(restaurant.id, hash);
  }

  let ok = 0;
  let cached = 0;
  let review = 0;
  let errors = 0;
  let downloaded = 0;
  let bytes = 0;
  const started = Date.now();

  for (let index = 0; index < targets.length; index += 1) {
    const restaurant = targets[index];
    const label = `${String(index + 1).padStart(3, " ")}/${targets.length}`;
    const previous = manifest.restaurants[restaurant.id];
    const forceThis = force || onlyIds.has(restaurant.id);

    if (!forceThis && isFresh(previous)) {
      cached += 1;
      console.log(`[${label}] ${restaurant.id} - fresh cache`);
      continue;
    }

    const existing = existingPhotoInfo(restaurant);
    // A restaurant's own Foodfind hash is checked separately; other photos
    // must not be reused for a different restaurant.
    const otherHashes = new Set(blockedHashes);
    for (const [id, hash] of foodfindHashes) {
      if (id !== restaurant.id) otherHashes.add(hash);
    }

    try {
      const { place, match } = await resolvePlace(restaurant, key);
      if (!place || match.status !== "ok") {
        review += 1;
        console.log(`[${label}] ${restaurant.id} - needs review (${match.reason || "no match"})`);
        for (const candidate of match.candidates || []) {
          console.log(`        ? ${candidate.id} | ${candidate.name} | ${candidate.address}`);
        }
        // Keep an older verified cache rather than deleting real photos.
        if (previous) {
          manifest.restaurants[restaurant.id] = {
            ...previous,
            match: { ...match, previousPlaceId: previous.placeId || "" },
            lastError: "Could not re-verify the Place ID; showing the previous cache.",
          };
        } else {
          manifest.restaurants[restaurant.id] = {
            placeId: "",
            match,
            fetchedAt: new Date().toISOString(),
            primary: 0,
            useAsPrimary: false,
            photos: [],
          };
        }
        await sleep(220);
        continue;
      }

      const { photos, attempted, failed, available } = await downloadPhotos(
        restaurant,
        place,
        key,
        otherHashes,
        existing.hash
      );

      if (attempted > 0 && photos.length === 0 && previous?.photos?.length) {
        // Downloads failed or all were duplicates: keep the known-good cache.
        manifest.restaurants[restaurant.id] = {
          ...previous,
          placeId: place.id,
          match,
          lastError: failed ? "Every photo download failed; keeping the previous cache." : "All photos were duplicates; keeping the previous cache.",
        };
        errors += 1;
        console.log(`[${label}] ${restaurant.id} - kept previous photos (${failed} failed of ${attempted})`);
        await sleep(220);
        continue;
      }

      const primary = recommendPrimary(photos);
      manifest.restaurants[restaurant.id] = {
        placeId: place.id,
        match,
        fetchedAt: new Date().toISOString(),
        primary,
        useAsPrimary: !existing.suitable && photos.length > 0,
        photos,
      };
      cleanupOldPhotos(restaurant.id, photos);
      ok += 1;
      downloaded += photos.length;
      bytes += photos.reduce((total, photo) => total + (photo.bytes || 0), 0);
      console.log(
        `[${label}] ${restaurant.id} - ${match.source}, ${photos.length} photo${photos.length === 1 ? "" : "s"}` +
          ` (Google had ${available}${failed ? `, ${failed} failed` : ""})${existing.suitable ? "" : " · Google becomes primary"}`
      );
    } catch (error) {
      errors += 1;
      console.warn(`[${label}] ${restaurant.id} - ERROR ${error.message}`);
      if (previous) {
        manifest.restaurants[restaurant.id] = { ...previous, lastError: error.message };
      }
    }
    await sleep(220);
  }

  writeManifest(manifest);
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log("");
  console.log(
    `Done in ${seconds}s: ${ok} fetched, ${cached} fresh, ${review} need review, ${errors} errors.`
  );
  console.log(`New photos: ${downloaded} (${formatBytes(bytes)})`);
  console.log("Run npm run photos:check to verify files and credits.");
}

function printHelp() {
  console.log(`Google Places photos for Foodfind

  npm run photos:google                 fetch/refresh photos (30-day cache)
    --limit=4                           photos per restaurant (1-10)
    --max-width=1600                    requested photo width
    --max-height=1600                   requested photo height
    --max-age-days=30                   skip entries younger than this
    --only=id,id                        only these restaurants
    --force                             ignore the cache age
  npm run photos:plan                   coverage report, no API calls
  npm run photos:check                  validate files, credits, selections
  npm run photos:select -- <id>         choose the primary photo

Key: GOOGLE_PLACES_API_KEY in .env.local (server-side only).
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (flags.has("help") || flags.has("h")) {
  printHelp();
} else if (flags.has("check")) {
  check();
} else if (flags.has("plan") || flags.has("dry-run")) {
  plan();
} else {
  const key = String(process.env.GOOGLE_PLACES_API_KEY || "").trim();
  if (!key) {
    console.error("Missing GOOGLE_PLACES_API_KEY.");
    console.error("");
    console.error("1. Enable the Places API (New) in Google Cloud.");
    console.error("2. Put the key in .env.local (it is gitignored):");
    console.error("     GOOGLE_PLACES_API_KEY=your-key");
    console.error("3. Run: npm run photos:google");
    console.error("");
    console.error("Use npm run photos:plan to inspect coverage without a key.");
    process.exit(1);
  }
  await fetchAll(key);
}
