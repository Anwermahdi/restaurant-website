import { restaurants } from "./restaurants.js";
import { sortRecommended } from "./recommended.js";

/**
 * The home page's dish groups. Which cuisines belong to a group is listed
 * here; everything else (how many places, which ones, the order of the
 * groups, whether a group is shown at all) is computed from the data, so a
 * new restaurant or a changed cuisine is reflected without touching this.
 *
 * A group's "See all" opens the full list filtered to exactly the same
 * cuisines, so the count on the home page is the count you get.
 */
const GROUPS = [
  { id: "burgers", name: "Burgers", cuisines: ["Burger"], image: "/dishes/burger.webp" },
  { id: "grills", name: "Grills", cuisines: ["Grill", "Malghom"], image: "/dishes/grill.webp" },
  { id: "chicken", name: "Chicken", cuisines: ["Fried Chicken", "Broasted"], image: "/dishes/chicken.webp" },
  { id: "pizza-pasta", name: "Pizza & pasta", cuisines: ["Italian", "Pizza", "Pasta"], image: "/dishes/pizza-pasta.webp" },
  { id: "cafes", name: "Cafes", cuisines: ["Cafe"], image: "/dishes/cafe.webp" },
  { id: "shawarma-sandwiches", name: "Shawarma & sandwiches", cuisines: ["Shawarma", "Sandwiches"], image: "/dishes/shawarma-sandwiches.webp" },
];

/** A group with fewer places than this is not shown on the home page. */
export const MIN_GROUP_PLACES = 4;
/** Cards in a dish row. */
export const DISH_ROW_SIZE = 8;

/** True when a restaurant belongs to the group. */
export function inDishGroup(restaurant, group) {
  return group.cuisines.includes(restaurant.cuisine);
}

const computed = GROUPS.map((group, order) => {
  // Rated places first, then the most complete; unrated places still appear.
  const members = sortRecommended(restaurants.filter((restaurant) => inDishGroup(restaurant, group)));
  return { ...group, order, total: members.length, members, items: members.slice(0, DISH_ROW_SIZE) };
});

/** Groups with enough places, the busiest first. */
export const DISH_GROUPS = computed
  .filter((group) => group.total >= MIN_GROUP_PLACES)
  .sort((a, b) => b.total - a.total || a.order - b.order);

/** Groups that were left out, and how many places they had. */
export const SKIPPED_DISH_GROUPS = computed
  .filter((group) => group.total < MIN_GROUP_PLACES)
  .map((group) => ({ id: group.id, name: group.name, total: group.total }));

export const dishGroupById = (id) => computed.find((group) => group.id === id) || null;
