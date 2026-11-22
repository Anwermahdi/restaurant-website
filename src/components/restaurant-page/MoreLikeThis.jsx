import { useMemo } from "react";
import { PIN_ICON, StarIcon } from "../icons.jsx";
import RestaurantLogo from "../RestaurantLogo.jsx";
import RestaurantPhoto from "../RestaurantPhoto.jsx";
import { cardData } from "../cards/cardData.js";
import { cuisineBadgesFor, restaurants } from "../../data/restaurants.js";

/**
 * Up to four places like this one: the same cuisine counts most, shared food
 * tags next, then the same area, and rating only breaks ties. A place that
 * shares nothing is never padded in, and closed-for-good places are left out.
 */
function similarPlaces(restaurant, limit = 4) {
  const tags = new Set(cuisineBadgesFor(restaurant).map((tag) => tag.toLowerCase()));
  const area = String(restaurant.area || "").toLowerCase();
  return restaurants
    .filter((r) => r.id !== restaurant.id && r.businessStatus !== "CLOSED_PERMANENTLY")
    .map((r) => {
      const shared = cuisineBadgesFor(r).filter((tag) => tags.has(tag.toLowerCase())).length;
      const sameCuisine = r.cuisine && r.cuisine === restaurant.cuisine ? 1 : 0;
      const sameArea = area && String(r.area || "").toLowerCase() === area ? 1 : 0;
      return { r, score: sameCuisine * 6 + shared * 2 + sameArea + (Number(r.rating) || 0) / 10 };
    })
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.r);
}

export default function MoreLikeThis({ restaurant, onOpen }) {
  const places = useMemo(() => similarPlaces(restaurant), [restaurant]);
  if (!places.length || !onOpen) return null;
  return (
    <section className="rp-more" aria-labelledby="rp-more-title">
      <h2 id="rp-more-title">More like {restaurant.name}</h2>
      <ul className="rp-more-list">
        {places.map((place) => {
          const data = cardData(place);
          return (
            <li key={place.id}>
              <button type="button" className="rp-more-card" onClick={(event) => onOpen(place, event.currentTarget)}>
                {/* The same look as the cards: the name and seal on the photo. */}
                <span className="rp-more-photo">
                  <RestaurantPhoto
                    photo={data.photo}
                    alt=""
                    fit="card"
                    focus={data.focus}
                    loading="lazy"
                    fallbacks={data.fallbacks}
                    fallback={place.fallbackImage}
                    fallbackFinal={place.fallbackFinal}
                  />
                  <span className="rp-more-over">
                    <span className="rp-more-seal" aria-hidden="true"><RestaurantLogo restaurant={place} /></span>
                    <span className="rp-more-title">
                      <strong>{place.name}</strong>
                      <span className="rp-more-cuisine">{data.tags.slice(0, 2).join(", ") || place.cuisine}</span>
                    </span>
                  </span>
                </span>
                <span className="rp-more-facts">
                  <span>{PIN_ICON}{data.branches > 1 ? `${data.branches} branches` : data.area || "Bahrain"}</span>
                  {data.rating ? <span className="rp-more-rating"><StarIcon />{data.rating}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
