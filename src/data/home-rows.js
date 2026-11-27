import { areas, hasValidHours, isOpenNow, restaurants } from "./restaurants.js";
import { normalizeSearchText } from "./search-text.js";
import { sortRecommended } from "./recommended.js";

/**
 * The other home page rows, each computed from data we really hold.
 */

/** Open now needs at least this many places, or the row is not shown. */
export const MIN_OPEN_NOW = 4;
export const OPEN_NOW_ROW_SIZE = 8;

/**
 * Places open right now, from researched opening hours only (a place with no
 * hours is never listed, and never shown as closed either).
 */
export function openNowPlaces(when = new Date()) {
  return sortRecommended(restaurants.filter((r) => hasValidHours(r) && isOpenNow(r.openingHours, when) === true));
}

/** Top rated: a Google rating of 4.5 or more, with at least 100 reviews. */
export const TOP_RATING = 4.5;
export const TOP_REVIEWS = 100;
export const TOP_ROW_SIZE = 12;
export const topRatedPlaces = sortRecommended(
  restaurants.filter((r) => Number(r.rating) >= TOP_RATING && Number(r.reviews) >= TOP_REVIEWS)
);

/**
 * The areas a place counts for: exactly what the Area filter on the full list
 * uses (its branches, or its area, or its address), so a chip's count is the
 * count you get.
 */
function zonesOf(restaurant) {
  const zones = restaurant.branches.length
    ? restaurant.branches
    : [restaurant.area || restaurant.address, restaurant.address].filter(Boolean);
  return zones.map(normalizeSearchText);
}

const ZONES = new Map(restaurants.map((r) => [r.id, zonesOf(r)]));

/** The areas with the most places: [{ name, count }], busiest first. */
export function busiestAreas(limit = 8) {
  return areas
    .filter((name) => name !== "All")
    .map((name) => {
      const key = normalizeSearchText(name);
      return { name, count: restaurants.filter((r) => ZONES.get(r.id).includes(key)).length };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}
