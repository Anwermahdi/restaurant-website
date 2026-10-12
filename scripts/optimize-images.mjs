// Converts the heavy PNG/JPG assets to WebP using headless Edge's canvas (no sharp
// available in this project), and writes a manifest with the real pixel dimensions
// so the app can reserve the correct box and stop the 800x500 layout shift.
//
// Originals are never touched: the WebP sits next to them and the app falls back
// to the original if the browser cannot decode WebP.
//
//   node scripts/optimize-images.mjs           # skip files already converted
//   node scripts/optimize-images.mjs --force   # re-convert everything
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public", "restaurants");
const CONVERTER = path.join(ROOT, "public", "__imgconv.html");
const MANIFEST = path.join(ROOT, "src", "data", "image-manifest.js");
const DIMS_CACHE = path.join(ROOT, "research", "image-dims.json");
const ORIGIN = "http://127.0.0.1:5173";
const FORCE = process.argv.includes("--force");

// Menu pages are text-heavy: keep them near-lossless. Card photos can go lower.
const MENU_QUALITY = 0.9;
const CARD_QUALITY = 0.85;

function collect() {
  const jobs = [];
  // One job per output path: a restaurant can have both <id>.jpg and <id>.png,
  // and both convert to the same <id>.webp. The .jpg wins (it is the path the
  // app requests first) so the manifest stays deterministic. A .webp source is
  // already the target format, so it is used as-is.
  const seen = new Map();
  const prefer = { ".jpg": 0, ".jpeg": 1, ".png": 2, ".webp": 3 };
  for (const name of fs.readdirSync(PUB)) {
    const fp = path.join(PUB, name);
    if (!fs.statSync(fp).isFile()) continue;
    const ext = path.extname(name).toLowerCase();
    if (!/[.](png|jpe?g|webp)$/i.test(ext)) continue;
    const out = name.replace(/\.(png|jpe?g)$/i, ".webp");
    const prior = seen.get(out);
    if (prior && prefer[ext] >= prior.rank) continue;
    seen.set(out, { src: name, out, quality: CARD_QUALITY, kind: "card", id: name.replace(/\.(png|jpe?g|webp)$/i, ""), rank: prefer[ext] });
  }
  for (const job of seen.values()) jobs.push(job);

  const mediaDir = path.join(PUB, "media");
  if (fs.existsSync(mediaDir)) {
    const seenMenu = new Map();
    for (const id of fs.readdirSync(mediaDir)) {
      const dir = path.join(mediaDir, id);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const name of fs.readdirSync(dir)) {
        const ext = path.extname(name).toLowerCase();
        if (!/[.](png|jpe?g|webp)$/i.test(ext)) continue;
        const rel = `media/${id}/${name}`;
        const out = rel.replace(/\.(png|jpe?g)$/i, ".webp");
        const prior = seenMenu.get(out);
        if (prior && prefer[ext] >= prior.rank) continue;
        seenMenu.set(out, { src: rel, out, quality: MENU_QUALITY, kind: "menu", id, name, rank: prefer[ext] });
      }
    }
    jobs.push(...seenMenu.values());
  }
  return jobs.sort((a, b) => a.src.localeCompare(b.src));
}

// A lot of the supplied assets are already WebP bytes behind a .jpg name, so
// sniff the content instead of trusting the extension.
function sniff(file) {
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 16, 0);
  fs.closeSync(fd);
  if (head.length >= 8 && head.readUInt32BE(0) === 0x89504e47) return "png";
  if (head.length >= 2 && head[0] === 0xff && head[1] === 0xd8) return "jpeg";
  if (head.length >= 12 && head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "other";
}

// Dimensions straight from the file headers, so the manifest can be rebuilt
// without running the browser at all.
function readImageSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    }
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
      if (buf[at] !== 0xff) { at += 1; continue; }
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

