import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CHEVRON_LEFT_ICON, CHEVRON_RIGHT_ICON, CLOSE_ICON } from "./icons.jsx";
import RestaurantPhoto from "./RestaurantPhoto.jsx";
import useFocusTrap from "./useFocusTrap.js";
import RestaurantPageView from "./restaurant-page/RestaurantPageView.jsx";
import { cardData } from "./cards/cardData.js";
import {
  cuisineBadgesFor,
  getOfferDetails,
  instagramLabel,
  instagramUrl,
  isOpenNow,
  locationMapsUrl,
  mapsUrl,
  phoneHref,
  statusLabel,
  weekStatus,
} from "../data/restaurants.js";
import { frameForPhoto, isMenuPhotoSrc, storefrontPhotoFor } from "../data/photo-display.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GENERIC_AREA_LABELS = new Set(["restaurant", "restaurants", "cafe", "café", "grill", "grills"]);

function cleanArea(value) {
  const label = String(value || "").trim();
  return label && !GENERIC_AREA_LABELS.has(label.toLowerCase()) ? label : "";
}
const WEEK_READING_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function bahrainToday() {
  const now = new Date();
  const shifted = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
  return DAY_NAMES[shifted.getDay()];
}

function reviewCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return "";
  return count.toLocaleString("en-US");
}

