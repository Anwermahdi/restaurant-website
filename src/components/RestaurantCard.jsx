import { MAP_ICON, MenuIcon, PHONE_ICON, PIN_ICON, PLAY_ICON, StarIcon, VerifiedIcon } from "./icons.jsx";
import RestaurantLogo from "./RestaurantLogo.jsx";
import { cardData } from "./cards/cardData.js";
import { CardPhoto, FavButton, GalleryButton, OfferBadge } from "./cards/CardParts.jsx";

/**
 * One restaurant, in the same language as its page: the storefront photo
 * edge to edge with the logo seal on its corner, then the name, what it
 * serves and today's facts, left-aligned. Anything the record does not
 * have is left out rather than guessed.
 */
export default function RestaurantCard({
  restaurant, index = 0, isSaved = false, onToggleSaved, onOpen, onOpenOffers, onOpenGallery, onChooseBranch, onOpenMenu,
  hasStory = false, onOpenStory,
}) {
  const data = cardData(restaurant);
  const titleId = `cxs-${restaurant.id}-title`;
  const open = (event) => onOpen?.(restaurant, event.currentTarget);
  const cuisineLine = data.tags.slice(0, 3).join(", ");
  // Today's hours only when they are known; an unknown day stays quiet.
  const hours = data.hours.tone === "unknown"
    ? (data.hours.detail ? { tone: "unknown", text: "Today", detail: data.hours.detail } : null)
    : data.hours;
  const directionsHref = data.directionsUrl || data.searchUrl;
  const hasMenu = Boolean(data.menuPages || data.menuUrl);

  return (
    <article className="cx cxs" aria-labelledby={titleId}>
      <div className="cx-media cxs-media">
        <CardPhoto restaurant={restaurant} data={data} index={index} onOpen={onOpen} />
        <OfferBadge restaurant={restaurant} offers={data.offers} onOpenOffers={onOpenOffers} />
        <FavButton restaurant={restaurant} saved={isSaved} onToggle={onToggleSaved} />
        <GalleryButton restaurant={restaurant} count={data.gallery.length} onOpenGallery={onOpenGallery} />
        {hasStory && onOpenStory ? (
          <button
            type="button"
            className="cxs-seal is-story"
            onClick={(event) => onOpenStory(restaurant.id, event.currentTarget)}
            aria-label={`Play the ${restaurant.name} highlights`}
          >
            <RestaurantLogo restaurant={restaurant} />
            <span className="logo-play" aria-hidden="true">{PLAY_ICON}</span>
          </button>
        ) : (
          <span className="cxs-seal" aria-hidden="true"><RestaurantLogo restaurant={restaurant} /></span>
        )}
      </div>

      <div className="cxs-body">
        <h3 className="cxs-name" id={titleId}>
          <button type="button" onClick={open}>{restaurant.name}</button>
          {data.isVerified && (
            <span className="cx-verified" title="Verified on Google"><VerifiedIcon /><span className="sr-only">Verified on Google</span></span>
          )}
        </h3>
        {cuisineLine ? <p className="cxs-cuisine">{cuisineLine}</p> : null}

        <ul className="cxs-facts">
          <li className="cxs-where">
            {PIN_ICON}
            {data.branches > 1 ? (
              <button type="button" className="cx-link" onClick={(event) => onChooseBranch?.(restaurant, event.currentTarget, "browse")}>
                {data.branches} branches
              </button>
            ) : (
              <span>{data.area || "Bahrain"}</span>
            )}
          </li>
          {data.rating ? (
            <li className="cxs-rating" title={data.reviews ? `${data.reviews} Google reviews` : undefined}>
              <StarIcon />
              <strong>{data.rating}</strong>
              {data.reviews ? <span className="cxs-reviews">({data.reviews})</span> : null}
              {data.reviews ? <span className="sr-only"> from {data.reviews} Google reviews</span> : null}
            </li>
          ) : null}
          {hours ? (
            <li className={`cxs-hours is-${hours.tone}`} title={data.hoursDetail || undefined}>
              <span className="cxs-dot" aria-hidden="true" />
              <span><strong>{hours.text}</strong>{hours.detail ? `, ${hours.detail}` : ""}</span>
            </li>
          ) : null}
          {data.price ? <li>{data.price}</li> : null}
        </ul>

        {data.description ? <p className="cxs-desc">{data.description}</p> : null}
        {data.facilities.length ? <p className="cxs-extra">{data.facilities.join(", ")}</p> : null}

        <div className="cxs-actions">
          <button type="button" className="cxs-btn cxs-btn--primary" onClick={open}>
            View details
          </button>
          {data.branches > 1 ? (
            <button
              type="button"
              className="cxs-icon"
              onClick={(event) => onChooseBranch?.(restaurant, event.currentTarget, "directions")}
              aria-label={`Directions to ${restaurant.name}: choose one of ${data.branches} branches`}
              title="Directions"
            >
              {MAP_ICON}
            </button>
          ) : directionsHref ? (
            <a
              className="cxs-icon"
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${data.searchUrl ? "Find" : "Directions to"} ${restaurant.name} on Google Maps`}
              title={data.searchUrl ? "Find on Maps" : "Directions"}
            >
              {MAP_ICON}
            </a>
          ) : null}
          {data.callHref ? (
            <a className="cxs-icon cxs-optional" href={data.callHref} aria-label={`Call ${restaurant.name}, ${data.phone}`} title={`Call ${data.phone}`}>
              {PHONE_ICON}
            </a>
          ) : null}
          {hasMenu ? (
            data.menuPages ? (
              <button type="button" className="cxs-icon cxs-optional" onClick={(event) => onOpenMenu?.(restaurant, event.currentTarget)} aria-label={`${restaurant.name} menu`} title="Menu">
                <MenuIcon />
              </button>
            ) : (
              <a className="cxs-icon cxs-optional" href={data.menuUrl} target="_blank" rel="noopener noreferrer" aria-label={`${restaurant.name} menu (opens in a new tab)`} title="Menu">
                <MenuIcon />
              </a>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
