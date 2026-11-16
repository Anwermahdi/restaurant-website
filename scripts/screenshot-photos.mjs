#!/usr/bin/env node
/**
 * Screenshot the real rendered cards + detail galleries for a set of restaurants.
 *
 * Used to prove a photo-layout change actually reached the page, not just the
 * data files. It drives the already-running Vite dev server through headless
 * Edge's DevTools protocol (the same approach as optimize-images.mjs, since the
 * project has no Playwright/Puppeteer dependency).
 *
 *   node scripts/screenshot-photos.mjs --out=reports/photos-before
 *   node scripts/screenshot-photos.mjs --only=aseeri-star,white-house --details
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = process.env.PHOTO_ORIGIN || "http://127.0.0.1:5173";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9411;

const flags = new Map();
for (const token of process.argv.slice(2)) {
  const [key, value] = token.replace(/^--/, "").split("=");
  flags.set(key, value ?? true);
}
const outDir = path.resolve(ROOT, String(flags.get("out") || "reports/photos"));
const only = new Set(
  String(flags.get("only") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
const withDetails = flags.has("details");
const width = Number(flags.get("width") || 1440);
const height = Number(flags.get("height") || 1100);

fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const edge = spawn(EDGE, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:/Users/Anwer/AppData/Local/Temp/opencode/edge-photos",
  `--window-size=${width},${height}`,
  "about:blank",
], { stdio: "ignore", detached: true });

let wsUrl = null;
for (let i = 0; i < 80 && !wsUrl; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = list.find((target) => target.type === "page")?.webSocketDebuggerUrl;
  } catch {
    /* Edge is still starting. */
  }
  if (!wsUrl) await sleep(300);
}
if (!wsUrl) throw new Error("could not reach headless Edge");

const socket = new WebSocket(wsUrl);
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
await new Promise((resolve) => socket.addEventListener("open", resolve));
const send = (method, params = {}) => new Promise((resolve) => {
  nextId += 1;
  pending.set(nextId, resolve);
  socket.send(JSON.stringify({ id: nextId, method, params }));
});
const evaluate = async (expression) => {
  const reply = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    timeout: 120000,
  });
  const details = reply.result?.exceptionDetails;
  if (details) throw new Error(details.exception?.description || "page evaluation failed");
  return reply.result?.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 2,
  mobile: false,
});
await send("Page.navigate", { url: `${ORIGIN}/` });

// Wait for the first cards, then keep asking for the next page until every
// restaurant is mounted. The photos we need are not all on page one.
for (let i = 0; i < 60; i += 1) {
  const count = await evaluate("document.querySelectorAll('article.card').length");
  if (count > 0) break;
  await sleep(250);
}
for (let i = 0; i < 40; i += 1) {
  const state = await evaluate(`(() => {
    const more = document.querySelector('.grid-more-btn');
    if (more && !more.disabled) { more.click(); return { cards: document.querySelectorAll('article.card').length, more: true }; }
    return { cards: document.querySelectorAll('article.card').length, more: false };
  })()`);
  if (!state.more && state.cards > 0) break;
  await sleep(220);
}
// Let lazy images finish decoding before clipping.
await evaluate("window.scrollTo(0, document.body.scrollHeight)");
await sleep(600);
await evaluate("window.scrollTo(0, 0)");
await sleep(400);

const cards = await evaluate(`(() => {
  return [...document.querySelectorAll('article.card')].map((card) => ({
    id: card.querySelector('.card-open')?.textContent?.trim() || '',
    title: card.querySelector('.card-title')?.textContent?.trim() || '',
    titleId: card.querySelector('.card-title')?.id || '',
  }));
})()`);

const wanted = cards.filter((card) => {
  if (!only.size) return true;
  const titleId = card.titleId.replace(/^restaurant-| -title$/g, "").replace(/-title$/, "");
  return only.has(titleId) || [...only].some((needle) => card.titleId.includes(needle));
});

async function shoot(name, selector, index = 0, padBleed = true) {
  const box = await evaluate(`(() => {
    const nodes = document.querySelectorAll(${JSON.stringify(selector)});
    const node = nodes[${index}];
    if (!node) return null;
    node.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  })()`);
  if (!box) {
    console.log(`  ! ${name}: selector not found (${selector})`);
    return null;
  }
  await sleep(350);
  const clip = padBleed
    ? {
        x: Math.max(0, box.x - 10),
        y: Math.max(0, box.y - 10),
        width: box.width + 20,
        height: box.height + 20,
        scale: 1,
      }
    : { ...box, scale: 1 };
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip,
  });
  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  const name2 = path.relative(ROOT, file);
  console.log(`  ${name2}  ${Math.round(box.width)}x${Math.round(box.height)} css px`);
  return name2;
}

console.log(`screenshotting ${wanted.length} card(s) into ${path.relative(ROOT, outDir)}`);
for (const card of wanted) {
  // The card's title id is the stable per-restaurant key.
  const restaurantId = card.titleId.replace(/^restaurant-/, "").replace(/-title$/, "");
  await evaluate(`(() => {
    const node = document.getElementById(${JSON.stringify(card.titleId)});
    node?.scrollIntoView({ block: 'center' });
    return true;
  })()`);
  await sleep(250);
  const index = cards.indexOf(card);
  await shoot(`card-${restaurantId}`, "article.card", index);
  if (withDetails) {
    await evaluate(`(() => {
      const node = document.getElementById(${JSON.stringify(card.titleId)});
      const card = node?.closest('article.card');
      card?.querySelector('.card-photo')?.click();
      return true;
    })()`);
    await sleep(900);
    await shoot(`detail-${restaurantId}`, ".detail", 0);
    await evaluate("document.querySelector('.detail-tool--close')?.click()");
    await sleep(350);
  }
}

socket.close();
try { edge.kill(); } catch { /* ignore */ }
console.log("done");
