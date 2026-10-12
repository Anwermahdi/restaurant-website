import fs from 'fs';
import path from 'path';
import { restaurants } from '../src/data/restaurants.js';

const missing = [];
for (const r of restaurants) {
  if (r.image && r.image.startsWith('/')) {
    const p = path.join('public', r.image);
    if (!fs.existsSync(p)) missing.push(`${r.id} | local ${r.image} missing`);
  }
  if (Array.isArray(r.imageFallbacks)) {
    for (const f of r.imageFallbacks) {
      if (f && f.startsWith('/')) {
        const p = path.join('public', f);
        if (!fs.existsSync(p)) missing.push(`${r.id} | local fallback ${f} missing`);
      }
    }
  }
}
console.log(missing.length ? missing.join('\n') : 'no missing local files');
