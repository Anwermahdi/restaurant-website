import { cardData } from "../components/cards/cardData.js";
import { hasValidHours, restaurants } from "./restaurants.js";

/**
 * The "Recommended" order: the best-rated and most complete listings first,
 * so a visitor's first cards are the ones with the most real information.
 *
 *   - A rating counts most, weighted by how many reviews stand behind it (a
 *     4.8 from 3 reviews does not beat a 4.4 from 2,000). Places with no
 *     rating come after every rated place.
 *   - Then points for what a card can really show: researched hours, a logo,
 *     a sharp storefront photo (800 px or more) and a real description.
 *
 * It uses only data we already hold, nothing is invented, and it never
 * depends on the time of day, so cards do not jump around while you browse.
 */

// Logo files that really exist (the logoUpload path is set for everyone).
const LOGO_STEMS = new Set(
  Object.keys(import.meta.glob("/public/restaurants/logos/*")).map((path) => path.split("/").pop().replace(/\.[^.]+$/, ""))
);
const stem = (path) => String(path || "").split("/").pop().replace(/\.[^.]+$/, "");

const PRIOR_RATING = 3.8; // what a place with few reviews is pulled towards
const PRIOR_WEIGHT = 30; // as if it already had this many reviews

function scoreOf(restaurant) {
  const data = cardData(restaurant);
  const rating = Number(restaurant.rating) || 0;
  const reviews = Number(restaurant.reviews) || 0;
  const quality = rating ? (rating * reviews + PRIOR_RATING * PRIOR_WEIGHT) / (reviews + PRIOR_WEIGHT) : 0;
  const completeness =
    (hasValidHours(restaurant) ? 1 : 0) +
    (LOGO_STEMS.has(stem(restaurant.logoUpload)) ? 1 : 0) +
    ((data.photo?.width || 0) >= 800 ? 1 : 0) +
    (data.description ? 1 : 0);
  return (rating ? 10 : 0) + quality + completeness * 0.6;
}

const SCORES = new Map(restaurants.map((restaurant) => [restaurant.id, scoreOf(restaurant)]));

/** Best first; equal scores keep the order the data came in. */
export function sortRecommended(list) {
  return [...list].sort((a, b) => (SCORES.get(b.id) ?? 0) - (SCORES.get(a.id) ?? 0));
}
