import { useEffect, useMemo, useState } from "react";
import HomeRow from "./HomeRow.jsx";
import { DISH_GROUPS, DISH_ROW_SIZE } from "../data/dish-sections.js";
import { MIN_OPEN_NOW, OPEN_NOW_ROW_SIZE, TOP_RATING, TOP_REVIEWS, TOP_ROW_SIZE, busiestAreas, openNowPlaces, topRatedPlaces } from "../data/home-rows.js";
import { restaurants } from "../data/restaurants.js";

const places = (n) => `${n} ${n === 1 ? "place" : "places"}`;

/**
 * The home page below the hero: dish tiles, then the rows (saved places,
 * open now, one per dish, top rated), the areas, and the way to the full
 * list. Every count is computed, and each "See all" opens a list of exactly
 * that many places.
 */
export default function HomeSections({
  total, favourites, cardProps, distances, locating, onLocate,
  onJumpToDish, onSeeDish, onSeeSaved, onSeeOpenNow, onSeeArea, onSeeEverything,
}) {
  // Open now depends on the clock, so it is worked out again every 5 minutes.
  const [openNow, setOpenNow] = useState(() => openNowPlaces());
  useEffect(() => {
    const timer = window.setInterval(() => setOpenNow(openNowPlaces()), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [nearest, setNearest] = useState(false);
  const areaChips = useMemo(() => busiestAreas(8), []);

  const saved = useMemo(() => restaurants.filter((r) => favourites.has(r.id)), [favourites]);

  // "Nearest first": asks for the location only when the button is pressed.
  const openItems = useMemo(() => {
    if (!nearest || !distances) return openNow;
    const km = (place) => distances.get(place.id)?.km ?? Infinity;
    return [...openNow].sort((a, b) => km(a) - km(b));
  }, [nearest, distances, openNow]);
  const toggleNearest = () => {
    if (nearest) setNearest(false);
    else onLocate(() => setNearest(true));
  };
  const openStatus =
    locating === "asking"
      ? { text: "Finding where you are…" }
      : locating === "denied"
        ? { text: "Location is off for this site. Allow location in your browser settings, then try again.", problem: true }
        : locating === "unavailable"
          ? { text: "We couldn't find where you are. Try again in a moment.", problem: true }
          : nearest && distances
            ? { text: "Closest first, measured in a straight line from you." }
            : null;

  return (
    <div className="hsections">
      <nav className="dish-tiles" aria-label="Browse by dish">
        <ul>
          {DISH_GROUPS.map((group) => (
            <li key={group.id}>
              <button type="button" className="dish-tile" onClick={() => onJumpToDish(group.id)} aria-label={`${group.name}, ${places(group.total)}. Go to the row`}>
                <span className="dish-tile-photo" aria-hidden="true">
                  <img src={group.image} alt="" width="76" height="76" loading="lazy" decoding="async" />
                </span>
                <span className="dish-tile-name" aria-hidden="true">{group.name}</span>
                <span className="dish-tile-count" aria-hidden="true">{places(group.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {saved.length > 0 ? (
        <HomeRow
          id="row-saved"
          title="Your saved places"
          meta={`${saved.length} saved`}
          items={saved.slice(0, DISH_ROW_SIZE)}
          cardProps={cardProps}
          actions={<button type="button" className="hrow-all" onClick={onSeeSaved}>See all {saved.length}</button>}
        />
      ) : null}

      {openNow.length >= MIN_OPEN_NOW ? (
        <HomeRow
          id="row-open-now"
          title="Open now"
          meta={places(openNow.length)}
          note="Based on published opening hours"
          status={openStatus}
          items={openItems.slice(0, OPEN_NOW_ROW_SIZE)}
          cardProps={cardProps}
          actions={
            <>
              <button type="button" className={`hrow-all hrow-toggle ${nearest ? "is-on" : ""}`} aria-pressed={nearest} onClick={toggleNearest} disabled={locating === "asking"}>
                Nearest first
              </button>
              <button type="button" className="hrow-all" onClick={onSeeOpenNow}>See all {openNow.length}</button>
            </>
          }
        />
      ) : null}

      {DISH_GROUPS.map((group) => (
        <HomeRow
          key={group.id}
          id={`dish-${group.id}`}
          title={group.name}
          meta={places(group.total)}
          items={group.items}
          cardProps={cardProps}
          actions={<button type="button" className="hrow-all" onClick={() => onSeeDish(group.id)}>See all {group.total}</button>}
        />
      ))}

      {topRatedPlaces.length > 0 ? (
        <HomeRow
          id="row-top-rated"
          title="Top rated in Bahrain"
          meta={places(topRatedPlaces.length)}
          note={`Google rating ${TOP_RATING.toFixed(1)} or more, from at least ${TOP_REVIEWS} reviews`}
          items={topRatedPlaces.slice(0, TOP_ROW_SIZE)}
          cardProps={cardProps}
        />
      ) : null}

      <section className="areachips" aria-labelledby="areachips-title">
        <h2 id="areachips-title">Browse by area</h2>
        <ul>
          {areaChips.map((chip) => (
            <li key={chip.name}>
              <button type="button" className="areachip" onClick={() => onSeeArea(chip.name)}>
                <span>{chip.name}</span>
                <span className="areachip-count">{chip.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="hsections-end">
        <button type="button" className="btn" onClick={onSeeEverything}>See all {total} restaurants</button>
      </div>
    </div>
  );
}
