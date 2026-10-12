import fs from 'fs';
import { restaurants } from '../src/data/restaurants.js';

const OUT = 'src/data/branch-coords.json';
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0, ok = 0;
const targets = [];
for (const r of restaurants) {
  for (const b of r.branches || []) {
    const key = `${r.id}|${b}`;
    if (!prev[key]) targets.push({ id: r.id, name: r.name, branch: b, key });
  }
}
console.log('to geocode:', targets.length);
for (const t of targets) {
  const q = `${t.name} ${t.branch} Bahrain`;
  try {
    const res = await fetch(`https://www.google.com/search?tbm=map&hl=en&gl=bh&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    const body = await res.text();
    const c = body.match(/\[null,null,(\d{2}\.\d{4,}),(\d{2}\.\d{4,})\]/);
    if (c) { prev[t.key] = { lat: Number(c[1]), lng: Number(c[2]) }; ok++; }
  } catch {}
  done++;
  if (done % 20 === 0) { fs.writeFileSync(OUT, JSON.stringify(prev, null, 2)); console.log(done, 'ok', ok); }
  await sleep(700 + Math.random() * 400);
}
fs.writeFileSync(OUT, JSON.stringify(prev, null, 2));
console.log('done', done, 'ok', ok);
