/**
 * The restaurant page: the "signboard" design. The storefront photo fills the
 * left half and the name sits on a Bahrain-red panel beside it, like the
 * shop's own sign. On a phone the photo sits on top of the panel and one bar
 * at the bottom keeps the menu, directions and call in reach.
 *
 * Every value arrives from RestaurantPage, already worked out with the honest-
 * data rules. Anything missing is left out, never filled in.
 */
import { Suspense, lazy } from "react";
import {
  CHECK_ICON,
  CHEVRON_LEFT_ICON,
  CHEVRON_RIGHT_ICON,
  COPY_ICON,
  HeartIcon,
  INSTAGRAM_ICON,
  MenuIcon,
  PHONE_ICON,
  PHOTO_ICON,
  PIN_ICON,
  SHARE_ICON,
  StarIcon,
  VerifiedIcon,
} from "../icons.jsx";
import RestaurantLogo from "../RestaurantLogo.jsx";
import RestaurantPhoto from "../RestaurantPhoto.jsx";
import MoreLikeThis from "./MoreLikeThis.jsx";
import { OFFER_APP_ICONS } from "../../data/restaurants.js";
import "./restaurant-page.css";

// Leaflet is only needed once a visitor actually reaches the map.
const DetailMap = lazy(() => import("../DetailMap.jsx"));

function TopBar({ d }) {
  return (
    <nav className="rp-bar" aria-label="Restaurant page navigation">
      <button type="button" className="rp-tool rp-back" onClick={d.onClose}>
        {CHEVRON_LEFT_ICON}
        <span>All restaurants</span>
      </button>
      <div className="rp-bar-tools">
        <button type="button" className="rp-tool" onClick={() => d.onShare?.(d.restaurant)} aria-label={`Share ${d.name}`}>
          {SHARE_ICON}
          <span className="rp-hide-sm">Share</span>
        </button>
        <button
          type="button"
          className={`rp-tool ${d.isSaved ? "is-saved" : ""}`}
          aria-pressed={d.isSaved}
          onClick={() => d.onToggleSave?.(d.restaurant.id)}
          aria-label={d.isSaved ? `Remove ${d.name} from saved places` : `Save ${d.name}`}
        >
          <HeartIcon filled={d.isSaved} />
          <span className="rp-hide-sm">{d.isSaved ? "Saved" : "Save"}</span>
        </button>
      </div>
    </nav>
  );
}

function Status({ d }) {
  const tone = d.openState === true ? "open" : d.openState === false ? "closed" : "unknown";
  return (
    <p className={`rp-status is-${tone}`}>
      <span className="rp-dot" aria-hidden="true" />
      {d.hoursLine}
    </p>
  );
}

function MenuButton({ d, className }) {
  if (d.menuUrl) {
    return (
      <a className={className} href={d.menuUrl} target="_blank" rel="noopener noreferrer">
        <MenuIcon />
        <span>View menu</span>
      </a>
    );
  }
  if (d.menuPages) {
    return (
      <button type="button" className={className} onClick={() => d.onOpenMenuPage?.(d.restaurant, 0)}>
        <MenuIcon />
        <span>View menu</span>
        <span className="rp-btn-note">{d.menuPages} pages</span>
      </button>
    );
  }
  return null;
}

