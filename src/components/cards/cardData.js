import {
  cuisineBadgesFor, getOfferDetails, hasValidHours, hoursLabel, isOpenNow, locationCount, mapsUrl,
  OFFER_APP_ICONS, phoneHref, statusLabel,
} from "../../data/restaurants.js";
import { isMenuPhotoSrc, storefrontPhotoFor } from "../../data/photo-display.js";

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Generated stand-ins ("Ghancha — Cafe in Bahrain.") only repeat the name,
// cuisine and area, so they are hidden rather than shown as real copy.
function realDescription(restaurant) {
  const text = String(restaurant.description || "").trim();
  if (!text) return "";
  const template = new RegExp(`^${escapeRe(restaurant.name)}\\s+\\u2014\\s+[^.]+\\sin\\s[^.]+\\.$`);
  return template.test(text) ? "" : text;
}

// Today's state from researched hours only.
function openingState(restaurant) {
  if (restaurant.businessStatus === "CLOSED_PERMANENTLY") return { tone: "closed", text: "Permanently closed" };
  if (restaurant.businessStatus === "CLOSED_TEMPORARILY") return { tone: "closed", text: "Temporarily closed" };
  const label = statusLabel(restaurant);
  const open = hasValidHours(restaurant) ? isOpenNow(restaurant.openingHours) : null;
  if (open === true) {
    const until = label.match(/^Open till (.+)$/i);
    return { tone: "open", text: "Open now", detail: until ? `closes ${until[1]}` : "" };
  }
  if (open === false) {
    const from = label.match(/^Opens (.+)$/i);
    return { tone: "closed", text: "Closed", detail: from ? `opens ${from[1]}` : "" };
  }
  if (label && label !== "Hours unavailable") return { tone: "unknown", text: "Today", detail: label };
  return { tone: "unknown", text: "Hours unavailable" };
}

function locationLabel(restaurant) {
  if (restaurant.area) return restaurant.area;
  if (restaurant.shortAddress) return restaurant.shortAddress;
  const parts = String(restaurant.address || "").split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return `${parts[0]}, ${parts[parts.length - 1]}`;
  return parts[0] || restaurant.city || "";
}

// Every real photo of the place: storefront first, menu pages left out.
function galleryPhotos(restaurant, storefront) {
  const menu = new Set((restaurant.menuPhotos || []).map(String));
  const keep = (photo) => photo?.src && !menu.has(String(photo.src)) && !isMenuPhotoSrc(photo.src);
  const listed = Array.isArray(restaurant.photos) ? restaurant.photos.filter(keep) : [];
  const all = listed.length ? listed : restaurant.image ? [{ src: restaurant.image }] : [];
  const lead = storefront.photo && all.find((photo) => photo.src === storefront.photo.src);
  const ordered = lead ? [lead, ...all.filter((photo) => photo !== lead)] : all;
  return ordered.filter((photo, index, list) => list.findIndex((other) => other.src === photo.src) === index);
}

/**
 * Facilities only appear when a researched record says so. No restaurant
 * carries this data yet, so the row stays hidden until it is sourced.
 */
const FACILITIES = [
  ["parking", "Parking"],
  ["outdoorSeating", "Outdoor seating"],
  ["familySeating", "Family seating"],
];
function verifiedFacilities(restaurant) {
  const facts = restaurant.facilities;
  if (!facts || facts.source == null) return [];
  return FACILITIES.filter(([key]) => facts[key] === true).map(([, label]) => label);
}
function verifiedPrice(restaurant) {
  // priceRange defaults to "$$" when nothing was researched, so it only
  // counts when a source is recorded alongside it.
  return restaurant.priceSource ? restaurant.priceRange || "" : "";
}

const reviewCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count.toLocaleString("en-US") : "";
};

/** Everything a restaurant card can honestly show, worked out once. */
export function cardData(restaurant) {
  const storefront = storefrontPhotoFor(restaurant);
  const photo = storefront.photo || { src: restaurant.image, width: restaurant.imageWidth, height: restaurant.imageHeight };
  const area = locationLabel(restaurant);
  const phones = String(restaurant.phone || "").split(/\s*(?:\/|·|•)\s*/).filter(Boolean);
  const callHref = restaurant.phone ? phoneHref(restaurant.phone) : "";
  const directionsUrl = mapsUrl(restaurant);
  return {
    photo,
    focus: storefront.focus,
    fallbacks: [restaurant.image, ...(restaurant.imageFallbacks || [])].filter(
      (value, position, all) => value && value !== photo.src && all.indexOf(value) === position
    ),
    gallery: galleryPhotos(restaurant, storefront),
    offers: getOfferDetails(restaurant.id).map((offer) => ({ ...offer, icon: OFFER_APP_ICONS[offer.app] || "" })),
    tags: cuisineBadgesFor(restaurant),
    description: realDescription(restaurant),
    rating: restaurant.rating ? Number(restaurant.rating).toFixed(1) : "",
    reviews: reviewCount(restaurant.reviews),
    isVerified: restaurant.verification?.status === "verified",
    branches: locationCount(restaurant),
    area,
    hours: openingState(restaurant),
    hoursDetail: hoursLabel(restaurant),
    phone: callHref ? phones[0] : "",
    morePhones: callHref ? phones.length - 1 : 0,
    callHref: callHref || "",
    menuPages: restaurant.menuPhotos.length,
    menuUrl: restaurant.menuUrl || "",
    facilities: verifiedFacilities(restaurant),
    price: verifiedPrice(restaurant),
    directionsUrl,
    // No exact listing on file: an honest Maps search instead of a pin.
    searchUrl: directionsUrl
      ? ""
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([restaurant.name, area, "Bahrain"].filter(Boolean).join(" "))}`,
  };
}
