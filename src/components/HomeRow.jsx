import { useRef } from "react";
import RestaurantCard from "./RestaurantCard.jsx";
import { CHEVRON_LEFT_ICON, CHEVRON_RIGHT_ICON } from "./icons.jsx";

/**
 * One home page row: a heading with how many places it holds, its own
 * actions ("See all", "Nearest first"), and a line of cards that scrolls
 * inside itself (swipe on a phone, arrow buttons on a laptop). Cards are the
 * same cards as the full list, four across on a laptop, three on a tablet
 * and two on a phone, and every photo here loads lazily.
 */
export default function HomeRow({ id, title, meta, note, status, actions, items, cardProps }) {
  const trackRef = useRef(null);
  const move = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: still ? "auto" : "smooth" });
  };
  const titleId = `${id}-title`;
  return (
    <section className="hrow" id={id} aria-labelledby={titleId}>
      <div className="hrow-head">
        <div className="hrow-title">
          <h2 id={titleId} tabIndex={-1}>{title}</h2>
          {meta ? <span className="hrow-meta">{meta}</span> : null}
        </div>
        <div className="hrow-tools">
          {actions}
          <div className="hrow-arrows">
            <button type="button" onClick={() => move(-1)} aria-label={`Back in ${title}`}>{CHEVRON_LEFT_ICON}</button>
            <button type="button" onClick={() => move(1)} aria-label={`More in ${title}`}>{CHEVRON_RIGHT_ICON}</button>
          </div>
        </div>
      </div>
      {note ? <p className="hrow-note">{note}</p> : null}
      {status ? <p className={`hrow-note ${status.problem ? "is-problem" : ""}`} role="status">{status.text}</p> : null}
      <ul className="hrow-track" ref={trackRef} aria-label={title}>
        {items.map((restaurant) => (
          <li key={restaurant.id}>
            <RestaurantCard
              restaurant={restaurant}
              index={99}
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
