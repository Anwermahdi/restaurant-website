import fs from 'fs';
const src = fs.readFileSync('src/data/restaurants.js', 'utf8');
const ids = [...src.matchAll(/mk\(\s*"([^"]+)"/g)].map((m) => m[1]);
const logos = fs.readdirSync('public/restaurants/logos').map((f) => f.replace(/\.(jpg|jpeg|png|webp)$/i, ''));
const set = new Set(logos);
const missing = ids.filter((id) => !set.has(id));
console.log('total', ids.length, 'missing', missing.length);
console.log(missing.join('\n'));
