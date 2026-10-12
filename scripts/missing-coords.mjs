import fs from 'fs';
const src = fs.readFileSync('src/data/restaurants.js', 'utf8');
const lines = src.split('\n');
const ids = [...src.matchAll(/mk\(\s*"([^"]+)"/g)].map((m) => m[1]);
const geocoded = new Set();
lines.forEach((line, i) => {
  const m = line.match(/^\s*"([a-z0-9-]+)":\s*\{/);
  if (m) {
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      if (/lat:/.test(lines[j])) { geocoded.add(m[1]); break; }
      if (/^\s*\},?\s*$/.test(lines[j]) && j > i + 1 && /^\s{2}"/.test(lines[j+1] || '')) break;
    }
  }
});
const missing = ids.filter((id) => !geocoded.has(id));
console.log('total', ids.length, 'missing', missing.length);
console.log(missing.join('\n'));
