import { useCallback, useState } from "react";
import {
  ARROW_ICON,
  CHECK_ICON,
  CLOCK_ICON,
  HeartIcon,
  MenuIcon,
  PHOTO_ICON,
  PIN_ICON,
  PLAY_ICON,
  SHARE_ICON,
  StarIcon,
  VerifiedIcon,
} from "./icons.jsx";
import CuisineBadge from "./CuisineBadge.jsx";
import OffersBadge from "./OffersBadge.jsx";
import RestaurantLogo from "./RestaurantLogo.jsx";
import RestaurantPhoto from "./RestaurantPhoto.jsx";
import { cuisineBadgesFor, getOfferDetails, hoursLabel, locationCount, mapsUrl, offerBadgeText, statusLabel } from "../data/restaurants.js";
import { storefrontPhotoFor } from "../data/photo-display.js";

/**
 * One restaurant on the grid.
 *
 * Everything here comes from the restaurant's own record: the photo, the
 * logo, the rating, the hours. Nothing is guessed, and a place with no
 * rating simply shows no rating.
 */
export default function RestaurantCard({
  restaurant,
  index = 0,
  isSaved = false,
  onToggleSaved,
  onOpen,
  onShare,
  hasStory = false,
  onOpenStory,
  onOpenMenu,
  onOpenLocations,
  maxCuisines = 3,
  menuButtonRef,
}) {
  const [imageReady, setImageReady] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [shared, setShared] = useState(false);

  // A photo that is already in the browser cache can finish before React
  // attaches the load handler, so check the element itself too.
  const imageRef = useCallback((node) => {
    if (node && node.complete && node.naturalWidth > 0) setImageReady(true);
  }, []);

  const offers = getOfferDetails(restaurant.id);
  const cuisines = cuisineBadgesFor(restaurant);
  const shown = cuisines.slice(0, maxCuisines);
  const hidden = cuisines.length - shown.length;
  // The storefront resolver picks the best real landscape photo, applies a
  // reviewer's manual choice, and tells the frame whether it may fill the
  // width (cover) or must be shown whole (contain).
  const storefront = storefrontPhotoFor(restaurant);
  const cardPhoto = storefront.photo || {
    src: restaurant.image,
    width: restaurant.imageWidth,
    height: restaurant.imageHeight,
  };
  const cardFallbacks = [restaurant.image, ...(restaurant.imageFallbacks || [])].filter(
    (value, position, all) => value && value !== cardPhoto.src && all.indexOf(value) === position
  );

  const area = restaurant.area || restaurant.address || restaurant.city;
  const hours = statusLabel(restaurant);
  const hoursDetail = hoursLabel(restaurant);
  const mapUrl = mapsUrl(restaurant);
  const branches = locationCount(restaurant);
  const hasMenu = Boolean(restaurant.menuUrl) || restaurant.menuPhotos.length > 0 || restaurant.menu.length > 0;
  const isVerified = /^google/.test(restaurant.dataSource || "");

  const titleId = `restaurant-${restaurant.id}-title`;

  const share = () => {
    onShare?.(restaurant);
    setShared(true);
    window.setTimeout(() => setShared(false), 1800);
  };

  return (
    <article
      className="card"
      aria-labelledby={titleId}
      style={{ "--card-i": Math.min(index, 11) }}
    >
      <div className="card-media">
        <button
          type="button"
          className="card-photo"
          aria-label={`See details for ${restaurant.name}`}
          onClick={(event) => onOpen?.(restaurant, event.currentTarget)}
        >
          {imageBroken ? (
            <span className="card-photo-fallback" aria-hidden="true">
              {restaurant.name.charAt(0)}
            </span>
          ) : (
            <RestaurantPhoto
              photo={cardPhoto}
              alt=""
              fit={storefront.fit}
              focus={storefront.focus}
              className={`card-img ${imageReady ? "is-ready" : ""}`}
              imgRef={imageRef}
              fallbacks={cardFallbacks}
              fallback={restaurant.fallbackImage}
              fallbackFinal={restaurant.fallbackFinal}
              loading={index < 4 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              onError={() => setImageBroken(true)}
              onLoad={() => setImageReady(true)}
            />
          )}
        </button>

        {/* A shade so the floating controls read on any photo. */}
        <span className="card-scrim" aria-hidden="true" />

        {offers.length > 0 && (
          <OffersBadge
            count={offers.length}
            text={offerBadgeText(offers[0].text)}
            label={`See the ${offers.length} offer${offers.length === 1 ? "" : "s"} at ${restaurant.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpen?.(restaurant, event.currentTarget);
            }}
          />
        )}

        <div className="card-tools">
          <button
            type="button"
            className={`card-tool ${shared ? "is-done" : ""}`}
            aria-label={shared ? `Link to ${restaurant.name} copied` : `Share ${restaurant.name}`}
            onClick={(event) => {
              event.stopPropagation();
              share();
            }}
          >
            {shared ? CHECK_ICON : SHARE_ICON}
          </button>
          <button
            type="button"
            className={`card-tool card-fav ${isSaved ? "is-saved" : ""}`}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove ${restaurant.name} from saved places` : `Save ${restaurant.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSaved?.(restaurant.id);
            }}
          >
            <HeartIcon filled={isSaved} />
          </button>
        </div>

        {restaurant.menuPhotos.length > 0 && (
          <button
            type="button"
            className="card-photos"
            aria-label={`See ${restaurant.menuPhotos.length} menu photo${restaurant.menuPhotos.length === 1 ? "" : "s"} for ${restaurant.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenMenu?.(restaurant, event.currentTarget);
            }}
          >
            {PHOTO_ICON}
            <span>{restaurant.menuPhotos.length}</span>
          </button>
        )}

        {/* The place's own mark, sitting on the edge of the photo. */}
        {hasStory && onOpenStory ? (
          <button
            type="button"
            className="card-logo card-logo-story"
            onClick={(event) => {
              event.stopPropagation();
              onOpenStory(restaurant.id, event.currentTarget);
            }}
            aria-label={`Play the ${restaurant.name} highlights`}
          >
            <RestaurantLogo restaurant={restaurant} />
            <span className="logo-play" aria-hidden="true">{PLAY_ICON}</span>
          </button>
        ) : (
          <span className="card-logo">
            <RestaurantLogo restaurant={restaurant} />
          </span>
        )}
      </div>

      <div className="card-body">
        <div className="card-head">
          <h3 className="card-title" id={titleId}>
            <button type="button" className="card-open" onClick={(event) => onOpen?.(restaurant, event.currentTarget)}>
              <span className="card-open-text">{restaurant.name}</span>
            </button>
          </h3>

          {restaurant.rating ? (
            <p className="card-rating">
              <span className="card-rating-value">
                <StarIcon />
                {restaurant.rating}
              </span>
              {restaurant.reviews ? (
                <span className="card-rating-count">({restaurant.reviews})</span>
              ) : null}
            </p>
          ) : (
            <p className="card-rating card-rating--empty" aria-hidden="true" />
          )}
        </div>

        {isVerified && (
          <p className="card-verified" title="Details verified on Google">
            <VerifiedIcon />
            Verified on Google
          </p>
        )}

        {restaurant.description ? <p className="card-desc">{restaurant.description}</p> : null}

        {shown.length > 0 && (
          <ul className="card-cuisines">
            {shown.map((label) => (
              <li key={label}>
                <CuisineBadge label={label} />
              </li>
            ))}
            {hidden > 0 && (
              <li>
                <span className="cuisine-badge cuisine-badge--more" title={cuisines.join(", ")}>
                  +{hidden}
                </span>
              </li>
            )}
          </ul>
        )}

        <div className="card-meta">
          <p className="card-meta-row" title={restaurant.address}>
            <span className="card-meta-icon">{PIN_ICON}</span>
            <span className="card-meta-text">
              {branches > 1 ? `${branches} locations` : area}
            </span>
          </p>
          <p className="card-meta-row" title={hoursDetail || undefined}>
            <span className="card-meta-icon">{CLOCK_ICON}</span>
            <span className="card-meta-text">{hours}</span>
          </p>
        </div>

        <div className="card-actions">
          {restaurant.menuUrl ? (
            <a
              className="card-btn card-btn--primary"
              href={restaurant.menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              <MenuIcon />
              <span className="card-btn-text">View menu</span>
              <span className="card-btn-arrow" aria-hidden="true">{ARROW_ICON}</span>
            </a>
          ) : hasMenu ? (
            <button
              type="button"
              className="card-btn card-btn--primary"
              ref={menuButtonRef}
              onClick={(event) => {
                event.stopPropagation();
                onOpenMenu?.(restaurant, event.currentTarget);
              }}
            >
              <MenuIcon />
              <span className="card-btn-text">View menu</span>
              <span className="card-btn-arrow" aria-hidden="true">{ARROW_ICON}</span>
            </button>
          ) : (
            <button type="button" className="card-btn card-btn--primary" disabled>
              <MenuIcon />
              <span className="card-btn-text">No menu yet</span>
            </button>
          )}

          {branches > 1 ? (
            <button
              type="button"
              className="card-btn card-btn--ghost"
              onClick={(event) => {
                event.stopPropagation();
                onOpenLocations?.(restaurant, event.currentTarget);
              }}
            >
              {PIN_ICON}
              <span className="card-btn-text">View locations</span>
            </button>
          ) : mapUrl ? (
            <a
              className="card-btn card-btn--ghost"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              {PIN_ICON}
              <span className="card-btn-text">View on map</span>
            </a>
          ) : (
            <button
              type="button"
              className="card-btn card-btn--ghost"
              disabled
              title="Location unavailable"
            >
              {PIN_ICON}
              <span className="card-btn-text">
                Location unavailable
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
