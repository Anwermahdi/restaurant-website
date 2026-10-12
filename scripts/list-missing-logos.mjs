import { restaurants } from "../src/data/restaurants.js";
const missing = restaurants.filter((r) => !r.logo).map((r) => `${r.id} : ${r.name}`);
console.log(missing.join("\n"));
console.log(`TOTAL missing: ${missing.length}`);
