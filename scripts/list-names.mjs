import fs from 'fs';
const src = fs.readFileSync('src/data/restaurants.js', 'utf8');
const names = [...src.matchAll(/mk\(\s*"[^"]+",\s*"([^"]+)"/g)].map((m) => m[1]);
console.log(names.join(' | '));
