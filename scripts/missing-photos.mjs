import { restaurants, FALLBACK_IMG } from '../src/data/restaurants.js';
const noPhoto = [];
const stockOrPlaceholder = [];
for (const r of restaurants) {
  const hasReal = Boolean(r.image && !r.image.startsWith('data:image/svg'));
  if (!hasReal) noPhoto.push(r.id + ' | ' + r.name + ' | ' + (r.cuisine || ''));
  if (r.image.startsWith('data:image/svg')) stockOrPlaceholder.push(r.id + ' (placeholder)');
  else if (FALLBACK_IMG && Object.values(FALLBACK_IMG).includes(r.image) && !r.image) stockOrPlaceholder.push(r.id + ' (fallback may be a stock photo)');
}
console.log('no real photo (placeholder svg):', noPhoto.length);
console.log(noPhoto.join('\n'));
