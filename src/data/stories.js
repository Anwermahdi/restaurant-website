// ============================================================
// Story highlights: the meals a restaurant wants to show off.
//
// HOW TO ADD A HIGHLIGHT
//   1. Put the photo in  public/restaurants/stories/<restaurant-id>/
//      e.g.  public/restaurants/stories/tren-tren/01.jpg
//   2. Add a line below. Each entry is one full-screen frame.
//
//   "tren-tren": [
//     { src: "/restaurants/stories/tren-tren/01.jpg", caption: "Tikka masala - our most ordered" },
//     { src: "/restaurants/stories/tren-tren/02.jpg", caption: "Freshly baked kuboos" },
//   ],
//
// Rules
//   * <restaurant-id> is the id used in src/data/restaurants.js (the file name
//     of its card photo without the extension).
//   * Portrait photos (1080x1920) look best; landscape is fine, it is cropped.
//   * "duration" is optional, in milliseconds. Default 5000.
//   * A caption is optional. "link" is optional and opens a URL when tapped.
//   * Delete any frame by removing its line - nothing else to clean up.
//
// The entries below are the menus we already have photos for, so the rail is
// not empty. Replace them with real meal photos as you send them.
// ============================================================

const menuStory = (id, count, captions) =>
  Array.from({ length: count }, (_, index) => ({
    src: `/restaurants/media/${id}/menu-${String(index + 1).padStart(2, "0")}.webp`,
    caption: captions?.[index] || "",
  }));

export const STORIES = {
  "al-mihwar": menuStory("al-mihwar", 10),
  "ala-hawak": menuStory("ala-hawak", 5),
  "burger-square": menuStory("burger-square", 4),
  "welayat-ali": menuStory("welayat-ali", 1),
  "al-furat-nights": menuStory("al-furat-nights", 1),
  "mama-joz": menuStory("mama-joz", 2),
  "pizzaro": menuStory("pizzaro", 2),
  "little-caesars": menuStory("little-caesars", 2),
};

const DEFAULT_DURATION = 5000;

/** Normalised frames for one restaurant: [] when it has no highlights. */
export function storyFrames(id) {
  const raw = STORIES[id];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((frame) => (typeof frame === "string" ? { src: frame } : frame))
    .filter((frame) => frame && typeof frame.src === "string" && frame.src.length > 3)
    .map((frame) => ({ ...frame, duration: frame.duration || DEFAULT_DURATION }));
}

export const hasStory = (id) => storyFrames(id).length > 0;
