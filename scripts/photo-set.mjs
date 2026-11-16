#!/usr/bin/env node
/**
 * Manually approve or replace any restaurant's main storefront photo.
 *
 *   # use a photo you have (or an official URL) as the approved storefront
 *   npm run photos:set -- --id=aseeri-star --src="C:/photos/aseeri.jpg" --source="Official Instagram"
 *
 *   # approve the best landscape photo already in the gallery
 *   npm run photos:set -- --id=white-house --approve
 *
 *   # send a restaurant back to the replacement queue
 *   npm run photos:set -- --id=chicken-land-cafeteria --needs-replacement --note="Sign cut in source"
 *
 *   npm run photos:set -- --list
 *
 * The file is copied/downloaded into public/restaurants/storefront/<id>.<ext>,
 * its real pixel size is measured, and src/data/storefront-photos.js is
 * updated. Nothing else in the restaurant data changes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHOTO_RULES, STOREFRONT_PHOTOS } from "../src/data/storefront-photos.js";
import { storefrontCandidates, storefrontPhotoFor } from "../src/data/photo-display.js";
import { restaurants } from "../src/data/restaurants.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = path.join(ROOT, "src", "data", "storefront-photos.js");
const STORE_DIR = path.join(ROOT, "public", "restaurants", "storefront");

const flags = new Map();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (!token.startsWith("--")) continue;
  const [name, inline] = token.slice(2).split("=");
  if (inline !== undefined) flags.set(name, inline);
  else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
    flags.set(name, argv[i + 1]);
    i += 1;
  } else flags.set(name, true);
}

const id = String(flags.get("id") || "").trim();
const restaurant = restaurants.find((entry) => entry.id === id);

const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function readImageSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (chunk === "VP8 ") {
      return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(24) & 0x3fff];
    }
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let at = 2;
    while (at < buf.length - 9) {
      if (buf[at] !== 0xff) {
        at += 1;
        continue;
      }
      const marker = buf[at + 1];
      const size = buf.readUInt16BE(at + 2);
      if (size < 2) break;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return [buf.readUInt16BE(at + 7), buf.readUInt16BE(at + 5)];
      }
      at += 2 + size;
    }
  }
  return [0, 0];
}

function writeRegistry(next) {
  const source = fs.readFileSync(REGISTRY, "utf8");
  const start = source.indexOf("export const STOREFRONT_PHOTOS =");
  if (start === -1) throw new Error("STOREFRONT_PHOTOS block not found in the registry");
  const end = source.indexOf("\n};", start);
  if (end === -1) throw new Error("could not find the end of STOREFRONT_PHOTOS");
  const head = source.slice(0, start);
  const tail = source.slice(end + 3);
  const block = `export const STOREFRONT_PHOTOS = ${JSON.stringify(next, null, 2)};`;
  fs.writeFileSync(REGISTRY, `${head}${block}${tail}`, "utf8");
}

function printRestaurant() {
  const decision = storefrontPhotoFor(restaurant);
  const entry = STOREFRONT_PHOTOS[restaurant.id] || null;
  console.log(`${restaurant.name} (${restaurant.id})`);
  console.log(`  photo:  ${decision.photo?.src || "none"}`);
  if (decision.photo) {
    console.log(
      `  size:   ${decision.photo.width || "?"}x${decision.photo.height || "?"} Â· fit ${decision.fit}`
    );
  }
  console.log(`  status: ${entry?.status || "auto"}${decision.needsReplacement ? " (needs replacement)" : ""}`);
  if (decision.reasons.length) console.log(`  why:    ${decision.reasons.join(", ")}`);
  console.log(`  gallery: ${storefrontCandidates(restaurant).length} real photo(s)`);
}

if (flags.has("list")) {
  const rows = Object.entries(STOREFRONT_PHOTOS);
  console.log(`${rows.length} reviewed restaurant photo(s):`);
  for (const [key, entry] of rows) {
    console.log(
      `  ${key.padEnd(28)} ${String(entry.status || "auto").padEnd(18)} ${entry.src || "(best existing photo)"}${
        entry.focus ? `  focus ${entry.focus}` : ""
      }`
    );
  }
  process.exit(0);
}

if (!id) {
  console.log(`usage:
  npm run photos:set -- --id=<restaurant-id> --src=<file-or-url> [--source="Official Instagram"] [--credit="Name"] [--focus="center 32%"] [--note="..."]
  npm run photos:set -- --id=<restaurant-id> --approve [--focus="center 32%"]
  npm run photos:set -- --id=<restaurant-id> --needs-replacement [--note="..."]
  npm run photos:set -- --list`);
  process.exit(1);
}
if (!restaurant) {
  console.error(`unknown restaurant id: ${id}`);
  process.exit(1);
}

const current = STOREFRONT_PHOTOS[id] || {};
const next = { ...STOREFRONT_PHOTOS };

if (flags.has("approve")) {
  next[id] = {
    ...current,
    status: "approved",
    approvedAt: today(),
    focus: String(flags.get("focus") || current.focus || "center 32%"),
    note: String(flags.get("note") || current.note || "Approved by reviewer."),
  };
  writeRegistry(next);
  console.log(`approved ${id}`);
  printRestaurant();
} else if (flags.has("needs-replacement")) {
  next[id] = {
    ...current,
    status: "needs-replacement",
    note: String(flags.get("note") || current.note || "Marked for replacement by reviewer."),
  };
  writeRegistry(next);
  console.log(`marked ${id} as needs-replacement`);
  printRestaurant();
} else if (flags.has("src")) {
  const raw = String(flags.get("src"));
  fs.mkdirSync(STORE_DIR, { recursive: true });
  for (const name of fs.readdirSync(STORE_DIR)) {
    if (name.startsWith(`${id}-storefront.`)) fs.unlinkSync(path.join(STORE_DIR, name));
  }

  let buffer;
  let ext;
  if (/^https?:\/\//i.test(raw)) {
    console.log(`downloading ${raw}`);
    const response = await fetch(raw, {
      headers: { "User-Agent": "FoodFind photo review (local)" },
    });
    if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
    const fromUrl = path.extname(new URL(raw).pathname).toLowerCase();
    ext = [".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(fromUrl) ? fromUrl : ".jpg";
  } else {
    const file = path.resolve(raw);
    if (!fs.existsSync(file)) throw new Error(`file not found: ${file}`);
    buffer = fs.readFileSync(file);
    ext = path.extname(file).toLowerCase() || ".jpg";
  }
  if (buffer.length < 4000) throw new Error("file looks too small to be a real photo");

  const name = `${id}-storefront${ext === ".jpeg" ? ".jpg" : ext}`;
  const target = path.join(STORE_DIR, name);
  fs.writeFileSync(target, buffer);
  const [width, height] = readImageSize(target);
  if (!width || !height) {
    fs.unlinkSync(target);
    throw new Error("could not read the image dimensions; use a jpg, png or webp file");
  }

  const landscape = width / height >= PHOTO_RULES.minLandscapeRatio;
  const sharp = width >= PHOTO_RULES.minCardWidth;
  const approved = landscape && sharp;
  next[id] = {
    status: approved ? "approved" : "needs-replacement",
    src: `/restaurants/storefront/${name}`,
    width,
    height,
    source: String(flags.get("source") || "Manual review"),
    ...(flags.get("credit") ? { credit: String(flags.get("credit")) } : {}),
    ...(flags.get("focus") ? { focus: String(flags.get("focus")) } : {}),
    ...(approved ? { approvedAt: today() } : {}),
    note: String(
      flags.get("note") ||
        (approved
          ? "Landscape storefront with the sign and entrance in view."
          : `Imported ${width}x${height}; a sharper landscape storefront is still needed.`)
    ),
  };
  writeRegistry(next);
  console.log(`saved ${path.relative(ROOT, target)} (${width}x${height})`);
  console.log(
    approved
      ? `approved ${id}: landscape and sharp enough for the card`
      : `WARNING: ${id} is still ${landscape ? "too small" : "portrait"}; kept in the replacement queue`
  );
  printRestaurant();
} else {
  console.error("nothing to do: pass --src, --approve, --needs-replacement or --list");
  process.exit(1);
}
