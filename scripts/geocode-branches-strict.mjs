import fs from 'fs';
import { restaurants } from '../src/data/restaurants.js';

const OUT = 'src/data/branch-coords.json';
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
let checked = 0, kept = 0;
for (const r of restaurants) {
  for (const b of r.branches || []) {
    const q = `${r.name} ${b} Bahrain`;
    try {
      const res = await fetch(`https://www.google.com/search?tbm=map&hl=en&gl=bh&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
      const body = await res.text();
      const c = body.match(/\[null,null,(\d{2}\.\d{4,}),(\d{2}\.\d{4,})\]/);
      const nameMatch = body.match(/"([^"]{3,80})",null,\[/);
      checked++;
      if (c && nameMatch) {
        const placeName = norm(nameMatch[1]);
        const target = norm(r.name);
        const branch = norm(b);
        const rn = norm(r.name.replace(/burger/gi, 'burger').replace(/cafe/gi, 'cafe'));
        const ok = placeName.includes(target.replace(/ /g, '')) || placeName.includes(rn) || placeName.includes(branch) || placeName.includes(target.split(' ')[0]) ;
        if (ok) {
          out[`${r.id}|${b}`] = { lat: Number(c[1]), lng: Number(c[2]) };
          kept++;
        }
      }
    } catch {}
    await sleep(900 + Math.random() * 400);
  }
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log('checked', checked, 'kept', kept);
