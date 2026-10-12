import fs from 'fs';
import { restaurants } from '../src/data/restaurants.js';

const ids = ['wadi-altayibin-grills','omy-and-banatha','freid','burger-fries-more','lab-burger','three-lines','burger-waqif','risotto','yebilna-pasta','le-pasta','milano'];
const src = fs.readFileSync('src/data/restaurants.js', 'utf8');
const loc = new Map();
for (const id of ids) {
  const m = src.match(new RegExp(`"${id}": \\{ area: "([^"]+)"`));
  loc.set(id, m ? m[1] : '');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
for (const id of ids) {
  const r = restaurants.find((x) => x.id === id);
  const area = loc.get(id) || r.area || '';
  const tries = [`${r.name} ${area} Bahrain`, `${r.name} ${area}`, `${r.name} Bahrain talabat`];
  let done = false;
  for (const q of tries) {
    const res = await fetch(`https://www.google.com/search?tbm=map&hl=en&gl=bh&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    const t = await res.text();
    const latlng = t.match(/\[null,null,(\d{2}\.\d{4,}),(\d{2}\.\d{4,})\]/);
    if (latlng && !(Math.abs(Number(latlng[1]) - 26.0667) < 0.001 && Math.abs(Number(latlng[2]) - 50.5577) < 0.001)) {
      out.push(`  "${id}": { lat: ${latlng[1]}, lng: ${latlng[2]}, dataSource: "google-maps" },`);
      console.log('OK  ', id, 'via', q, '=>', latlng[1], latlng[2]);
      done = true;
      break;
    }
    await sleep(700);
  }
  if (!done) console.log('MISS', id, 'area', area);
  await sleep(800);
}
fs.writeFileSync('geo-results2.txt', out.join('\n'));
console.log('written', out.length);
