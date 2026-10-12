// Measures the real pixel size of every asset the browser will request, using
// the browser's own decoder, and caches it in research/image-dims.json.
// Header parsing is fast but gets VP8L (lossless WebP) wrong, and a wrong
// width/height is worse than none: it reserves a box the photo never fills.
//
//   node scripts/measure-images.mjs
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "research", "image-dims.json");
const MANIFEST = path.join(ROOT, "src", "data", "image-manifest.js");
const PORT = 9395;

const src = fs.readFileSync(MANIFEST, "utf8");
const card = JSON.parse(src.match(/CARD_IMAGES = (\{[\s\S]*?\n\});/)[1]);
const menu = JSON.parse(src.match(/MENU_IMAGES = (\{[\s\S]*?\n\});/)[1]);
const urls = [
  ...new Set([
    ...Object.values(card).map((e) => e.webp),
    ...Object.values(menu).flat().map((e) => e.webp),
  ]),
];
console.log(`measuring ${urls.length} images...`);

const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:/Users/Anwer/AppData/Local/Temp/opencode/edge-dims2",
  "--window-size=900,700", "about:blank",
], { stdio: "ignore", detached: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws = null;
for (let i = 0; i < 60 && !ws; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    ws = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch { /* retry */ }
  if (!ws) await sleep(500);
}
if (!ws) throw new Error("could not reach Edge");

const socket = new WebSocket(ws);
let id = 0;
const pending = new Map();
socket.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise((r) => socket.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { id += 1; pending.set(id, res); socket.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, timeout: 180000 });
  return r.result?.result?.value;
};
await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "http://127.0.0.1:5173/" });
await sleep(2000);

const result = await ev(`(async () => {
  const urls = ${JSON.stringify(urls)};
  const out = {};
  const load = (url) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
    img.onerror = () => resolve([0, 0]);
    img.src = url + (url.includes("?") ? "&" : "?") + "m=" + Math.random();
  });
  // Small batches keep the page responsive and the CDP call short.
  for (let i = 0; i < urls.length; i += 12) {
    const batch = urls.slice(i, i + 12);
    const sizes = await Promise.all(batch.map(load));
    batch.forEach((url, k) => { out[url] = sizes[k]; });
  }
  return out;
})()`);

const bad = Object.entries(result || {}).filter(([, s]) => !s[0] || !s[1]);
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
Object.assign(cache, result || {});
fs.mkdirSync(path.dirname(CACHE), { recursive: true });
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
console.log(`measured ${Object.keys(result || {}).length} | cached ${Object.keys(cache).length}`);
if (bad.length) console.log(`could not load ${bad.length}: ${bad.slice(0, 6).map(([u]) => u).join(", ")}`);

socket.close();
try { process.kill(-edge.pid); } catch { /* ignore */ }
try { edge.kill(); } catch { /* ignore */ }
