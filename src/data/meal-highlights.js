import { MY_MEALS } from "./my-meals.js";
import { restaurants } from "./restaurants.js";

/**
 * "Meals I've eaten" as story highlights: one highlight per restaurant, in
 * the order the meals are listed (newest first), each holding my photos
 * from that place with the dish as the caption.
 */
const byId = new Map(restaurants.map((r) => [r.id, r]));

export const MEAL_HIGHLIGHTS = MY_MEALS.reduce((groups, meal) => {
  const restaurant = byId.get(meal.restaurantId);
  if (!restaurant || !meal.photo || !meal.dish) return groups;
  let group = groups.find((item) => item.restaurant.id === restaurant.id);
  if (!group) {
    group = { restaurant, frames: [] };
    groups.push(group);
  }
  group.frames.push({ src: meal.photo, caption: meal.dish, note: meal.note || "", duration: 5000 });
  return groups;
}, []);