function checkedLabel(value) {
  if (!value) return "Verified on Google";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Verified on Google";
  return `Verified on Google, checked ${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function photoCredits(photo) {
  if (!photo || photo.source !== "google") return [];
  if (Array.isArray(photo.credits) && photo.credits.length) {
    return photo.credits.filter((credit) => credit && credit.name);
  }
  if (photo.credit && photo.credit.name) return [photo.credit];
  return [{ name: "Google Maps", url: "https://maps.google.com/" }];
}

function firstCredit(photo) {
  return photoCredits(photo)[0] || null;
}

function WeekList({ week }) {
  const today = bahrainToday();
  const days = WEEK_READING_ORDER.filter((day) => week && week[day]);
  if (!days.length) return null;
  return (
    <ul className="detail-week-list">
      {days.map((day) => (
        <li key={day} className={day === today ? "is-today" : ""}>
          <span className="detail-week-day">{day}</span>
          <span className="detail-week-hours">{week[day]}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Works out everything the restaurant page shows (brand or a chosen branch),
 * with the same honest-data rules as the cards, then hands it to the view.
 */
export default function RestaurantPage({
  restaurant,
  locations,
  branch,
  onClose,
  onShare,
  onToggleSave,
  onOpenMenuPage,
  onOpenLocations,
  onOpenRestaurant,
  isSaved = false,
  paused = false,
}) {
  // Moving from one restaurant's page to another (from "More like this")
  // starts the new page at its top.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [restaurant.id]);
  const storefront = storefrontPhotoFor(restaurant);
  const photoItems = (() => {
    const menuPhotoSrcs = new Set((restaurant.menuPhotos || []).map((src) => String(src)));
    const isGalleryPhoto = (photo) => {
      if (!photo?.src) return false;
      const src = String(photo.src);
      if (menuPhotoSrcs.has(src)) return false;
      return !isMenuPhotoSrc(src);
    };
    const cached = Array.isArray(restaurant.photos) ? restaurant.photos.filter(isGalleryPhoto) : [];
    const brandPhotos = cached.length
      ? cached
      : restaurant.image
        ? [{ src: restaurant.image, source: "foodfind" }]
        : [];
    const branchPhotos = Array.isArray(branch?.photos) ? branch.photos.filter(isGalleryPhoto) : [];
    const all = branchPhotos.length ? [...branchPhotos, ...brandPhotos] : brandPhotos;
    const unique = all.filter(
      (photo, index, list) => photo?.src && list.findIndex((entry) => entry.src === photo.src) === index
    );
    const branchLandscape = branchPhotos.find((photo) => frameForPhoto(photo).fit === "cover");
    const preferred =
      branchLandscape ||
      (storefront.photo && unique.find((photo) => photo.src === storefront.photo.src)) ||
      unique[0] ||
      null;
    return preferred
      ? [preferred, ...unique.filter((photo) => photo.src !== preferred.src)]
      : unique;
  })();
  const photoCount = photoItems.length;
  const branchKey = branch?.placeId || branch?.name || "";
  // The open photo belongs to one branch: switching branch closes it without
  // an extra render, because a photo index from another branch is ignored.
  const [lightboxState, setLightboxState] = useState(null);
  const lightbox = lightboxState && lightboxState.key === branchKey ? lightboxState.index : null;
  const setLightbox = useCallback((value) => {
    setLightboxState((previous) => {
      const current = previous && previous.key === branchKey ? previous.index : null;
      const next = typeof value === "function" ? value(current) : value;
      return next === null ? null : { key: branchKey, index: next };
    });
  }, [branchKey]);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  // The photo viewer: focus goes to its close button, stays inside while it
  // is open, and returns to the photo that opened it.
  const lightboxRef = useRef(null);
  const lightboxCloseRef = useRef(null);
  const lightboxOpen = lightbox !== null;
  useFocusTrap(lightboxRef, { active: lightboxOpen, focusFirst: true, initialRef: lightboxCloseRef });
  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const opener = document.activeElement;
    return () => {
      if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus();
    };
  }, [lightboxOpen]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  useEffect(() => {
    // The menu viewer on top owns the keyboard while it is open.
    if (paused) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (lightbox !== null) setLightbox(null);
        else onClose();
        return;
      }
      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && lightbox !== null && photoCount > 1) {
        const delta = event.key === "ArrowRight" ? 1 : -1;
        setLightbox((index) => (index + delta + photoCount) % photoCount);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, photoCount, lightbox, paused, setLightbox]);

  const offers = getOfferDetails(restaurant.id);
  const foodTypes = cuisineBadgesFor(restaurant).slice(0, 3);
  const area = branch
    ? cleanArea(branch.area) || branch.name || ""
    : restaurant.area || restaurant.address;
  const address = branch ? branch.address || "" : restaurant.address;
  const city = branch?.city || restaurant.city || "Bahrain";
  const locationLabel = [area, city].filter(Boolean).join(", ");
  const phone = branch ? branch.phone || "" : restaurant.phone;
  const week = branch ? branch.hours : restaurant.openingHours;
  const businessStatus = branch?.businessStatus || restaurant.businessStatus || "";
  const businessStatusLabel = businessStatus === "CLOSED_PERMANENTLY"
    ? "Permanently closed"
    : businessStatus === "CLOSED_TEMPORARILY"
      ? "Temporarily closed"
      : businessStatus === "FUTURE_OPENING"
        ? "Opening soon"
        : "";
  const closed = Boolean(businessStatusLabel);
  const openState = closed ? false : week ? isOpenNow(week) : null;
  const hoursLine = closed
    ? businessStatusLabel
    : branch
      ? (week ? weekStatus(week) : branch.hours || branch.openNow || "Hours unavailable")
      : (week ? statusLabel(restaurant) : "") || restaurant.hours || restaurant.openNow || "Hours unavailable";
  const isMultiLocation = Array.isArray(locations) && locations.length > 1;
  const hasBranchPlaceId = Boolean(branch?.placeId);
  const hasBranchCoords =
    Boolean(branch) &&
    Number.isFinite(Number(branch.lat)) &&
    Number.isFinite(Number(branch.lng));
  const hasExactBrandCoords =
    restaurant.coordSource !== "area" &&
    Number.isFinite(Number(restaurant.lat)) &&
    Number.isFinite(Number(restaurant.lng));
  const canUseBranchLocation = Boolean(branch && (hasBranchPlaceId || hasBranchCoords));
  const canUseBrandLocation =
    !isMultiLocation && (Boolean(restaurant.mapsPlaceId) || hasExactBrandCoords);
  const mapUrl = branch
    ? canUseBranchLocation ? locationMapsUrl(restaurant, branch) : ""
    : isMultiLocation ? "" : canUseBrandLocation ? mapsUrl(restaurant) : "";
  const callHref = phoneHref(phone);
  const instagram = (restaurant.instagram || "").trim() ? {
    url: instagramUrl(restaurant),
    label: instagramLabel(restaurant),
  } : null;
  const lat = branch ? branch.lat : restaurant.lat;
  const lng = branch ? branch.lng : restaurant.lng;
  const hasCoords = branch ? hasBranchCoords : !isMultiLocation && hasExactBrandCoords;
  const rating = branch ? branch.rating : restaurant.rating;
  const reviews = reviewCount(branch ? branch.reviews : restaurant.reviews);
  const menuUrl = branch?.menuUrl || restaurant.menuUrl;
  const verificationStatus = branch
    ? branch.verification?.status
    : restaurant.verification?.status;
  const lastChecked = branch ? branch.lastChecked : restaurant.verification?.lastChecked;
  const leadPhoto = photoItems[0] || null;
  const leadFrame =
    leadPhoto && storefront.photo && leadPhoto.src === storefront.photo.src
      ? { fit: storefront.fit, focus: storefront.focus }
      : frameForPhoto(leadPhoto);
  const lightboxCredit = lightbox !== null ? firstCredit(photoItems[lightbox]) : null;
  const menuPages = (restaurant.menuPhotos || []).length;
  const hasWeek = Boolean(week && WEEK_READING_ORDER.some((day) => week[day]));

  const copyPhone = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      const field = document.createElement("textarea");
      field.value = phone;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try { document.execCommand("copy"); } catch { /* nothing left to try */ }
      document.body.removeChild(field);
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const lightboxView = lightbox !== null && photoItems[lightbox] && (
    <div
      ref={lightboxRef}
      className="detail-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={() => setLightbox(null)}
    >
      <button
        type="button"
        ref={lightboxCloseRef}
        className="detail-lightbox-close"
        onClick={() => setLightbox(null)}
        aria-label="Close photo viewer"
      >
        {CLOSE_ICON}
      </button>
      {photoCount > 1 && (
        <>
          <button
            type="button"
            className="detail-lightbox-arrow detail-lightbox-arrow--prev"
            onClick={(event) => { event.stopPropagation(); setLightbox((lightbox - 1 + photoCount) % photoCount); }}
            aria-label="Previous photo"
          >
            {CHEVRON_LEFT_ICON}
          </button>
          <button
            type="button"
            className="detail-lightbox-arrow detail-lightbox-arrow--next"
            onClick={(event) => { event.stopPropagation(); setLightbox((lightbox + 1) % photoCount); }}
            aria-label="Next photo"
          >
            {CHEVRON_RIGHT_ICON}
          </button>
        </>
      )}
      <RestaurantPhoto
        photo={photoItems[lightbox]}
        alt={`${restaurant.name}, photo ${lightbox + 1} of ${photoCount}`}
        frameClassName="detail-lightbox-photo"
        maxUpscale={1.6}
        loading="eager"
        fallback={restaurant.fallbackImage}
        fallbackFinal={restaurant.fallbackFinal}
        onClick={(event) => event.stopPropagation()}
      />
      {lightboxCredit && (
        <a
          className="detail-lightbox-credit"
          href={lightboxCredit.url || "https://maps.google.com/"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Photo by {lightboxCredit.name} on Google Maps
        </a>
      )}
      <span className="detail-lightbox-counter">{lightbox + 1} / {photoCount}</span>
    </div>
  );

  return (
    <RestaurantPageView
      d={{
        restaurant,
        name: restaurant.name,
        rating: rating ? Number(rating).toFixed(1) : "",
        reviews,
        isVerified: verificationStatus === "verified",
        verifiedTitle: checkedLabel(lastChecked),
        // The same check the cards use: a generated stand-in is never shown.
        description: cardData(restaurant).description,
        foodTypes,
        locationLabel,
        address: address && address !== area ? address : locationLabel || restaurant.address,
        area,
        hoursLine,
        openState,
        weekList: hasWeek ? <WeekList week={week} /> : null,
        phone,
        callHref,
        instagram,
        mapUrl,
        branchMapMissing: Boolean(branch) && !mapUrl,
        menuUrl,
        menuPages,
        offers,
        photoItems,
        photoCount,
        photoFocus: leadFrame.focus,
        credit: firstCredit(leadPhoto),
        hasCoords,
        lat,
        lng,
        isMultiLocation,
        onOpenLocations,
        onOpenRestaurant,
        onOpenMenuPage,
        onClose,
        onShare,
        onToggleSave,
        isSaved,
        copyPhone,
        copied,
        setLightbox,
        lightboxView,
      }}
    />
  );
}
