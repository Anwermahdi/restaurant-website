// Shared photo rules for every restaurant card and detail gallery.
//
// One resolver decides, for each restaurant, which photo is the storefront and
// whether it may fill the frame:
//
//   1. a manual choice in src/data/storefront-photos.js wins;
//   2. otherwise the best real landscape photo in the restaurant's own
//      gallery wins (menu scans and brand logos are never candidates);
//   3. otherwise the current photo is kept and shown whole.
//
// Landscape photos fill the frame full-width with a gentle, bounded crop
// (never more than ~25% of the height, and the sign stays in view through the
// focal point). Portrait photos are never cropped, stretched or zoomed: they
// are shown whole on the shared flat background until a real landscape
// storefront replaces them.
//
// `needsReplacement` is what the audit report groups on: portrait, too small,
// or rejected by a reviewer.

import { PHOTO_RULES, STOREFRONT_PHOTOS } from "./storefront-photos.js";

const MENU_PHOTO_PATTERN = /(?:^|\/)media\/(?:[^/]+\/)?[^/]*menu[-.]/i;
const LOGO_PHOTO_PATTERN = /(?:^|\/)logos?\//i;

export function isMenuPhotoSrc(src) {
  return MENU_PHOTO_PATTERN.test(String(src || ""));
}

export function isLogoPhotoSrc(photo) {
  const src = typeof photo === "string" ? photo : photo?.src || "";
  return LOGO_PHOTO_PATTERN.test(String(src));
}

export function photoSize(photo) {
  return {
    width: Number(photo?.width || 0),
    height: Number(photo?.height || 0),
  };
}

export function photoRatio(photo) {
  const { width, height } = photoSize(photo);
  return width > 0 && height > 0 ? width / height : 0;
}

export function isLandscapePhoto(photo) {
  const ratio = photoRatio(photo);
  return ratio >= PHOTO_RULES.minLandscapeRatio && ratio <= PHOTO_RULES.maxLandscapeRatio;
}

/** A real photo of the place: not a menu page, not the brand logo. */
export function isStorefrontCandidate(photo) {
  if (!photo?.src) return false;
  if (isMenuPhotoSrc(photo.src) || isLogoPhotoSrc(photo)) return false;
  return true;
}

/**
 * Higher is better. Landscape and sharpness matter, but a photo should not be
 * changed for a marginally "better" one: the current photo gets a small bonus.
 */
export function storefrontScore(photo, preferredSrc = "") {
  if (!isStorefrontCandidate(photo)) return -Infinity;
  const { width, height } = photoSize(photo);
  if (!width || !height) return -60; // unknown size is a last resort, never a win
  const ratio = width / height;
  let score = 0;
  if (isLandscapePhoto(photo)) score += 100;
  // Prefer a shape close to 3:2, the natural storefront shape.
  score -= Math.abs(ratio - 1.5) * 18;
  // Resolution, capped: a 4000px photo is not better than a 1600px one here.
  score += Math.min(width, 1600) / 100;
  if (width < PHOTO_RULES.minCardWidth) score -= 55;
  if (ratio < 0.7 || ratio > 2.8) score -= 20;
  if (preferredSrc && photo.src === preferredSrc) score += 6;
  return score;
}

/** Every distinct real photo a restaurant has, best first. */
export function storefrontCandidates(restaurant) {
  const seen = new Set();
  const list = [];
  const add = (photo) => {
    if (!isStorefrontCandidate(photo) || seen.has(photo.src)) return;
    seen.add(photo.src);
    list.push(photo);
  };
  const current = restaurant?.image
    ? {
        src: restaurant.image,
        width: restaurant.imageWidth,
        height: restaurant.imageHeight,
        source: restaurant.imageSource || "foodfind",
      }
    : null;
  (Array.isArray(restaurant?.photos) ? restaurant.photos : []).forEach(add);
  add(current);
  const preferredSrc = restaurant?.image || "";
  return list.sort(
    (a, b) => storefrontScore(b, preferredSrc) - storefrontScore(a, preferredSrc)
  );
}

