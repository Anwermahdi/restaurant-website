import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { restaurants, cuisines, mapsUrl, instagramUrl } from "../src/data/restaurants.js";
import { STORIES } from "../src/data/stories.js";
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const restaurantsDir = path.join(publicDir, "restaurants");
const problems = [];
const ids = new Set();
const norm = (v) =>
  String(v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Duplication guard: two records for one place, or one file doing two jobs.
const names = new Map();
const images = new Map();
const logos = new Map();
const menuUrls = new Map();
for (const r of restaurants) {
  if (ids.has(r.id)) problems.push(`dup id ${r.id}`);
  ids.add(r.id);
  if (!r.name || !r.image || !r.menu?.length) problems.push(`bad fields ${r.id}`);

  const nameKey = norm(r.name);
  if (names.has(nameKey)) problems.push(`dup name "${r.name}": ${names.get(nameKey)} + ${r.id}`);
  else names.set(nameKey, r.id);

  if (images.has(r.image)) problems.push(`dup card image ${r.image}: ${images.get(r.image)} + ${r.id}`);
  else images.set(r.image, r.id);

  if (logos.has(r.logoUpload)) problems.push(`dup icon ${r.logoUpload}: ${logos.get(r.logoUpload)} + ${r.id}`);
  else logos.set(r.logoUpload, r.id);

  if (r.menuUrl) {
    if (menuUrls.has(r.menuUrl)) problems.push(`dup menu url ${r.menuUrl}: ${menuUrls.get(r.menuUrl)} + ${r.id}`);
    else menuUrls.set(r.menuUrl, r.id);
  }

  // Every local file a record points at has to exist.
  for (const [label, url] of [["image", r.image], ["logo", r.logoUpload], ...(r.imageFallbacks || []).map((u, i) => [`fallback${i}`, u])]) {
    if (typeof url !== "string" || url.startsWith("data:") || url.startsWith("http")) continue;
    if (!fs.existsSync(path.join(restaurantsDir, url.replace(/^\/restaurants\//, "")))) {
      problems.push(`missing ${label} file ${r.id}: ${url}`);
    }
  }
  if (r.rating !== null && (r.rating < 0 || r.rating > 5)) problems.push(`bad rating ${r.id}: ${r.rating}`);
  if (typeof r.reviews === "number" && r.reviews < 0) problems.push(`bad reviews ${r.id}: ${r.reviews}`);

  for (const photo of r.menuPhotos || []) {
    const relativePath = photo.split(/[?#]/)[0].replace(/^\/+/, "");
    if (!fs.existsSync(path.join(publicDir, relativePath))) {
      problems.push(`missing menu photo ${r.id}: ${photo}`);
    }
  }
  if ((r.menuPhotoDimensions?.length || 0) !== (r.menuPhotos?.length || 0)) {
    problems.push(`menu photo dimensions count ${r.id}: ${r.menuPhotoDimensions?.length || 0}/${r.menuPhotos?.length || 0}`);
  }
  for (const [width, height] of r.menuPhotoDimensions || []) {
    if (!(width > 0 && height > 0)) problems.push(`bad menu photo dimensions ${r.id}: ${width}x${height}`);
  }
  if (r.menuUrl && !r.menuUrl.startsWith("https://")) {
    // A site-hosted menu file is fine as long as it exists in public/.
    const localMenu = r.menuUrl.startsWith("/") && fs.existsSync(path.join(publicDir, r.menuUrl.replace(/^\/+/, "").split(/[?#]/)[0]));
    if (!localMenu) problems.push(`bad menu URL ${r.id}: ${r.menuUrl}`);
  }
  if (r.website && !/^https?:\/\//.test(r.website)) problems.push(`bad website ${r.id}: ${r.website}`);
  const ig = instagramUrl(r);
  if (!ig.startsWith("https://www.instagram.com/")) problems.push(`bad ig ${r.id}: ${ig}`);
  const maps = mapsUrl(r);
  if (!maps.startsWith("https://www.google.com/maps/search")) problems.push(`bad maps ${r.id}`);
}

// Identical bytes under two names means one file is doing two jobs.
const ALLOWED_SAME_FILE = new Set([
  // Pizzaro has no storefront photo yet, so its card shows menu page 1. Delete
  // this line the moment a real storefront lands in public/restaurants.
  "pizzaro.png = media/pizzaro/menu-01.png",
  // Double Smash supplied one brand image; it is used as both card and badge
  // until separate food photography arrives.
  "double-smash.png = logos/double-smash.png",
  // FYR has no separate logo file yet; the storefront photo doubles as badge.
  "fyr.jpg = logos/fyr.jpg",
  // Same for Soul and Canteena until brand marks arrive.
  "soul.jpg = logos/soul.jpg",
  "canteena.jpg = logos/canteena.jpg",
]);
const byHash = new Map();
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(fp); continue; }
    if (!/\.(png|jpe?g|webp)$/i.test(entry.name)) continue;
    const buf = fs.readFileSync(fp);
    const key = `${buf.length}:${crypto.createHash("md5").update(buf).digest("hex")}`;
    const name = path.relative(restaurantsDir, fp).replace(/\\/g, "/");
    if (byHash.has(key)) {
      const pair = `${byHash.get(key)} = ${name}`;
      if (!ALLOWED_SAME_FILE.has(pair) && !ALLOWED_SAME_FILE.has(`${name} = ${byHash.get(key)}`)) {
        problems.push(`duplicate file content: ${pair}`);
      }
    } else byHash.set(key, name);
  }
};
walk(restaurantsDir);

// Story highlights must point at a real restaurant and a real file.
for (const [id, frames] of Object.entries(STORIES)) {
  if (!ids.has(id)) problems.push(`story for unknown restaurant: ${id}`);
  for (const frame of frames) {
    const file = String(frame.src).replace(/^\/restaurants\//, "");
    if (!fs.existsSync(path.join(restaurantsDir, file))) problems.push(`missing story frame ${id}: ${frame.src}`);
  }
}

console.log(`restaurants: ${restaurants.length}`);
console.log(`cuisines: ${cuisines.join(", ")}`);
console.log(problems.length ? problems.join("\n") : "ALL CHECKS PASSED");
