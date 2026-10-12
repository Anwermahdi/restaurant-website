import fs from 'fs';
const s = fs.readFileSync('src/data/restaurants.js', 'utf8');
const coordsBlock = s.slice(s.indexOf('const AREA_COORDS'), s.indexOf('const LOCATIONS'));
const areas = [...coordsBlock.matchAll(/"([^"]+)": \[/g)].map((m) => m[1]);
const branchNames = new Set();
for (const m of s.matchAll(/branches: \[([^\]]+)\]/g)) {
  for (const b of m[1].split(',').map((x) => x.trim().replace(/^"|"$/g, ''))) if (b) branchNames.add(b);
}
console.log([...branchNames].filter((b) => !areas.includes(b)).join(' | '));
