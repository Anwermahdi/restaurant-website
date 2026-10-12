import { restaurants } from '../src/data/restaurants.js';

const approx = restaurants.filter((r) => !r.dataSource?.includes('google') && r.area);
console.log('approx restaurants:', approx.length);
