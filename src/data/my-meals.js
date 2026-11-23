/**
 * Meals I've eaten: my own photos of real plates, shown as a row of big
 * photos on the front page. Tapping one opens its restaurant.
 *
 * To add one:
 *   1. Put the photo in public/meals/   (JPG or WebP, ideally upright,
 *      at least 1000 px wide, e.g. public/meals/tren-tren-mixed-grill.jpg)
 *   2. Add a line below. restaurantId must match an id in restaurants.js.
 *        { restaurantId: "tren-tren", dish: "Mixed grill",
 *          photo: "/meals/tren-tren-mixed-grill.jpg",
 *          note: "Best tikka in Riffa" },
 *      (note is optional: a few words of your own.)
 *
 * Newest first reads best: add new meals at the top.
 * While this list is empty, the section does not show at all.
 */
export const MY_MEALS = [
  { restaurantId: "zulu", dish: "Dinner", photo: "/meals/zulu-dinner.jpg" },
];
