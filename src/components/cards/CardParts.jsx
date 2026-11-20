import { useCallback, useState } from "react";
import { HeartIcon, MAP_ICON, PERCENT_ICON, PHOTO_ICON } from "../icons.jsx";
import RestaurantPhoto from "../RestaurantPhoto.jsx";
import { offerBadgeText } from "../../data/restaurants.js";

/** The storefront photo. It fades in once loaded and never zooms on hover. */
export function CardPhoto({ restaurant, data, index = 0, onOpen, className = "" }) {
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const imgRef = useCallback((node) => {
    if (node && node.complete && node.naturalWidth > 0) setReady(true);
  }, []);
  return (
    <button
      type="button"
      className={`cx-photo ${className}`.trim()}
      aria-label={`See details for ${restaurant.name}`}
      onClick={(event) => onOpen?.(restaurant, event.currentTarget)}
    >
      {broken ? (
        <span className="cx-photo-fallback" aria-hidden="true">{restaurant.name.charAt(0)}</span>
      ) : (
        <RestaurantPhoto
          photo={data.photo}
          alt=""
          fit="crop"
          focus={data.focus}
          className={`cx-img ${ready ? "is-ready" : ""}`}
          imgRef={imgRef}
          fallbacks={data.fallbacks}
          fallback={restaurant.fallbackImage}
          fallbackFinal={restaurant.fallbackFinal}
          loading={index < 4 ? "eager" : "lazy"}
          onError={() => setBroken(true)}
          onLoad={() => setReady(true)}
        />
      )}
    </button>
  );
}

export function FavButton({ restaurant, saved, onToggle, className = "" }) {
  return (
    <button
      type="button"
      className={`cx-fav ${saved ? "is-saved" : ""} ${className}`.trim()}
      aria-pressed={saved}
      aria-label={saved ? `Saved. Remove ${restaurant.name} from saved places` : `Save ${restaurant.name}`}
      title={saved ? "Saved" : "Save"}
      onClick={() => onToggle?.(restaurant.id)}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

/** The offer on the photo. It opens the real offer details, never a guess. */
export function OfferBadge({ restaurant, offers, onOpenOffers, className = "" }) {
  if (!offers.length) return null;
  const more = offers.length - 1;
  return (
    <button
      type="button"
      className={`cx-offer ${className}`.trim()}
      onClick={(event) => onOpenOffers?.(restaurant, event.currentTarget)}
      aria-label={`See offer details at ${restaurant.name}: ${offers[0].text}${more ? `, and ${more} more` : ""}`}
    >
      <span className="cx-offer-icon" aria-hidden="true">{PERCENT_ICON}</span>
      <span className="cx-offer-text">{offerBadgeText(offers[0].text) || "Offer"}</span>
      {more > 0 ? <span className="cx-offer-more" aria-hidden="true">+{more}</span> : null}
    </button>
  );
}

export function GalleryButton({ restaurant, count, onOpenGallery, className = "" }) {
  if (!count) return null;
  return (
    <button
      type="button"
      className={`cx-gallery ${className}`.trim()}
      onClick={(event) => onOpenGallery?.(restaurant, event.currentTarget)}
      aria-label={`View ${count === 1 ? "the full photo" : `all ${count} photos`} of ${restaurant.name}`}
    >
      {PHOTO_ICON}
      <span>{count === 1 ? "Photo" : `${count} photos`}</span>
    </button>
  );
}

export function HoursText({ hours }) {
  return (
    <span className={`cx-hours is-${hours.tone}`}>
      <strong>{hours.text}</strong>
      {hours.detail ? <span className="cx-hours-detail">, {hours.detail}</span> : null}
    </span>
  );
}

/** The two main actions. A chain asks which branch before giving directions. */
export function CardActions({ restaurant, data, onOpen, onChooseBranch, className = "", short = false }) {
  const directionsLabel = data.searchUrl ? "Find on Maps" : short ? "Directions" : "Get directions";
  return (
    <div className={`cx-actions ${className}`.trim()}>
      <button type="button" className="cx-btn cx-btn--primary" onClick={(event) => onOpen?.(restaurant, event.currentTarget)}>
        {short ? "Details" : "View details"}
      </button>
      {data.branches > 1 ? (
        <button
          type="button"
          className="cx-btn cx-btn--ghost"
          onClick={(event) => onChooseBranch?.(restaurant, event.currentTarget, "directions")}
          aria-label={`Get directions to ${restaurant.name}: choose one of ${data.branches} branches`}
        >
          {MAP_ICON}
          <span>{short ? "Directions" : "Get directions"}</span>
        </button>
      ) : (
        <a className="cx-btn cx-btn--ghost" href={data.directionsUrl || data.searchUrl} target="_blank" rel="noopener noreferrer">
          {MAP_ICON}
          <span>{directionsLabel}</span>
          <span className="sr-only"> (opens Google Maps)</span>
        </a>
      )}
    </div>
  );
}
