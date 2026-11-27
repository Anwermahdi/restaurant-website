import { useRef } from "react";
import RestaurantCard from "./RestaurantCard.jsx";
import RestaurantLogo from "./RestaurantLogo.jsx";
import { CHEVRON_LEFT_ICON, CHEVRON_RIGHT_ICON } from "./icons.jsx";

/**
 * The home page as sections by time of day. Each one opens with a red sign
 * (its name, how many places, and "See all") beside a big photo from one of
 * its own restaurants, then a swipeable row of that section's best cards.
 */
function Section({ section, rowIndex, cardProps, onSeeAll, onOpen }) {
  const trackRef = useRef(null);
  const move = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: still ? "auto" : "smooth" });
  };
  const { photo } = section;
  const titleId = `msec-${section.id}`;
  return (
    <section className="msec" aria-labelledby={titleId}>
      <div className="msec-head">
        <div className="msec-sign">
          <h2 id={titleId}>{section.title}</h2>
          <p>{section.note}</p>
          <div className="msec-tools">
            <button type="button" className="msec-all" onClick={() => onSeeAll(section)}>
              See all {section.total}
            </button>
            <div className="msec-arrows">
              <button type="button" onClick={() => move(-1)} aria-label={`Back in ${section.title}`}>{CHEVRON_LEFT_ICON}</button>
              <button type="button" onClick={() => move(1)} aria-label={`More in ${section.title}`}>{CHEVRON_RIGHT_ICON}</button>
            </div>
          </div>
        </div>
        <div className="msec-photo">
          <img
            src={photo.src}
            alt=""
            style={{ objectPosition: photo.focus }}
            loading={rowIndex === 0 ? "eager" : "lazy"}
            decoding="async"
          />
          <button
            type="button"
            className="msec-credit"
            onClick={(event) => onOpen(photo.restaurant, event.currentTarget)}
            aria-label={`Photo from ${photo.restaurant.name}. See the restaurant`}
          >
            <span className="msec-credit-seal" aria-hidden="true"><RestaurantLogo restaurant={photo.restaurant} /></span>
            <span aria-hidden="true">{photo.restaurant.name}</span>
          </button>
        </div>
      </div>
      <ul className="msec-row" ref={trackRef}>
        {section.items.map((restaurant, index) => (
          <li key={restaurant.id}>
            <RestaurantCard
              restaurant={restaurant}
              index={rowIndex === 0 ? index : 99}
              isSaved={cardProps.favourites.has(restaurant.id)}
              onToggleSaved={cardProps.onToggleSaved}
              onOpen={cardProps.onOpen}
              hasStory={Boolean(cardProps.hasStory?.(restaurant.id))}
              distanceKm={cardProps.distances?.get(restaurant.id)?.exact ? cardProps.distances.get(restaurant.id).km : null}
              onOpenStory={cardProps.onOpenStory}
              onOpenMenu={cardProps.onOpenMenu}
              onChooseBranch={cardProps.onChooseBranch}
              onOpenOffers={cardProps.onOpenOffers}
              onOpenGallery={cardProps.onOpenGallery}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MealSections({ sections, total, cardProps, onSeeAll, onSeeEverything, onOpen }) {
  if (!sections.length) return null;
  return (
    <div className="msecs">
      {sections.map((section, rowIndex) => (
        <Section key={section.id} section={section} rowIndex={rowIndex} cardProps={cardProps} onSeeAll={onSeeAll} onOpen={onOpen} />
      ))}
      <div className="msecs-end">
        <button type="button" className="btn" onClick={onSeeEverything}>See all {total} restaurants</button>
      </div>
    </div>
  );
}
