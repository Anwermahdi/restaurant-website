// Prints every restaurant with its id, its name and the meals the site
// works out for it, so you can copy the ones you want into
// src/data/meal-times.js.
//
//   npm run meals:list            all restaurants
//   npm run meals:list breakfast  only the ones that serve breakfast
import { restaurants, MEAL_TIMES } from "../src/data/restaurants.js";

const wanted = (process.argv[2] || "").trim().toLowerCase();
const filter = wanted ? MEAL_TIMES.find((meal) => meal.toLowerCase() === wanted) : null;

if (wanted && !filter) {
  console.log(`Unknown meal "${wanted}". Use one of: ${MEAL_TIMES.join(", ")}`);
  process.exit(1);
}

const rows = restaurants
  .filter((restaurant) => !filter || restaurant.mealTimes.includes(filter))
  .map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    meals: restaurant.mealTimes.join(", ") || "-",
  }));

const idWidth = Math.max(...rows.map((row) => row.id.length)) + 2;
const nameWidth = Math.max(...rows.map((row) => row.name.length)) + 2;

console.log(filter ? `Restaurants serving ${filter} (${rows.length}):` : `All restaurants (${rows.length}):`);
console.log("");
for (const row of rows) {
  console.log(`${row.id.padEnd(idWidth)}${row.name.padEnd(nameWidth)}${row.meals}`);
}

console.log("");
console.log("Copy-paste template for src/data/meal-times.js:");
for (const row of rows.slice(0, 3)) {
  console.log(`  "${row.name}": ["Breakfast"],   // ${row.id}`);
}
