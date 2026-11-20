import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
// Leaflet is only needed once a visitor actually sees a map preview.
const DetailMap = lazy(() => import("./DetailMap.jsx"));
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
  return `Verified on Google · checked ${date.toLocaleDateString("en-GB", {
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

export default function RestaurantPage({
  restaurant,
  locations,
  branch,
  onClose,
  onShare,
  onToggleSave,
  onOpenMenuPage,
  onOpenLocations,
  isSaved = false,
  paused = false,
}) {
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
  const [slide, setSlide] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  const branchKey = branch?.placeId || branch?.name || "";

  useEffect(() => {
    setSlide(0);
    setLightbox(null);
  }, [branchKey]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const go = (delta) => {
    if (photoCount < 2) return;
    setSlide((current) => (current + delta + photoCount) % photoCount);
  };

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
      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && photoCount > 1) {
        const delta = event.key === "ArrowRight" ? 1 : -1;
        if (lightbox !== null) setLightbox((index) => (index + delta + photoCount) % photoCount);
        else setSlide((index) => (index + delta + photoCount) % photoCount);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, photoCount, lightbox, paused]);

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
  const isVerified = verificationStatus === "verified";
  const currentPhoto = photoItems[slide] || photoItems[0] || null;
  const current = currentPhoto?.src || "";
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
      try { document.execCommand("copy"); } catch { /* nothing left to try */ }
      document.body.removeChild(field);
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const at = (offset) => (photoCount ? (slide + offset) % photoCount : 0);
  const sideIndex = photoCount > 1 ? at(1) : null;
  const stripOffsets = [2, 3].filter((offset) => offset < photoCount);
  const stripIndexes = stripOffsets.map(at);
  const hiddenCount = Math.max(0, photoCount - 4);

  return (
    <div className="restaurant-page">
      {/* Sticky top bar */}
      <nav className="rpage-nav" aria-label="Restaurant page navigation">
        <button type="button" className="rpage-back" onClick={onClose}>
          {CHEVRON_LEFT_ICON}
          <span>All restaurants</span>
        </button>
        <span className="rpage-nav-name" aria-hidden="true">{restaurant.name}</span>
        <div className="rpage-nav-tools">
          <button
            type="button"
            className="detail-tool"
            aria-label={`Share ${restaurant.name}`}
            onClick={() => onShare?.(restaurant)}
          >
            {SHARE_ICON}
            <span className="detail-tool-text">Share</span>
          </button>
          <button
            type="button"
            className={`detail-tool ${isSaved ? "is-saved" : ""}`}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove ${restaurant.name} from saved places` : `Save ${restaurant.name}`}
            onClick={() => onToggleSave?.(restaurant.id)}
          >
            <HeartIcon filled={isSaved} />
            <span className="detail-tool-text">{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </nav>

      <div className="rpage-body">
        <header className="rpage-head">
          <span className="detail-logo">
            <RestaurantLogo restaurant={restaurant} />
          </span>
          <div className="detail-intro">
            <h1 id="rpage-title">{restaurant.name}</h1>
            <p className="detail-meta">
              {rating ? (
                <span className="detail-rating">
                  <StarIcon />
                  <strong>{rating}</strong>
                  {reviews ? <em>({reviews} reviews)</em> : null}
                </span>
              ) : null}
              <span>{restaurant.cuisine}</span>
              {locationLabel ? <span>{locationLabel}</span> : null}
              {isVerified && (
                <span className="detail-verified" title={checkedLabel(lastChecked)}>
                  <VerifiedIcon />
                  Verified on Google
                </span>
              )}
            </p>
          </div>
        </header>

          {/* Photo collage */}
          <section
            className={`detail-gallery ${photoCount === 1 ? "detail-gallery--1" : photoCount === 2 ? "detail-gallery--2" : ""} ${mainFrame.fit === "contain" ? "detail-gallery--portrait" : ""}`}
            aria-label={`Photos of ${restaurant.name}`}
          >
            <div className="detail-gallery-main">
              <button
                type="button"
                className="detail-photo-open"
                onClick={() => setLightbox(slide)}
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
                onClick={() => setLightbox(sideIndex)}
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
                    onClick={() => setLightbox(index)}
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

        <div className="rpage-layout">
          {/* The plan card: what a visitor does next, kept in view while
              they read on a wide screen, and right under the photos on a phone. */}
          <aside className="rpage-aside" aria-label="Plan your visit">
            <div className="detail-plan">
              <p className={`detail-plan-status ${openState === true ? "is-open" : openState === false ? "is-closed" : ""}`}>
                <span className="detail-plan-dot" aria-hidden="true" />
                {hoursLine}
              </p>

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
                    <span className="detail-btn-count">{restaurant.menuPhotos.length} pages</span>
                  </button>
                ) : (
                  <p className="detail-plan-note">No menu on file yet.</p>
                )}
              </div>

              {mapUrl || phone || instagram ? (
                <div className="detail-quick-actions">
                  {mapUrl ? (
                    <a className="detail-quick-btn" href={mapUrl} target="_blank" rel="noopener noreferrer">
                      <span className="detail-quick-icon">{PIN_ICON}</span>
                      <span>Directions</span>
                    </a>
                  ) : null}
                  {phone ? (
                    <a className="detail-quick-btn" href={callHref}>
                      <span className="detail-quick-icon">{PHONE_ICON}</span>
                      <span>Call</span>
                    </a>
                  ) : null}
                  {instagram ? (
                    <a className="detail-quick-btn" href={instagram.url} target="_blank" rel="noopener noreferrer">
                      <span className="detail-quick-icon">{INSTAGRAM_ICON}</span>
                      <span>Instagram</span>
                    </a>
                  ) : null}
                </div>
              ) : null}

              {offers.length > 0 && (
                <ul className="detail-offers">
                  {offers.map((offer) => (
                    <li key={offer.app}>
                      {offer.url ? (
                        <a href={offer.url} target="_blank" rel="noopener noreferrer">
                          <span className="detail-offers-app">{offer.app}</span>
                          <span className="detail-offers-text">{offer.text}</span>
                        </a>
                      ) : (
                        <span>
                          <span className="detail-offers-app">{offer.app}</span>
                          <span className="detail-offers-text">{offer.text}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <div className="rpage-main">
            <section className="detail-about" aria-labelledby="rpage-about">
              <h2 id="rpage-about">About</h2>
              {restaurant.description ? <p className="detail-desc">{restaurant.description}</p> : null}
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
            </section>

        {/* Info panels */}
        <section className="detail-info" aria-label="Restaurant information">
          <article className="detail-info-card">
            <div className="detail-info-head">
              <span className="detail-info-icon">{PIN_ICON}</span>
              <h2>Location</h2>
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
                  <Suspense fallback={<div className="detail-map detail-map--loading" aria-hidden="true" />}>
                    <DetailMap lat={Number(lat)} lng={Number(lng)} label={branch?.name || area || restaurant.name} />
                  </Suspense>
                ) : (
                  <p className="detail-map-note">
                    Map preview unavailable for this location.
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
              <h2>Opening Hours</h2>
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
              <h2>Contact</h2>
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
              <p className="detail-info-empty">No phone or Instagram on file.</p>
            ) : null}
          </article>
        </section>
          </div>
        </div>
      </div>

      {/* Full-size photo viewer */}
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
  );
}