const converterHtml = `<!doctype html><meta charset="utf-8"><title>converter</title>
<script>
function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    const timer = setTimeout(() => rej(new Error("timeout " + url)), 20000);
    img.onload = () => { clearTimeout(timer); res(img); };
    img.onerror = () => { clearTimeout(timer); rej(new Error("load failed " + url)); };
    img.src = url;
  });
}
// One file per call keeps each CDP round trip short; a single evaluate that
// walks 50 huge PNGs at once is what stalled the first version.
window.convertOne = async (job) => {
  try {
    const img = await loadImage("/restaurants/" + job.src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", job.quality));
    if (!blob) return { src: job.src, error: "encode failed" };
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
    }
    return { src: job.src, width: img.naturalWidth, height: img.naturalHeight, bytes: buf.length, base64: btoa(bin) };
  } catch (error) {
    return { src: job.src, error: error.message };
  }
};
</script>`;

async function main() {
  const all = collect();
  // Already-WebP bytes are not re-encoded: the "twin" is the file itself.
  const todo = all.filter((j) => sniff(path.join(PUB, j.src)) !== "webp");
  const jobs = todo.filter((j) => {
    const outPath = path.join(PUB, j.out);
    if (FORCE) return true;
    if (!fs.existsSync(outPath)) return true;
    return fs.statSync(outPath).mtimeMs < fs.statSync(path.join(PUB, j.src)).mtimeMs;
  });
  console.log(`assets: ${all.length} | already webp: ${all.length - todo.length} | to convert: ${jobs.length}`);
  if (!jobs.length) return finish(all, 0, 0);

  fs.writeFileSync(CONVERTER, converterHtml);
  const PORT = 9380;
  const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    "--user-data-dir=C:/Users/Anwer/AppData/Local/Temp/opencode/edge-imgconv",
    "--window-size=1200,900", "about:blank",
  ], { stdio: "ignore", detached: true });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(500);
  }
  if (!wsUrl) throw new Error("could not reach Edge");

  const socket = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  await new Promise((r) => socket.addEventListener("open", r));
  const send = (method, params = {}) => new Promise((res) => { id += 1; pending.set(id, res); socket.send(JSON.stringify({ id, method, params })); });
  const ev = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, timeout: 600000 });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description?.split("\n")[0]);
    return r.result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: `${ORIGIN}/__imgconv.html` });
  await sleep(1800);
  const ready = await ev("typeof window.convertOne === 'function'");
  if (!ready) throw new Error("converter page not ready (is the dev server running on 5173?)");

  console.log("converting via Edge canvas, one file per round trip...");
  const t0 = Date.now();
  const results = [];
  for (const job of jobs) {
    const r = await Promise.race([
      ev(`window.convertOne(${JSON.stringify({ src: job.src, quality: job.quality })})`),
      sleep(60000).then(() => ({ src: job.src, error: "timed out" })),
    ]);
    results.push(r);
    process.stdout.write(r.error ? `x` : ".");
  }
  console.log(`\nconverted ${results.filter((r) => !r.error).length}/${results.length} files in ${Math.round((Date.now() - t0) / 1000)}s`);

  const byJob = new Map(jobs.map((j) => [j.src, j]));
  let before = 0;
  let after = 0;
  const dims = {};
  for (const r of results) {
    const job = byJob.get(r.src);
    if (!job) continue;
    if (r.error) { console.log(`  ! ${r.src}: ${r.error}`); continue; }
    const outPath = path.join(PUB, job.out);
    fs.writeFileSync(outPath, Buffer.from(r.base64, "base64"));
    const srcSize = fs.statSync(path.join(PUB, job.src)).size;
    before += srcSize;
    after += fs.statSync(outPath).size;
    dims[job.src] = [r.width, r.height];
    const pct = Math.round((1 - fs.statSync(outPath).size / srcSize) * 100);
    console.log(`  ${job.src} -> ${job.out}  ${(srcSize / 1024).toFixed(0)}KB -> ${(fs.statSync(outPath).size / 1024).toFixed(0)}KB (-${pct}%)  ${r.width}x${r.height}`);
  }
  socket.close();
  try { process.kill(-edge.pid); } catch { /* ignore */ }
  try { edge.kill(); } catch { /* ignore */ }
  try { fs.unlinkSync(CONVERTER); } catch { /* ignore */ }
  console.log(`\ntotal: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
  finish(all, before, after, dims);
}

// Manifest: the file the browser should request, every original kept as an
// onError fallback, and the real size so the layout does not shift.
function finish(all, before, after, dims = {}) {
  const card = {};
  const menu = {};
  const cleaned = [];
  // Sizes measured by the browser's own decoder win: header parsing gets
  // lossless WebP (VP8L) wrong, and a wrong size reserves a box that never fits.
  const measured = fs.existsSync(DIMS_CACHE) ? JSON.parse(fs.readFileSync(DIMS_CACHE, "utf8")) : {};
  const sizeOf = (url, fallbackFile) => {
    const cached = measured[url];
    if (cached && cached[0] && cached[1]) return cached;
    const inline = dims[url.replace(/^\/restaurants\//, "")];
    if (inline) return inline;
    return readImageSize(fallbackFile);
  };
  // Group by the output path so a card never inherits its menu pages.
  const families = new Map();
  for (const job of all) {
    const key = job.kind === "card" ? `card:${job.id}` : `menu:${job.id}/${path.basename(job.out, ".webp")}`;
    (families.get(key) || families.set(key, []).get(key)).push(job);
  }
  for (const [key, family] of families) {
    const kind = key.startsWith("card:") ? "card" : "menu";
    const id = kind === "card" ? key.slice(5) : key.slice(5).split("/")[0];
    const main = family.find((j) => j === family[0]) || family[0];
    const webpPath = path.join(PUB, main.out);
    const originalPath = path.join(PUB, main.src);
    const alreadyWebp = sniff(originalPath) === "webp";
    const webp = alreadyWebp ? `/restaurants/${main.src}` : `/restaurants/${main.out}`;
    const fallbacks = [`/restaurants/${main.src}`, ...family.filter((j) => j !== main).map((j) => `/restaurants/${j.src}`)];
    const [width, height] = sizeOf(webp, alreadyWebp ? originalPath : (fs.existsSync(webpPath) ? webpPath : originalPath));
    // A twin of already-WebP bytes is a worse re-encode and nothing points at
    // it. Never delete when the source IS the target file.
    if (alreadyWebp && webpPath !== originalPath && fs.existsSync(webpPath)) {
      fs.unlinkSync(webpPath);
      cleaned.push(main.out);
    }
    if (kind === "card") {
      card[id] = { webp, fallbacks, width, height };
    } else {
      (menu[id] ||= []).push({ webp, fallbacks, width, height, name: main.name });
    }
  }
  for (const id of Object.keys(menu)) {
    menu[id].sort((a, b) => String(a.name).localeCompare(String(b.name), "en", { numeric: true }));
  }
  const body = `// GENERATED by scripts/optimize-images.mjs - do not edit by hand.
// The file the browser should request, the originals kept as an onError fallback,
// and the real pixel size so the layout does not shift when the photo arrives.
export const CARD_IMAGES = ${JSON.stringify(card, null, 2)};

export const MENU_IMAGES = ${JSON.stringify(menu, null, 2)};
`;
  fs.writeFileSync(MANIFEST, body);
  console.log(`manifest written: ${Object.keys(card).length} card images, ${Object.keys(menu).length} menu galleries`);
  if (cleaned.length) console.log(`removed ${cleaned.length} redundant re-encodes of already-WebP files`);
  if (before) console.log(`webp payload: ${(after / 1048576).toFixed(1)} MB (was ${(before / 1048576).toFixed(1)} MB of png/jpg)`);
  const noSize = [...Object.values(card), ...Object.values(menu).flat()].filter((e) => !e.width || !e.height);
  if (noSize.length) console.log(`WARNING: ${noSize.length} entries have no readable dimensions`);
}

main().catch((e) => {
  try { fs.unlinkSync(CONVERTER); } catch { /* ignore */ }
  console.error("FAILED:", e.message);
  process.exit(1);
});
