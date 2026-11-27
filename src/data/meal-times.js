// ============================================================
// Manual meal times.
//
// A place's meals are worked out from its researched opening hours (open
// inside the meal's window on at least half of its open days), plus
// "Coffee and desserts" for cafes. A place with no researched hours is not
// placed in any meal. THIS file is where you correct a place by hand.
//
// How to add one:
//
//   "5 Spoons": ["Breakfast", "Lunch"],
//   "adam-subs": { Dinner: false },
//
//   - The key is the restaurant name ("5 Spoons") or its id
//     ("5-spoons"). Either one works.
//   - An array means "these meals too" - the restaurant keeps its
//     dinner and gains the ones you list.
//   - { Dinner: false } switches a meal OFF, which is how you take
//     a place out of a meal it does not really serve.
//
// A restaurant you leave out keeps the meals worked out from its hours,
// so you only list the ones you want to change. A meal only shows up in
// the filter once at least one restaurant has it.
//
// Two things are checked for you, so a typo never disappears
// quietly:
//   - a key that matches no restaurant is reported in the console
//   - a meal name that is not one of MEAL_TIMES is too
//
// Run `npm run meals:list` to print every restaurant with its id,
// its name and the meals the site works out for it right now.
// ============================================================

export const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Coffee and desserts", "Late night"];

/**
 * The meal most places serve. Kept for older code; nothing is assumed any
 * more: a place's meals now come from its researched opening hours.
 */
export const DEFAULT_MEAL = "Dinner";

// Your list goes here.
export const MEAL_OVERRIDES = {
  // "5 Spoons": ["Breakfast", "Lunch"],
  // "adam-subs": { Breakfast: false },
};

/** "5 Spoons", "5-spoons" and "5spoons" all find the same restaurant. */
function normaliseKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Reads one entry: an array means "these meals on", an object can also switch a meal off. */
function readOverride(value) {
  const on = new Set();
  const off = new Set();
  if (Array.isArray(value)) {
    for (const meal of value) {
      const name = String(meal).trim();
      if (name) on.add(name);
    }
  } else {
    for (const [meal, flag] of Object.entries(value || {})) {
      const name = String(meal).trim();
      if (!name) continue;
      if (flag === false) off.add(name);
      else on.add(name);
    }
  }
  return { on, off };
}

/**
 * Applies MEAL_OVERRIDES on top of the meals worked out from the opening
 * hours. Restaurants you did not list keep those meals.
 */
export function applyMealOverrides(restaurants) {
  const byKey = new Map();
  for (const restaurant of restaurants) {
    byKey.set(normaliseKey(restaurant.id), restaurant);
    byKey.set(normaliseKey(restaurant.name), restaurant);
  }

  const unknownRestaurants = [];
  const unknownMeals = [];

  for (const [key, value] of Object.entries(MEAL_OVERRIDES)) {
    const restaurant = byKey.get(normaliseKey(key));
    if (!restaurant) {
      unknownRestaurants.push(key);
      continue;
    }

    const { on, off } = readOverride(value);
    for (const meal of [...on, ...off]) {
      if (!MEAL_TIMES.includes(meal)) unknownMeals.push(`${key}: ${meal}`);
    }

    const meals = new Set(restaurant.mealTimes || []);
    for (const meal of on) meals.add(meal);
    for (const meal of off) meals.delete(meal);

    // Keeps the order Breakfast, Lunch, Dinner.
    restaurant.mealTimes = MEAL_TIMES.filter((meal) => meals.has(meal));
  }

  if (unknownRestaurants.length) {
    console.warn(
      `meal-times: no restaurant matches ${unknownRestaurants.map((key) => `"${key}"`).join(", ")}. ` +
        "Run `npm run meals:list` for the names.",
    );
  }
  if (unknownMeals.length) {
    console.warn(
      `meal-times: not a meal name - ${unknownMeals.join(", ")}. Use ${MEAL_TIMES.join(", ")}.`,
    );
  }
}
