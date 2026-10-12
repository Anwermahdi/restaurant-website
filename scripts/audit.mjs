import { restaurants, cuisines, areas } from '../src/data/restaurants.js';

const errors = [];
const allowedCuisines = new Set();
for (const r of restaurants) {
  if (!r.name) errors.push(`${r.id}: no name`);
  if (!r.cuisine) errors.push(`${r.id}: no cuisine`);
  if (!r.image) errors.push(`${r.id}: no image`);
  allowedCuisines.add(r.cuisine);
  if (!r.areas === false) {}
  if (r.lat == null || r.lng == null) errors.push(`${r.id}: no coords`);
  if (!r.branches || !r.branches.length) errors.push(`${r.id}: no branches`);
  if (!r.tags || !r.tags.length) errors.push(`${r.id}: no tags`);
  if (!r.id) errors.push(`entry without id`);
  if (restaurants.filter((x) => x.id === r.id).length > 1) errors.push(`${r.id}: duplicate id`);
  if (!r.pathname || !r.menuUrl) {
    if (!r.menuUrl && !r.menuPhotos?.length) errors.push(`${r.id}: no menu URL and no menu photos`);
  }
  if (r.rating != null && (r.rating < 0 || r.rating > 5)) errors.push(`${r.id}: bad rating`);
  try { new URL(r.website || 'https://example.com'); } catch { errors.push(`${r.id}: bad website`); }
}
console.log('restaurants:', restaurants.length);
console.log('cuisines:', cuisines.join(', '));
console.log('areas:', areas.length);
console.log('errors:', errors.length);
console.log(errors.join('\n'));
