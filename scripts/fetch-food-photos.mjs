// Downloads researched real food photos (fallbackImage) into
// public/restaurants/<id>.jpg — SKIPS ids where you already uploaded a photo.
// Run: npm run fetch:photos (re-run anytime to refresh)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restaurants } from "../src/data/restaurants.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "public", "restaurants");
fs.mkdirSync(OUT, { recursive: true });

const localExts = ["jpg", "jpeg", "webp", "png"];
const hasUpload = (id) => localExts.some((e) => fs.existsSync(path.join(OUT, `${id}.${e}`)));

let ok = 0, fail = 0, skip = 0;
for (const r of restaurants) {
  if (hasUpload(r.id)) { skip++; continue; }
  const url = r.fallbackImage;
  if (!url || !url.startsWith("http")) { skip++; continue; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) throw new Error("too small");
    fs.writeFileSync(path.join(OUT, `${r.id}.jpg`), buf);
    console.log(`ok ${r.id} (${(buf.length / 1024).toFixed(0)}kb)`);
    ok++;
  } catch (e) {
    console.warn(`FAIL ${r.id}: ${e.message}`);
    fail++;
  }
}
console.log(`done ok=${ok} fail=${fail} skip=${skip}`);
