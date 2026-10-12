import fs from 'fs';
const s = fs.readFileSync('src/data/restaurants.js', 'utf8');
let total = 0;
for (const m of s.matchAll(/branches: \[([^\]]*)\]/g)) {
  total += m[1].split(',').map((x) => x.trim()).filter(Boolean).length;
}
console.log('total branch names:', total);