function Offers({ d }) {
  if (!d.offers.length) return null;
  return (
    <ul className="rp-offers" aria-label="Offers">
      {d.offers.map((offer) => {
        const body = (
          <>
            {OFFER_APP_ICONS[offer.app] ? <img src={OFFER_APP_ICONS[offer.app]} alt="" width="20" height="20" /> : null}
            <span className="rp-offer-text">
              <strong>{offer.text}</strong>
              <span>with {offer.app}</span>
            </span>
          </>
        );
        return (
          <li key={offer.app}>
            {offer.url ? <a href={offer.url} target="_blank" rel="noopener noreferrer">{body}</a> : <span>{body}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function Thumbs({ d }) {
  const rest = d.photoItems.slice(1);
  if (!rest.length) return null;
  return (
    <div className="rp-thumbs">
      {rest.slice(0, 4).map((photo, i) => (
        <button
          key={photo.src}
          type="button"
          className="rp-thumb"
          onClick={() => d.setLightbox(i + 1)}
          aria-label={`View photo ${i + 2} of ${d.photoCount}`}
        >
          <RestaurantPhoto photo={photo} alt="" loading="lazy" fit="crop" fallback={d.restaurant.fallbackImage} fallbackFinal={d.restaurant.fallbackFinal} />
          {i === 3 && rest.length > 4 ? <span className="rp-thumb-more">+{rest.length - 4}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Sections({ d }) {
  const contact = d.phone || d.instagram;
  return (
    <div className="rp-sections">
      {d.description || d.foodTypes.length ? (
        <section className="rp-section rp-about" aria-labelledby="rp-about">
          <h2 id="rp-about">About</h2>
          {d.description ? <p className="rp-desc">{d.description}</p> : null}
          {d.foodTypes.length ? (
            <ul className="rp-tags">{d.foodTypes.map((tag) => <li key={tag}>{tag}</li>)}</ul>
          ) : null}
        </section>
      ) : null}

      <section className="rp-section rp-hours" aria-labelledby="rp-hours">
        <h2 id="rp-hours">Opening hours</h2>
        {d.weekList || (
          <p className="rp-empty">
            We don’t have this place’s hours yet.
            {d.phone && d.instagram ? " Call or check Instagram before you go." : d.phone ? " Call before you go." : d.instagram ? " Check Instagram before you go." : ""}
          </p>
        )}
      </section>

      <section className="rp-section rp-where" aria-labelledby="rp-where">
        <h2 id="rp-where">Where to find it</h2>
        <p className="rp-address">{d.address}</p>
        {d.hasCoords ? (
          <div className="rp-map">
            <Suspense fallback={<div className="detail-map" aria-hidden="true" />}>
              <DetailMap lat={Number(d.lat)} lng={Number(d.lng)} label={d.area || d.name} />
            </Suspense>
          </div>
        ) : null}
        {d.branchMapMissing ? <p className="rp-empty">There’s no map link for this branch yet.</p> : null}
        <div className="rp-row-actions">
          {d.mapUrl ? (
            <a className="rp-btn rp-btn--ghost" href={d.mapUrl} target="_blank" rel="noopener noreferrer">{PIN_ICON}<span>Open in Google Maps</span></a>
          ) : null}
          {d.isMultiLocation && d.onOpenLocations ? (
            <button type="button" className="rp-btn rp-btn--ghost" onClick={(e) => d.onOpenLocations(d.restaurant, e.currentTarget)}>
              <span>See all branches</span>{CHEVRON_RIGHT_ICON}
            </button>
          ) : null}
        </div>
      </section>

      {contact ? (
        <section className="rp-section rp-contact" aria-labelledby="rp-contact">
          <h2 id="rp-contact">Contact</h2>
          <ul className="rp-contact-list">
            {d.phone ? (
              <li>
                <a href={d.callHref}>{PHONE_ICON}<span>{d.phone}</span></a>
                <button type="button" className="rp-tool rp-copy" onClick={d.copyPhone} aria-label={d.copied ? "Phone number copied" : "Copy phone number"}>
                  {d.copied ? CHECK_ICON : COPY_ICON}
                </button>
              </li>
            ) : null}
            {d.instagram ? (
              <li><a href={d.instagram.url} target="_blank" rel="noopener noreferrer">{INSTAGRAM_ICON}<span>{d.instagram.label}</span></a></li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Phone only: the one bar that keeps the next step in reach. */
function PhoneBar({ d }) {
  const hasMenu = Boolean(d.menuUrl || d.menuPages);
  if (!hasMenu && !d.mapUrl && !d.phone) return null;
  return (
    <div className="rp-phonebar">
      {hasMenu ? <MenuButton d={d} className="rp-btn rp-btn--primary" /> : null}
      {d.mapUrl ? (
        <a className={`rp-btn ${hasMenu ? "rp-btn--ghost rp-sq" : "rp-btn--primary"}`} href={d.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={hasMenu ? "Directions" : undefined}>
          {PIN_ICON}{hasMenu ? null : <span>Directions</span>}
        </a>
      ) : null}
      {d.phone ? (
        <a className={`rp-btn rp-btn--ghost ${hasMenu || d.mapUrl ? "rp-sq" : ""}`} href={d.callHref} aria-label={hasMenu || d.mapUrl ? `Call ${d.name}` : undefined}>
          {PHONE_ICON}{hasMenu || d.mapUrl ? null : <span>Call</span>}
        </a>
      ) : null}
    </div>
  );
}

export default function RestaurantPageView({ d }) {
  const photo = d.photoItems[0];
  const sub = [d.restaurant.cuisine, d.locationLabel].filter(Boolean).join(", ");
  return (
    <div className={`rp ${d.photoItems.length ? "" : "rp--no-photo"}`.trim()}>
      <TopBar d={d} />
      <main className="rp-main" id="main">
        <header className="rp-hero">
          {photo ? (
            <button
              type="button"
              className="rp-photo"
              onClick={() => d.setLightbox(0)}
              aria-label={`View ${d.photoCount === 1 ? "the photo" : `all ${d.photoCount} photos`} of ${d.name} full size`}
            >
              <RestaurantPhoto
                photo={photo}
                alt={`${d.name} storefront`}
                fit="crop"
                focus={d.photoFocus}
                loading="eager"
                fetchPriority="high"
                fallback={d.restaurant.fallbackImage}
                fallbackFinal={d.restaurant.fallbackFinal}
              />
              {d.photoCount > 1 ? <span className="rp-photo-count">{PHOTO_ICON}{d.photoCount} photos</span> : null}
            </button>
          ) : null}
          <div className="rp-sign">
            <span className="rp-seal"><RestaurantLogo restaurant={d.restaurant} /></span>
            <h1 id="rpage-title">{d.name}</h1>
            {sub ? <p className="rp-sub">{sub}</p> : null}
            {d.rating || d.isVerified ? (
              <p className="rp-facts">
                {d.rating ? (
                  <span className="rp-rating">
                    <StarIcon />
                    <strong>{d.rating}</strong>
                    {d.reviews ? <span>{d.reviews} Google reviews</span> : null}
                  </span>
                ) : null}
                {d.isVerified ? (
                  <span className="rp-verified" title={d.verifiedTitle}>
                    <VerifiedIcon />
                    Verified on Google
                  </span>
                ) : null}
              </p>
            ) : null}
            <Status d={d} />
            <div className="rp-actions">
              <MenuButton d={d} className="rp-btn rp-btn--light" />
              {d.mapUrl ? (
                <a className="rp-btn rp-btn--outline" href={d.mapUrl} target="_blank" rel="noopener noreferrer">{PIN_ICON}<span>Directions</span></a>
              ) : null}
              {d.phone ? (
                <a className="rp-btn rp-btn--outline" href={d.callHref}>{PHONE_ICON}<span>Call</span></a>
              ) : null}
              {d.instagram ? (
                <a className="rp-btn rp-btn--outline" href={d.instagram.url} target="_blank" rel="noopener noreferrer">{INSTAGRAM_ICON}<span>Instagram</span></a>
              ) : null}
            </div>
          </div>
        </header>
        {d.credit ? (
          <a className="rp-credit" href={d.credit.url || "https://maps.google.com/"} target="_blank" rel="noopener noreferrer">
            Photo by {d.credit.name} on Google Maps
          </a>
        ) : null}

        <div className="rp-body">
          <Offers d={d} />
          <Thumbs d={d} />
          <Sections d={d} />
          <MoreLikeThis restaurant={d.restaurant} onOpen={d.onOpenRestaurant} />
        </div>
      </main>
      <PhoneBar d={d} />
      {d.lightboxView}
    </div>
  );
}
