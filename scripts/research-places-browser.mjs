// Fills in the gaps the tbm=map payload leaves behind: street address, area and
// weekly hours, read from the rendered Google Maps place panel.
//
//   node scripts/research-places-browser.mjs            # only records missing data
//   node scripts/research-places-browser.mjs --all
//   node scripts/research-places-browser.mjs --probe    # dump the panel structure
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = path.join(ROOT, "research", "maps-scan.json");
const PORT = 9390;
const PROBE = process.argv.includes("--probe");
const ALL = process.argv.includes("--all");

const BAHRAIN_AREAS = [
  "Manama", "Adliya", "Amwaj", "Gudaif", "Juffair", "Seef", "Al Aali", "Aali", "Jidar Al Aali",
  "Busaiteen", "Riffa", "Sitra", "Sahlat", "Al Saya", "Karbabad", "Janabiyah", "Al Budaiya",
  "Budaiya", "Saar", "Al Qalali", "Qalali", "Tubarat", "Muharraq", "Hidd", "Halat Al Sahlat",
  "Abu Rayyan", "Ain Ashi", "Diyar Al Muharraq", "Hamad Town", "Isa Town", "Awl", "Kalaif",
  "Karranah", "Malkiya", "Al Malkiyah", "Awala", "Um Al Hassam", "Arad", "Askar", "Zinjawar",
  "Al Zinjawar", "Al Qalaliya", "Samir", "Baharna", "Awali", "Durrat Al Bahrain", "Dar Zoom",
  "Al Areen", "Valley City", "Sadeen", "Al Jurf", "Al Mausoon", "Al Qalaliyah",
];

const scan = JSON.parse(fs.readFileSync(SCAN, "utf8"));
const needsWork = scan.results.filter(
  (r) => r.resolved && (ALL || !r.resolved.address || !r.resolved.hours),
);
console.log(`records needing the panel: ${needsWork.length} of ${scan.results.length}`);

const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:/Users/Anwer/AppData/Local/Temp/opencode/edge-places",
  "--window-size=1400,1000", "about:blank",
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
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, timeout: 60000 });
  if (r.result?.exceptionDetails) return null;
  return r.result?.result?.value;
};
await send("Page.enable");
await send("Runtime.enable");

const READ = `(() => {
  const panel = document.querySelector('div[role="dialog"]') || document.body;
  const ariaLabels = [...panel.querySelectorAll('[aria-label]')]
    .map((n) => n.getAttribute('aria-label'))
    .filter((l) => l && l.length < 160);
  const hoursTable = [...panel.querySelectorAll('table tr, div[role="table"] div')]
    .map((n) => n.textContent.replace(/\\s+/g, ' ').trim())
    .filter((t) => /\\d{1,2}\\s?(AM|PM)|Closed|24 hours|Open/i.test(t));
  return {
    ariaLabels: [...new Set(ariaLabels)],
    hours: [...new Set(hoursTable)],
    text: panel.innerText.replace(/\\n{2,}/g, '\\n').slice(0, 1200),
  };
})()`;

let done = 0;
for (const record of needsWork) {
  const r = record.resolved;
  const url = r.placeId?.startsWith("ChIJ")
    ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(r.placeId)}&hl=en&gl=bh`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${r.name} Bahrain`)}?hl=en&gl=bh`;
  try {
    await send("Page.navigate", { url });
    await sleep(6500);
    const data = await ev(READ);
    if (PROBE) {
      console.log(`\n##### ${record.id} :: ${url}`);
      console.log(JSON.stringify(data, null, 2).slice(0, 3000));
      continue;
    }
    const labels = data?.ariaLabels || [];
    const clean = (value) =>
      String(value)
        .replace(/^Address:\s*/, "")
        // the panel appends a plus code: "Souq Waqif, Hamad Town 1038"
        .replace(/\s+[0-9A-Z]{4,}\+?[0-9A-Z]{0,8}$/i, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    // The panel exposes icon paths and the category list alongside the address;
    // only a real address reads like a place.
    const CATEGORY_WORDS = new RegExp(
      "^(restaurant|cafe|coffee ?shop|fast food restaurant|pizza restaurant|burger restaurant|sandwich shop|dessert shop|bakery|ice cream shop|juice bar|breakfast restaurant|middle eastern restaurant|italian restaurant|chinese restaurant|indian restaurant|arabian restaurant|sea ?food restaurant|steak ?house|bar & grill|kebab shop|shawarma|persian restaurant|turkish restaurant|lebanese restaurant|greek restaurant|vegetarian restaurant|vegan restaurant|family restaurant|international restaurant|mediterranean restaurant|asian restaurant|japanese restaurant|sushi restaurant|thai restaurant|korean restaurant|american restaurant|mexican restaurant|french restaurant|greek and bakery|coffee roaster|barber shop|clothing store|atm|bank|pharmacy)$",
      "i",
    );
    const isRealAddress = (value) =>
      Boolean(value) &&
      !/^(https?:|data:)|gstatic|googleapis|googleusercontent|\.(png|jpe?g|webp|svg|gif)$/i.test(value) &&
      !CATEGORY_WORDS.test(String(value).trim());
    const address =
      labels.map(clean).find((l) => /^Address:/.test(l) && isRealAddress(clean(l))) ||
      labels.map(clean).find((l) => isRealAddress(l) && /, Bahrain$/i.test(l)) ||
      labels.map(clean).find((l) => isRealAddress(l) && /\d/.test(l) && l.length < 110) ||
      (data?.text || "").match(/([A-Z][^]{5,90}, Bahrain)/)?.[1]?.trim() ||
      "";
    const phone = labels.map((l) => l.replace(/^(Phone|Call):\s*/, "")).find((l) => /\+?973/.test(l)) || "";
    const hours = {};
    for (const line of data?.hours || []) {
      const m = line.match(/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(.+)/i);
      if (m) hours[m[1]] = m[2].trim().replace(/\s*·.*$/, "");
    }
    if (address) {
      r.address = address;
      const area = BAHRAIN_AREAS.find((a) => new RegExp(`\\b${a}\\b`, "i").test(address));
      if (area) r.area = area;
    }
    if (phone && !r.phone) r.phone = phone;
    if (Object.keys(hours).length > 2) r.hours = hours;
    if (!r.hours) {
      // The panel header carries the current state: "Open · Closes 2 AM".
      const state = (data?.text || "").match(/\b(Open 24 hours|Open · Closes [\d: APM]{1,6}|Closed · Opens [\d: APM]{1,6}|Closed \d+ days?)/)?.[1];
      if (state) r.openNow = r.openNow || state;
    }
    r.panelText = (data?.text || "").slice(0, 400);
    console.log(`  [${++done}/${needsWork.length}] ${record.id}: ${r.address || "no address"}${r.area ? ` @ ${r.area}` : ""} | hours ${Object.keys(r.hours || {}).length}${r.openNow ? ` | ${r.openNow}` : ""}`);
  } catch (error) {
    console.log(`  [${++done}/${needsWork.length}] ${record.id}: ERROR ${error.message}`);
  }
  fs.writeFileSync(SCAN, JSON.stringify(scan, null, 2));
  await sleep(1200);
}

if (!PROBE) {
  fs.writeFileSync(SCAN, JSON.stringify(scan, null, 2));
  console.log(`updated ${path.relative(ROOT, SCAN)}`);
}
socket.close();
try { process.kill(-edge.pid); } catch { /* ignore */ }
try { edge.kill(); } catch { /* ignore */ }
