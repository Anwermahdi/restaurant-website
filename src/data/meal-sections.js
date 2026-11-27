import { cardData } from "../components/cards/cardData.js";
import { MEAL_TIMES, restaurants } from "./restaurants.js";
import { sortRecommended } from "./recommended.js";

/**
 * The home page's sections: one per meal time. A place belongs to a section
 * from its researched opening hours (and, for "Coffee and desserts", from
 * being a cafe), exactly as the "meal" filter on the full list works, so a
 * section's "See all 13" always opens a list of 13.
 *
 * Each section has a header photo taken from one of its own restaurants.
 * Sizes in the data are sometimes wrong, so the picks below are places whose
 * photo files were measured (all at least 675 px wide). If none of them is
 * in the section, the biggest photo among its places is used instead.
 */
const MIN_PLACES = 4; // a section with fewer places is skipped
const ROW_SIZE = 6; // cards shown in a section's row

// What the section's count is counting, in plain words.
const NOTES = {
  Breakfast: (n) => `${n} places open in the morning`,
  Lunch: (n) => `${n} places open at lunchtime`,
  Dinner: (n) => `${n} places open for dinner`,
  "Coffee and desserts": (n) => `${n} cafes and coffee spots`,
  "Late night": (n) => `${n} places open past 1 AM`,
};

const PHOTO_PICKS = {
  "Coffee and desserts": ["angelo-cafe", "ghancha"],
  Breakfast: ["fatto", "5-spoons"],
  Lunch: ["5-spoons", "nu-asia"],
  Dinner: ["barbecue-town", "melenzane", "three-lines"],
  "Late night": ["viola-burger", "three-lines", "l-avenue-cafe"],
};
// Sections pick in this order, so the most particular choice wins its photo.
const PICK_ORDER = ["Coffee and desserts", "Breakfast", "Lunch", "Dinner", "Late night"];

function headerPhotoFor(meal, members, used) {
  const byId = new Map(members.map((r) => [r.id, r]));
  const make = (r) => {
    const data = cardData(r);
    return data.photo?.src ? { src: data.photo.src, focus: data.focus || "center", restaurant: r } : null;
  };
  for (const id of PHOTO_PICKS[meal] || []) {
    const r = byId.get(id);
    const pick = r && !used.has(r.id) ? make(r) : null;
    if (pick) return pick;
  }
  const rest = members
    .filter((r) => !used.has(r.id))
    .map((r) => ({ r, width: cardData(r).photo?.width || 0 }))
    .sort((a, b) => b.width - a.width);
  return rest.length ? make(rest[0].r) : null;
}

export function buildMealSections() {
  const used = new Set();
  const photos = {};
  const members = Object.fromEntries(
    MEAL_TIMES.map((meal) => [meal, restaurants.filter((r) => (r.mealTimes || []).includes(meal))])
  );
  for (const meal of PICK_ORDER) {
    if (members[meal].length < MIN_PLACES) continue;
    const photo = headerPhotoFor(meal, members[meal], used);
    if (photo) {
      photos[meal] = photo;
      used.add(photo.restaurant.id);
    }
  }
  return MEAL_TIMES.filter((meal) => members[meal].length >= MIN_PLACES && photos[meal]).map((meal) => ({
    id: meal.toLowerCase().replace(/[^a-z]+/g, "-"),
    meal,
    title: meal,
    total: members[meal].length,
    note: NOTES[meal](members[meal].length),
    items: sortRecommended(members[meal]).slice(0, ROW_SIZE),
    photo: photos[meal],
  }));
}
