import fs from 'fs';
import { restaurants } from '../src/data/restaurants.js';

const approx = restaurants.filter((r) => r.dataSource === 'curated');
console.log('targets:', approx.map((r) => r.id).join(', '));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
for (const r of approx) {
  const q = [r.name, r.area, 'Bahrain'].filter(Boolean).join(' ');
  try {
    const res = await fetch(`https://www.google.com/search?tbm=map&hl=en&gl=bh&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    const t = await res.text();
    const latlng = t.match(/\[null,null,(\d{2}\.\d{4,}),(\d{2}\.\d{4,})\]/);
    if (latlng) {
      out.push(`  "${r.id}": { lat: ${latlng[1]}, lng: ${latlng[2]}, dataSource: "google-maps" },`);
      console.log('OK  ', r.id, latlng[1], latlng[2]);
    } else {
      console.log('MISS', r.id);
    }
  } catch (e) { console.log('ERR ', r.id, e.message); }
  await sleep(900 + Math.random() * 500);
}
fs.writeFileSync('geo-results.txt', out.join('\n'));
console.log('written', out.length);
