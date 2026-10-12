// Downloads every badge logo URL into public/restaurants/logos/<id>.jpg
// Run: npm run fetch:logos (re-run anytime to refresh)
import fs from "node:fs";
import path from "node:path";
import { restaurants } from "../src/data/restaurants.js";

const OUT = new URL("../public/restaurants/logos/", import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

let ok = 0, fail = 0, skip = 0;
for (const r of restaurants) {
  if (!r.logo || r.logo.endsWith(".svg")) { skip++; continue; }
  try {
    const res = await fetch(r.logo);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) throw new Error("too small");
    fs.writeFileSync(path.join(OUT.pathname.replace(/^\//, ""), `${r.id}.jpg`), buf);
    console.log(`ok ${r.id} (${(buf.length / 1024).toFixed(0)}kb)`);
    ok++;
  } catch (e) {
    console.warn(`FAIL ${r.id}: ${e.message}`);
    fail++;
  }
}
console.log(`done ok=${ok} fail=${fail} skip=${skip}`);