/** The registry entry for a restaurant, if a person has reviewed it. */
export function reviewFor(restaurantId) {
  return STOREFRONT_PHOTOS?.[restaurantId] || null;
}

function photoFromRegistry(entry, restaurant) {
  if (!entry?.src) return null;
  const known = storefrontCandidates(restaurant).find((photo) => photo.src === entry.src);
  if (known) return known;
  return {
    src: entry.src,
    width: Number(entry.width || 0),
    height: Number(entry.height || 0),
    source: entry.source || "manual",
    credits: entry.credit ? [{ name: entry.credit }] : [],
    credit: entry.credit ? { name: entry.credit } : null,
  };
}

/**
 * The single decision used by cards, details and the audit.
 *
 * @returns {{
 *   photo: object|null,
 *   fit: "cover"|"contain",
 *   focus: string,
 *   status: "approved"|"needs-replacement"|"auto",
 *   needsReplacement: boolean,
 *   reasons: string[],
 *   review: object|null
 * }}
 */
export function storefrontPhotoFor(restaurant) {
  const review = reviewFor(restaurant?.id);
  const manual = photoFromRegistry(review, restaurant);
  const candidates = storefrontCandidates(restaurant);
  const photo = manual || candidates[0] || null;

  if (!photo) {
    return {
      photo: null,
      fit: "contain",
      focus: "center",
      status: review?.status || "needs-replacement",
      needsReplacement: true,
      reasons: ["no real photo on file"],
      review,
    };
  }

  const { width, height } = photoSize(photo);
  const ratio = width && height ? width / height : 0;
  const landscape = ratio >= PHOTO_RULES.minLandscapeRatio;
  const reasons = [];

  if (!landscape) reasons.push(ratio ? `portrait (${width}x${height})` : "unknown orientation");
  if (width && width < PHOTO_RULES.minCardWidth) reasons.push(`only ${width}px wide`);
  if (ratio > PHOTO_RULES.maxLandscapeRatio) reasons.push("extreme panorama");
  if (review?.status === "needs-replacement") reasons.push("marked by reviewer");

  const approved = review?.status === "approved";
  const needsReplacement = approved ? false : reasons.length > 0;

  return {
    photo,
    // A manual focus only applies when the photo can fill the frame.
    fit: landscape && width >= PHOTO_RULES.minCardWidth ? "cover" : "contain",
    focus: review?.focus || "center 32%",
    status: review?.status || (needsReplacement ? "needs-replacement" : "auto"),
    needsReplacement,
    reasons,
    review,
  };
}

/** How one photo should sit in a frame, independent of the registry. */
export function frameForPhoto(photo) {
  const { width } = photoSize(photo);
  const landscape = photoRatio(photo) >= PHOTO_RULES.minLandscapeRatio;
  return {
    fit: landscape && width >= PHOTO_RULES.minCardWidth ? "cover" : "contain",
    focus: "center 32%",
  };
}

/**
 * Pick the best photo from a list, keeping the caller's current choice when it
 * is already a good landscape. Kept for the details gallery, which reorders
 * branch photos before the brand photo.
 */
export function preferredPhotoFromList(photos, current) {
  const list = (Array.isArray(photos) ? photos : []).filter(isStorefrontCandidate);
  const currentSrc = typeof current === "string" ? current : current?.src || "";
  const currentPhoto =
    list.find((photo) => photo.src === currentSrc) ||
    (current && typeof current === "object" && current.src && isStorefrontCandidate(current)
      ? current
      : null) ||
    list[0] ||
    null;
  if (!currentPhoto) return null;
  if (isLandscapePhoto(currentPhoto)) return currentPhoto;
  return (
    list.find((photo) => photo.src !== currentPhoto.src && isLandscapePhoto(photo)) ||
    currentPhoto
  );
}

/** Backwards-compatible helper: the preferred photo object for a restaurant. */
export function preferredRestaurantPhoto(restaurant) {
  return storefrontPhotoFor(restaurant).photo;
}
