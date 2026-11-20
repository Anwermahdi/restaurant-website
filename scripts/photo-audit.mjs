#!/usr/bin/env node
/**
 * Smart Restaurant Photo System - audit every restaurant's photos.
 *
 * For each of the 117 restaurants it:
 *   1. lists the existing photo gallery (menu scans and logos excluded),
 *   2. applies the same resolver the cards and details use,
 *   3. records the chosen storefront, its real pixel size, orientation and fit,
 *   4. says whether a replacement is needed and why,
 *   5. prints the Google Places / manual command that supplies one.
 *
 * Output:
 *   reports/photo-audit.md    human summary + per-restaurant rows
 *   reports/photo-audit.json  machine-readable (used by the review tooling)
 *   reports/photo-audit.html  thumbnail review page (dev server must be running)
 *
 *   npm run photos:audit
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restaurants } from "../src/data/restaurants.js";
import {
  frameForPhoto,
  isLandscapePhoto,
  isMenuPhotoSrc,
  photoRatio,
  photoSize,
  storefrontCandidates,
  storefrontPhotoFor,
} from "../src/data/photo-display.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "reports");
const ORIGIN = process.env.PHOTO_REPORT_ORIGIN || "http://localhost:5173";
fs.mkdirSync(OUT, { recursive: true });

const ratioText = (photo) => {
  const ratio = photoRatio(photo);
  return ratio ? `${ratio.toFixed(2)}:1` : "?";
};
const sizeText = (photo) => {
  const { width, height } = photoSize(photo);
  return width && height ? `${width}×${height}` : "unknown size";
};
const sourceLabel = (photo) =>
  photo?.source === "google" ? "Google Places" : photo?.source === "manual" ? "manual" : "Foodfind";

const rows = restaurants.map((restaurant) => {
  const decision = storefrontPhotoFor(restaurant);
  const candidates = storefrontCandidates(restaurant);
  const gallery = candidates.map((photo) => ({
    src: photo.src,
    width: photoSize(photo).width,
    height: photoSize(photo).height,
    ratio: Number(photoRatio(photo).toFixed(3)),
    landscape: isLandscapePhoto(photo),
    source: photo.source || "foodfind",
    menu: isMenuPhotoSrc(photo.src),
  }));
  const landscapeAlternatives = gallery.filter(
    (photo) => photo.landscape && photo.src !== decision.photo?.src
  );
  return {
    id: restaurant.id,
    name: restaurant.name,
    area: restaurant.area || "",
    googlePlaceId: restaurant.googlePlaceId || restaurant.mapsPlaceId || "",
    photo: decision.photo
      ? {
          src: decision.photo.src,
          width: photoSize(decision.photo).width,
          height: photoSize(decision.photo).height,
          ratio: Number(photoRatio(decision.photo).toFixed(3)),
          source: decision.photo.source || "foodfind",
          credits: decision.photo.credits || [],
        }
      : null,
    fit: decision.fit,
    focus: decision.focus,
    status: decision.status,
    needsReplacement: decision.needsReplacement,
    reasons: decision.reasons,
    review: decision.review,
    gallery,
    landscapeAlternatives: landscapeAlternatives.map((photo) => photo.src),
    recommendedFit: decision.photo ? frameForPhoto(decision.photo).fit : "contain",
  };
});

const total = rows.length;
const approved = rows.filter((row) => !row.needsReplacement).length;
const needs = rows.filter((row) => row.needsReplacement);
const portrait = needs.filter((row) => row.photo && row.photo.ratio < 1.18);
const small = needs.filter((row) => row.photo && row.photo.width > 0 && row.photo.width < 640);
const missing = needs.filter((row) => !row.photo);
const withLandscapeAlt = rows.filter((row) => row.landscapeAlternatives.length > 0);

const commandFor = (row) =>
  `npm run photos:set -- --id=${row.id} --src="<file-or-official-url>" --source="<source>"`;

const json = {
  generatedAt: new Date().toISOString(),
  total,
  approved,
  needsReplacement: needs.length,
  summary: {
    portrait: portrait.length,
    lowResolution: small.length,
    noPhoto: missing.length,
    hasLandscapeAlternative: withLandscapeAlt.length,
  },
  restaurants: rows,
};
fs.writeFileSync(path.join(OUT, "photo-audit.json"), `${JSON.stringify(json, null, 2)}\n`, "utf8");

// ---- Markdown ----
const md = [];
md.push("# Restaurant photo audit");
md.push("");
md.push(`Generated ${new Date().toLocaleString("en-GB")} · ${total} restaurants checked individually.`);
md.push("");
md.push("## Summary");
md.push("");
md.push("| Metric | Count |");
md.push("| --- | ---: |");
md.push(`| Restaurants checked | ${total} |`);
md.push(`| Storefront approved / good as is | ${approved} |`);
md.push(`| Need a replacement photo | ${needs.length} |`);
md.push(`| — portrait (no landscape on file) | ${portrait.length} |`);
md.push(`| — too small for a full-width card | ${small.length} |`);
md.push(`| — no usable photo at all | ${missing.length} |`);
md.push(`| — landscape already available in the gallery | ${withLandscapeAlt.length} |`);
md.push("");
md.push("**How the main photo is chosen:** a reviewer's approval in");
md.push("`src/data/storefront-photos.js` wins; otherwise the sharpest real landscape photo");
md.push("in the restaurant's own gallery is used. Menu scans and brand logos are never used.");
md.push("Landscape photos fill the card (bounded crop, sign kept in view); portrait photos are");
md.push("shown whole on the flat frame background until a real landscape storefront exists.");
md.push("");
md.push("### Photo commands");
md.push("");
md.push("```bash");
md.push("# Licensed Google Places photos (needs GOOGLE_PLACES_API_KEY in .env.local)");
md.push("npm run photos:google -- --only=<id>");
md.push("npm run photos:google:check");
md.push("");
md.push("# Apply an official / uploaded photo as the approved storefront");
md.push(commandFor({ id: "restaurant-id" }));
md.push("");
md.push("# Approve the best existing landscape photo");
md.push("npm run photos:set -- --id=restaurant-id --approve");
md.push("```");
md.push("");
md.push("## Restaurants that need a replacement");
md.push("");
md.push("| Restaurant | Area | Current photo | Why | Google Place ID |");
md.push("| --- | --- | --- | --- | --- |");
for (const row of needs) {
  md.push(
    `| **${row.name}** \`${row.id}\` | ${row.area || "—"} | ${
      row.photo ? `${sizeText(row.photo)} ${ratioText(row.photo)}` : "none"
    } | ${row.reasons.join("; ") || "reviewer marked"} | ${row.googlePlaceId || "—"} |`
  );
  md.push(`| | | | \`${commandFor(row)}\` | |`);
}
md.push("");
md.push("## All restaurants");
md.push("");
md.push("| Restaurant | Photo | Orientation | Fit | Status | Gallery photos | Landscape alt. |");
md.push("| --- | --- | --- | --- | --- | ---: | --- |");
for (const row of rows) {
  const orientation = !row.photo
    ? "none"
    : row.photo.ratio >= 1.18
      ? "landscape"
      : "portrait";
  md.push(
    `| ${row.name} \`${row.id}\` | ${row.photo ? `${sizeText(row.photo)}` : "—"} | ${orientation} | ${row.fit} | ${
      row.needsReplacement ? `needs replacement (${row.reasons.join(", ")})` : "ok"
    } | ${row.gallery.length} | ${row.landscapeAlternatives.length ? "yes" : "no"} |`
  );
}
fs.writeFileSync(path.join(OUT, "photo-audit.md"), `${md.join("\n")}\n`, "utf8");

// ---- HTML review page ----
const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const card = (row) => {
  const src = row.photo?.src ? `${ORIGIN}${row.photo.src}` : "";
  const other = row.landscapeAlternatives[0]
    ? `<img class="alt" src="${ORIGIN}${esc(row.landscapeAlternatives[0])}" alt="">`
    : "";
  return `<article class="r ${row.needsReplacement ? "needs" : "ok"}" data-status="${row.needsReplacement ? "needs" : "ok"}" data-search="${esc(
    `${row.name} ${row.id} ${row.area}`
  ).toLowerCase()}">
    <div class="shot ${row.fit}">
      ${src ? `<img src="${esc(src)}" alt="${esc(row.name)} storefront" loading="lazy">` : `<span class="none">No photo</span>`}
      ${other ? `<div class="alt-wrap"><span>Landscape in gallery</span>${other}</div>` : ""}
    </div>
    <div class="meta">
      <h2>${esc(row.name)}</h2>
      <p class="id">${esc(row.id)} · ${esc(row.area || "—")}</p>
      <p class="dim">${row.photo ? `${sizeText(row.photo)} · ${ratioText(row.photo)} · ${esc(sourceLabel(row.photo))}` : "no photo"}</p>
      <p class="fit">Frame fit: <strong>${esc(row.fit)}</strong>${row.focus ? ` · focus ${esc(row.focus)}` : ""}</p>
      ${
        row.needsReplacement
          ? `<p class="why">Needs replacement: ${esc(row.reasons.join(", ") || "reviewer marked")}</p>`
          : `<p class="why good">Approved storefront</p>`
      }
      <p class="cmd"><code>${esc(commandFor(row))}</code></p>
    </div>
  </article>`;
};

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Restaurant photo audit</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; background: #faf8f2; color: #1f2933; font: 15px/1.45 system-ui, sans-serif; }
  header { max-width: 1400px; margin: 0 auto 22px; }
  h1 { margin: 0 0 6px; font-size: 26px; color: #113f33; }
  .lede { margin: 0 0 18px; color: #4b5563; max-width: 78ch; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; }
  .stat { background: #fff; border: 1px solid #e5e0d5; border-radius: 12px; padding: 10px 14px; min-width: 150px; }
  .stat b { display: block; font-size: 22px; color: #07513d; }
  .tools { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0; }
  .tools input { flex: 1 1 260px; padding: 10px 12px; border: 1px solid #d8d2c5; border-radius: 10px; background: #fff; }
  .tools button { padding: 10px 14px; border: 1px solid #d8d2c5; border-radius: 10px; background: #fff; cursor: pointer; }
  .tools button.on { background: #07513d; border-color: #07513d; color: #fff; }
  .grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
  .r { background: #fff; border: 1px solid #e5e0d5; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
  .r.needs { border-color: #f0c9a8; }
  .shot { position: relative; aspect-ratio: 4 / 3; background: #efebe2; display: grid; place-items: center; overflow: hidden; }
  .shot.cover img { width: 100%; height: 100%; object-fit: cover; object-position: center 32%; }
  .shot.contain img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .none { color: #8a8578; }
  .alt-wrap { position: absolute; right: 8px; bottom: 8px; width: 34%; background: rgba(255,255,255,.92); border-radius: 8px; padding: 4px; font-size: 9px; color: #4b5563; }
  .alt-wrap img { width: 100%; height: 54px; object-fit: cover; border-radius: 4px; display: block; margin-top: 2px; }
  .meta { padding: 12px 14px 14px; }
  h2 { margin: 0; font-size: 17px; color: #113f33; }
  .id, .dim, .fit, .why { margin: 3px 0 0; font-size: 12px; color: #6b7280; }
  .why { color: #a24a12; font-weight: 600; }
  .why.good { color: #12633f; }
  .cmd { margin: 8px 0 0; font-size: 10px; color: #6b7280; overflow-wrap: anywhere; }
  code { font-family: ui-monospace, Consolas, monospace; }
  .hidden { display: none; }
</style></head>
<body>
<header>
  <h1>Restaurant photo audit</h1>
  <p class="lede">Every restaurant checked individually against its own gallery. Landscape photos fill the card; portraits stay whole until a real replacement is approved. Open this page from <code>${esc(ORIGIN)}</code> so the thumbnails load.</p>
  <div class="stats">
    <div class="stat"><b>${total}</b>restaurants checked</div>
    <div class="stat"><b>${approved}</b>good as is</div>
    <div class="stat"><b>${needs.length}</b>need a replacement</div>
    <div class="stat"><b>${portrait.length}</b>portrait only</div>
    <div class="stat"><b>${withLandscapeAlt.length}</b>landscape already in gallery</div>
  </div>
  <div class="tools">
    <input id="q" type="search" placeholder="Search restaurant, id or area…" aria-label="Search restaurants">
    <button type="button" data-filter="all" class="on">All</button>
    <button type="button" data-filter="needs">Needs replacement (${needs.length})</button>
    <button type="button" data-filter="ok">Good as is (${approved})</button>
  </div>
</header>
<main class="grid" id="grid">
${rows.map(card).join("\n")}
</main>
<script>
  const query = document.getElementById('q');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.r')];
  let filter = 'all';
  function apply() {
    const needle = query.value.trim().toLowerCase();
    for (const card of cards) {
      const okFilter = filter === 'all' || card.dataset.status === filter;
      const okQuery = !needle || card.dataset.search.includes(needle);
      card.classList.toggle('hidden', !(okFilter && okQuery));
    }
  }
  query.addEventListener('input', apply);
  for (const button of buttons) button.addEventListener('click', () => {
    filter = button.dataset.filter;
    buttons.forEach((other) => other.classList.toggle('on', other === button));
    apply();
  });
</script>
</body></html>`;
fs.writeFileSync(path.join(OUT, "photo-audit.html"), html, "utf8");

console.log(`photo audit: ${total} restaurants`);
console.log(`  good as is:          ${approved}`);
console.log(`  need replacement:    ${needs.length}`);
console.log(`    portrait only:     ${portrait.length}`);
console.log(`    too small:         ${small.length}`);
console.log(`    no photo:          ${missing.length}`);
console.log(`    landscape in gallery: ${withLandscapeAlt.length}`);
console.log(`wrote reports/photo-audit.md, .json, .html`);
