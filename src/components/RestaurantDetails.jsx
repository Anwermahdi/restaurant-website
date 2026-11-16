import { useEffect, useRef, useState } from "react";
import {
  ARROW_ICON,
  CHECK_ICON,
  CHEVRON_LEFT_ICON,
  CHEVRON_RIGHT_ICON,
  CLOCK_ICON,
  CLOSE_ICON,
  COPY_ICON,
  HeartIcon,
  INSTAGRAM_ICON,
  MAP_ICON,
  MenuIcon,
  PHONE_ICON,
  PHOTO_ICON,
  PIN_ICON,
  SHARE_ICON,
  StarIcon,
  VerifiedIcon,
} from "./icons.jsx";
import CuisineBadge from "./CuisineBadge.jsx";
import DetailMap from "./DetailMap.jsx";
import RestaurantLogo from "./RestaurantLogo.jsx";
import RestaurantPhoto from "./RestaurantPhoto.jsx";
import {
  cuisineBadgesFor,
  getOfferDetails,
  instagramLabel,
  instagramUrl,
  isOpenNow,
  locationMapsUrl,
  mapsUrl,
  offerBadgeText,
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
// The week reads Monday first, the way opening-hours boards do.
const WEEK_READING_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Today's day name in Bahrain, so the highlight matches the visitor's day. */
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

/** "Verified on Google · checked 24 Oct 2026" for the title tooltip. */
function checkedLabel(value) {
  if (!value) return "Verified on Google";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Verified on Google";
  return `Verified on Google · checked ${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

/**
 * Google's terms require showing who took each Places photo. Foodfind photos
 * have no credit and return an empty list.
 */
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

/** The seven-day list, Monday first, with today marked. */
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
 * The restaurant details popup.
 *
 * Everything here comes from the restaurant's own record. A section only
 * appears when the data for it is real: no rating means no rating, no hours
 * means no hours, no Instagram handle means no Instagram button. Photos are
 * the restaurant's own images plus its menu pages, never stock.
 */
export default function RestaurantDetails({
  restaurant,
  locations,
  branch,
  onClose,
  onShare,
  onToggleSave,
  onOpenMenuPage,
  onOpenLocations,
  isSaved = false,
}) {
  // Photo data comes from src/data/restaurants.js: the Foodfind photo first,
  // then verified Google Places photos. Menu pages live in their own viewer and
  // are kept out of the gallery, so the collage never repeats the menu. The
  // same storefront resolver as the cards leads the gallery with the approved
  // landscape photo; a portrait stays whole until a replacement is approved.
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
    // Branch photos (when Google has them) lead the gallery so switching
    // location never shows another branch first.
    const branchPhotos = Array.isArray(branch?.photos) ? branch.photos.filter(isGalleryPhoto) : [];
    const all = branchPhotos.length ? [...branchPhotos, ...brandPhotos] : brandPhotos;
    // One photo, one frame: never show the same image twice in the collage.
    const unique = all.filter(
      (photo, index, list) => photo?.src && list.findIndex((entry) => entry.src === photo.src) === index
    );
    // A branch's own landscape photo leads that branch; otherwise the brand
    // storefront choice leads. Portrait stays whole until replaced.
    const branchLandscape = branchPhotos.find(
      (photo) => frameForPhoto(photo).fit === "cover"
    );
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
  const [slide, setSlide] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const copyTimer = useRef(null);
  const branchKey = branch?.placeId || branch?.name || "";

  useEffect(() => {
    // Focus the dialog itself, not the close button: a button focused by
    // script would show a keyboard ring the visitor never asked for.
    dialogRef.current?.focus();
  }, []);

  // A different branch is a different gallery; start it at its own first photo
  // instead of leaving the previous branch's slide index in place.
  useEffect(() => {
    setSlide(0);
    setLightbox(null);
  }, [branchKey]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const go = (delta) => {
    if (photoCount < 2) return;
    setSlide((current) => (current + delta + photoCount) % photoCount);
  };

  // Escape closes the viewer first, then the popup. Arrows browse whichever
  // one is on screen. Tab stays inside the dialog.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (lightbox !== null) setLightbox(null);
        else onClose();
        return;
      }
      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && photoCount > 1) {
        const delta = event.key === "ArrowRight" ? 1 : -1;
        if (lightbox !== null) setLightbox((index) => (index + delta + photoCount) % photoCount);
        else setSlide((index) => (index + delta + photoCount) % photoCount);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, photoCount, lightbox]);

  const offers = getOfferDetails(restaurant.id);
  const foodTypes = cuisineBadgesFor(restaurant).slice(0, 3);
  // When a branch is selected, only that branch's data is shown. Falling back
  // to the brand's phone/address/hours would put one location's details on
  // another, which is worse than showing that the fact is unavailable.
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
  // "All locations" must not borrow one branch's pin or listing.
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
  // A neighbourhood centre is not a restaurant pin. Only exact stored pins
  // may drive the map marker, and "All locations" never borrows one branch's pin.
  const hasCoords = branch ? hasBranchCoords : !isMultiLocation && hasExactBrandCoords;
  // A branch's rating belongs to that branch. Do not reuse the brand rating.
  const rating = branch ? branch.rating : restaurant.rating;
  const reviews = reviewCount(branch ? branch.reviews : restaurant.reviews);
  const menuUrl = branch?.menuUrl || restaurant.menuUrl;
  const verificationStatus = branch
    ? branch.verification?.status
    : restaurant.verification?.status;
  const lastChecked = branch ? branch.lastChecked : restaurant.verification?.lastChecked;
  const isVerified = verificationStatus === "verified";
  const currentPhoto = photoItems[slide] || photoItems[0] || null;
  const current = currentPhoto?.src || "";
  // The main frame uses the approved focal point for the storefront; other
  // slides (branch photos) get the neutral bounded crop.
  const mainFrame =
    currentPhoto && storefront.photo && currentPhoto.src === storefront.photo.src
      ? { fit: storefront.fit, focus: storefront.focus }
      : frameForPhoto(currentPhoto);
  const primaryCredit = firstCredit(currentPhoto);
  const lightboxCredit = lightbox !== null ? firstCredit(photoItems[lightbox]) : null;
  const canOpenMenuPhotos = (restaurant.menuPhotos || []).length > 0;

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
      try {
        document.execCommand("copy");
      } catch {
        // Clipboard access can be refused; the number is still on screen.
      }
      document.body.removeChild(field);
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  // Which photo lands in each frame of the collage. They shift with the
  // arrows, so browsing the big picture also changes the strip beside it.
  const at = (offset) => (photoCount ? (slide + offset) % photoCount : 0);
  const sideIndex = photoCount > 1 ? at(1) : null;
  const stripOffsets = [2, 3].filter((offset) => offset < photoCount);
  const stripIndexes = stripOffsets.map(at);
  const hiddenCount = Math.max(0, photoCount - 4);

  const openLightbox = (index) => setLightbox(index);
  // A single portrait storefront would otherwise float in a 1200px-wide band.
  // In that case the photo and the identity share one hero row, the photo
  // column sized to its own aspect ratio so nothing is cropped or letterboxed.
  const heroRatio = currentPhoto
    ? Number((currentPhoto.width || 0) / (currentPhoto.height || 0)) || 0
    : 0;
  const splitHero = photoCount === 1 && mainFrame.fit === "contain" && heroRatio > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-tools">
          <button
            type="button"
            className={`detail-tool ${isSaved ? "is-saved" : ""}`}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove ${restaurant.name} from saved places` : `Save ${restaurant.name}`}
            onClick={() => onToggleSave?.(restaurant.id)}
          >
            <HeartIcon filled={isSaved} />
          </button>
          <button
            type="button"
            className="detail-tool"
            aria-label={`Share ${restaurant.name}`}
            onClick={() => onShare?.(restaurant)}
          >
            {SHARE_ICON}
          </button>
          <button
            type="button"
            className="detail-tool detail-tool--close"
            onClick={onClose}
            aria-label="Close details"
            ref={closeRef}
          >
            {CLOSE_ICON}
          </button>
        </div>

        <div className="detail-scroll">
          <div
            className={`detail-hero ${splitHero ? "detail-hero--portrait" : ""}`}
            style={splitHero ? { "--photo-ratio": heroRatio } : undefined}
          >
          {/* ---- the photo collage ---- */}
          <section
            className={`detail-gallery ${photoCount === 1 ? "detail-gallery--1" : photoCount === 2 ? "detail-gallery--2" : ""} ${mainFrame.fit === "contain" ? "detail-gallery--portrait" : ""}`}
            aria-label={`Photos of ${restaurant.name}`}
          >
            <div className="detail-gallery-main">
              <button
                type="button"
                className="detail-photo-open"
                onClick={() => openLightbox(slide)}
                aria-label={`View photo ${slide + 1} of ${photoCount} full size`}
              >
                {current ? (
                  <RestaurantPhoto
                    key={current}
                    photo={currentPhoto}
                    className="detail-photo"
                    alt={`${restaurant.name} — photo ${slide + 1} of ${photoCount}`}
                    fit={mainFrame.fit}
                    focus={mainFrame.focus}
                    loading="eager"
                    fetchPriority="high"
                    fallback={restaurant.fallbackImage}
                    fallbackFinal={restaurant.fallbackFinal}
                  />
                ) : null}
              </button>

              <div className="detail-gallery-labels">
                {photoCount > 0 && (
                  <span className="detail-counter">
                    {PHOTO_ICON}
                    {slide + 1} / {photoCount}
                  </span>
                )}
                {offers.length > 0 && (
                  <span className="detail-offer-flag">
                    <span aria-hidden="true">%</span>
                    {offerBadgeText(offers[0].text) || "Offers"}
                  </span>
                )}
              </div>

              {photoCount > 1 && (
                <>
                  <button type="button" className="detail-arrow detail-arrow--prev" onClick={() => go(-1)} aria-label="Previous photo">
                    {CHEVRON_LEFT_ICON}
                  </button>
                  <button type="button" className="detail-arrow detail-arrow--next" onClick={() => go(1)} aria-label="Next photo">
                    {CHEVRON_RIGHT_ICON}
                  </button>
                </>
              )}

              {primaryCredit && (
                <a
                  className="detail-photo-credit"
                  href={primaryCredit.url || "https://maps.google.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  title={`Photo by ${primaryCredit.name} on Google Maps`}
                >
                  Photo: {primaryCredit.name} · Google
                </a>
              )}
            </div>

            {sideIndex !== null && (
              <button
                type="button"
                className="detail-shot detail-shot--side"
                onClick={() => openLightbox(sideIndex)}
                aria-label={`View photo ${sideIndex + 1} full size`}
              >
                <RestaurantPhoto
                  photo={photoItems[sideIndex]}
                  alt=""
                  loading="lazy"
                  fallback={restaurant.fallbackImage}
                  fallbackFinal={restaurant.fallbackFinal}
                />
              </button>
            )}

            {stripIndexes.length > 0 && (
              <div className="detail-shot-strip">
                {stripIndexes.map((index, position) => (
                  <button
                    key={`${photoItems[index]?.src || index}-${position}`}
                    type="button"
                    className="detail-shot"
                    onClick={() => openLightbox(index)}
                    aria-label={`View photo ${index + 1} full size`}
                  >
                    <RestaurantPhoto
                      photo={photoItems[index]}
                      alt=""
                      loading="lazy"
                      fallback={restaurant.fallbackImage}
                      fallbackFinal={restaurant.fallbackFinal}
                    />
                    {hiddenCount > 0 && position === stripIndexes.length - 1 && (
                      <span className="detail-shot-more">
                        {PHOTO_ICON}
                        <span>+{hiddenCount} photos</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ---- the identity ---- */}
          <div className="detail-overview">
            <span className="detail-logo">
              <RestaurantLogo restaurant={restaurant} />
            </span>

            <div className="detail-intro">
              <h2 id="detail-title">
                {restaurant.name}
                {isVerified && (
                  <span className="detail-verified" title={checkedLabel(lastChecked)}>
                    <VerifiedIcon />
                    <span className="sr-only">{checkedLabel(lastChecked)}</span>
                  </span>
                )}
              </h2>

              <div className="detail-meta">
                {rating ? (
                  <span className="detail-rating">
                    <StarIcon />
                    <strong>{rating}</strong>
                    {reviews ? <em>({reviews} reviews)</em> : null}
                  </span>
                ) : null}
              </div>

              {foodTypes.length ? (
                <div className="detail-tags">
                  {foodTypes.map((tag) => (
                    <CuisineBadge key={tag} label={tag} />
                  ))}
                </div>
              ) : null}

              {businessStatusLabel ? (
                <p className={`detail-business-status ${businessStatus === "CLOSED_PERMANENTLY" ? "is-closed" : ""}`}>
                  {businessStatusLabel}
                </p>
              ) : null}
            </div>

            {restaurant.description ? <p className="detail-desc">{restaurant.description}</p> : null}

            {/* ---- the main action ---- */}
            <div className="detail-actions">
              {menuUrl ? (
                <a className="detail-btn detail-btn--primary" href={menuUrl} target="_blank" rel="noopener noreferrer">
                  <MenuIcon />
                  <span>View menu</span>
                  <span className="detail-btn-arrow" aria-hidden="true">{ARROW_ICON}</span>
                </a>
              ) : canOpenMenuPhotos ? (
                <button
                  type="button"
                  className="detail-btn detail-btn--primary"
                  onClick={() => onOpenMenuPage?.(restaurant, 0)}
                >
                  <MenuIcon />
                  <span>View menu</span>
                  <span className="detail-btn-arrow" aria-hidden="true">{ARROW_ICON}</span>
                </button>
              ) : null}
            </div>
          </div>
          </div>

          {/* ---- the information panels ---- */}
          <section className="detail-info" aria-label="Restaurant information">
            <article className="detail-info-card">
              <div className="detail-info-head">
                <span className="detail-info-icon">{PIN_ICON}</span>
                <h3>Location</h3>
              </div>

              <div className="detail-info-body">
                <strong className="detail-info-place">{locationLabel || restaurant.address}</strong>
                {address && address !== area ? <span className="detail-info-address">{address}</span> : null}
                {branch && !mapUrl ? (
                  <small className="detail-info-note">Map link not available for this branch.</small>
                ) : null}
              </div>

              {hasCoords || mapUrl ? (
                <div className="detail-info-map">
                  {hasCoords ? (
                    <DetailMap lat={Number(lat)} lng={Number(lng)} label={branch?.name || area || restaurant.name} />
                  ) : (
                    <p className="detail-map-note">
                      A map preview is unavailable until this location&apos;s exact coordinates are verified.
                    </p>
                  )}
                  {mapUrl ? (
                    <a className="detail-map-btn" href={mapUrl} target="_blank" rel="noopener noreferrer">
                      {MAP_ICON}
                      <span>Open in Google Maps</span>
                      {ARROW_ICON}
                    </a>
                  ) : null}
                </div>
              ) : null}

              {isMultiLocation && onOpenLocations ? (
                <button
                  type="button"
                  className="detail-branch-row"
                  onClick={(event) => onOpenLocations(restaurant, event.currentTarget)}
                >
                  <span className="detail-branch-icon">{PIN_ICON}</span>
                  <span className="detail-branch-text">
                    <strong>Additional Locations</strong>
                    <small>View all branches</small>
                  </span>
                  {CHEVRON_RIGHT_ICON}
                </button>
              ) : null}
            </article>

            <article className="detail-info-card">
              <div className="detail-info-head">
                <span className={`detail-info-icon ${openState ? "is-open" : ""}`}>{CLOCK_ICON}</span>
                <h3>Opening Hours</h3>
                {openState !== null ? (
                  <span className={`detail-open-badge ${openState ? "is-open" : "is-closed"}`}>
                    {openState ? "Open now" : "Closed"}
                  </span>
                ) : null}
              </div>
              {week && WEEK_READING_ORDER.some((day) => week[day]) ? (
                <WeekList week={week} />
              ) : (
                <div className="detail-hours-empty">
                  <span className="detail-hours-empty-icon" aria-hidden="true">{CLOCK_ICON}</span>
                  <p className="detail-hours-empty-line">{hoursLine || "Hours unavailable"}</p>
                  </div>
              )}
            </article>

            <article className="detail-info-card">
              <div className="detail-info-head">
                <span className="detail-info-icon">{PHONE_ICON}</span>
                <h3>Contact</h3>
              </div>

              <div className="detail-contact-list">
                {phone ? (
                  <div className="detail-contact-row">
                    <span className="detail-contact-icon">{PHONE_ICON}</span>
                    <div className="detail-contact-text">
                      <span className="detail-contact-label">Phone</span>
                      <a href={callHref}>{phone}</a>
                    </div>
                    <button
                      type="button"
                      className={`detail-copy ${copied ? "is-copied" : ""}`}
                      onClick={copyPhone}
                      aria-label={copied ? "Phone number copied" : "Copy phone number"}
                    >
                      {copied ? CHECK_ICON : COPY_ICON}
                    </button>
                  </div>
                ) : null}

                {instagram ? (
                  <a className="detail-contact-row" href={instagram.url} target="_blank" rel="noopener noreferrer">
                    <span className="detail-contact-icon">{INSTAGRAM_ICON}</span>
                    <div className="detail-contact-text">
                      <span className="detail-contact-label">Instagram</span>
                      <strong>{instagram.label}</strong>
                    </div>
                    {ARROW_ICON}
                  </a>
                ) : null}
              </div>

              {!phone && !instagram ? (
                <p className="detail-info-empty">Contact details are not available yet.</p>
              ) : null}
            </article>
          </section>
        </div>

        {/* ---- full-size photo viewer ---- */}
        {lightbox !== null && photoItems[lightbox] && (
          <div
            className="detail-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="detail-lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="Close photo viewer"
            >
              ✕
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
              alt={`${restaurant.name} — photo ${lightbox + 1} of ${photoCount}`}
              frameClassName="detail-lightbox-photo"
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
                Photo: {lightboxCredit.name} · Google Maps
              </a>
            )}
            <span className="detail-lightbox-counter">{lightbox + 1} / {photoCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
