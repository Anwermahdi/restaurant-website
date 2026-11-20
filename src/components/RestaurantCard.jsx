import { CLOCK_ICON, MenuIcon, PHONE_ICON, PIN_ICON, PLAY_ICON, StarIcon, VerifiedIcon } from "./icons.jsx";
import RestaurantLogo from "./RestaurantLogo.jsx";
import { cardData } from "./cards/cardData.js";
import { CardActions, CardPhoto, FavButton, GalleryButton, HoursText, OfferBadge } from "./cards/CardParts.jsx";

/**
 * One restaurant: the photo sits in a white mount like a framed print, the
 * logo seals it, and the text is centred and unhurried. Anything the record
 * does not have is left out rather than guessed.
 */
export default function RestaurantCard({
  restaurant, index = 0, isSaved = false, onToggleSaved, onOpen, onOpenOffers, onOpenGallery, onChooseBranch, onOpenMenu,
  hasStory = false, onOpenStory,
}) {
  const data = cardData(restaurant);
  const titleId = `cxa-${restaurant.id}-title`;
  return (
    <article className="cx cxa" aria-labelledby={titleId}>
      <div className="cxa-mount">
        <div className="cx-media cxa-media">
          <CardPhoto restaurant={restaurant} data={data} index={index} onOpen={onOpen} />
          <OfferBadge restaurant={restaurant} offers={data.offers} onOpenOffers={onOpenOffers} />
          <FavButton restaurant={restaurant} saved={isSaved} onToggle={onToggleSaved} />
          <GalleryButton restaurant={restaurant} count={data.gallery.length} onOpenGallery={onOpenGallery} />
        </div>
      </div>

      <div className="cxa-body">
        {hasStory && onOpenStory ? (
          <button
            type="button"
            className="cxa-logo is-story"
            onClick={(event) => onOpenStory(restaurant.id, event.currentTarget)}
            aria-label={`Play the ${restaurant.name} highlights`}
          >
            <RestaurantLogo restaurant={restaurant} />
            <span className="logo-play" aria-hidden="true">{PLAY_ICON}</span>
          </button>
        ) : (
          <span className="cxa-logo" aria-hidden="true"><RestaurantLogo restaurant={restaurant} /></span>
        )}
        <h3 className="cxa-name" id={titleId}>
          <button type="button" onClick={(event) => onOpen?.(restaurant, event.currentTarget)}>{restaurant.name}</button>
          {data.isVerified && (
            <span className="cx-verified" title="Verified on Google"><VerifiedIcon /><span className="sr-only">Verified on Google</span></span>
          )}
        </h3>
        {data.rating ? (
          <p className="cxa-rating">
            <StarIcon />
            <strong>{data.rating}</strong>
            {data.reviews ? <span>{data.reviews} Google reviews</span> : null}
          </p>
        ) : null}
        {data.description ? <p className="cxa-desc">{data.description}</p> : null}
        {data.tags.length > 0 && (
          <ul className="cxa-tags" aria-label="Cuisine">
            {data.tags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}

        <dl className="cxa-info">
          <div>
            <dt><span className="sr-only">Location</span>{PIN_ICON}</dt>
            <dd>
              {data.branches > 1 ? (
                <button type="button" className="cx-link" onClick={(event) => onChooseBranch?.(restaurant, event.currentTarget, "browse")}>
                  {data.branches} branches
                </button>
              ) : (data.area || "Bahrain")}
            </dd>
          </div>
          <div title={data.hoursDetail || undefined}>
            <dt><span className="sr-only">Hours</span>{CLOCK_ICON}</dt>
            <dd><HoursText hours={data.hours} /></dd>
          </div>
        </dl>

        {(data.callHref || data.menuPages || data.menuUrl || data.price || data.facilities.length) ? (
          <div className="cxa-links">
            {data.callHref ? (
              <a className="cxa-pill" href={data.callHref}>{PHONE_ICON}<span>{data.phone}</span></a>
            ) : null}
            {data.menuPages ? (
              <button type="button" className="cxa-pill" onClick={(event) => onOpenMenu?.(restaurant, event.currentTarget)}>
                <MenuIcon /><span>Menu</span>
              </button>
            ) : data.menuUrl ? (
              <a className="cxa-pill" href={data.menuUrl} target="_blank" rel="noopener noreferrer">
                <MenuIcon /><span>Menu</span><span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
            {data.price ? <span className="cxa-pill is-static">{data.price}</span> : null}
            {data.facilities.map((label) => <span key={label} className="cxa-pill is-static">{label}</span>)}
          </div>
        ) : null}

        <CardActions restaurant={restaurant} data={data} onOpen={onOpen} onChooseBranch={onChooseBranch} />
      </div>
    </article>
  );
}
