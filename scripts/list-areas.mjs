import fs from 'fs';
const s = fs.readFileSync('src/data/restaurants.js', 'utf8');
const lines = s.split('\n');
const start = lines.findIndex((l) => l.includes('const LOCATIONS'));
const end = lines.findIndex((l, i) => i > start && l.trim() === '};');
const areas = new Set();
for (let i = start; i < end; i++) {
  const m = lines[i].match(/area: "([^"]+)"/);
  if (m) areas.add(m[1]);
}
console.log([...areas].join(' | '));
