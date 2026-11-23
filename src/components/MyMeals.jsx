import { useRef } from "react";
import { CHEVRON_LEFT_ICON, CHEVRON_RIGHT_ICON } from "./icons.jsx";
import RestaurantLogo from "./RestaurantLogo.jsx";
import { MY_MEALS } from "../data/my-meals.js";
import { restaurants } from "../data/restaurants.js";

const byId = new Map(restaurants.map((r) => [r.id, r]));
const MEALS = MY_MEALS.filter((meal) => meal.photo && meal.dish && byId.has(meal.restaurantId));

/**
 * "Meals I've eaten": real plates from my own visits, as a row of big photos
 * you swipe through, each with the dish on it and the place under it.
 * Hidden until there is at least one meal in src/data/my-meals.js.
 */
export default function MyMeals({ onOpen }) {
  const trackRef = useRef(null);
  if (!MEALS.length) return null;

  const move = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: still ? "auto" : "smooth" });
  };

  return (
    <section className="my-meals" aria-labelledby="my-meals-title">
      <div className="my-meals-head">
        <div>
          <h2 id="my-meals-title">Meals I’ve eaten</h2>
          <p>Real plates from my own visits. Tap one to see the place.</p>
        </div>
        {MEALS.length > 1 ? (
          <div className="my-meals-arrows">
            <button type="button" onClick={() => move(-1)} aria-label="Previous meals">{CHEVRON_LEFT_ICON}</button>
            <button type="button" onClick={() => move(1)} aria-label="More meals">{CHEVRON_RIGHT_ICON}</button>
          </div>
        ) : null}
      </div>
      <ul className="my-meals-track" ref={trackRef}>
        {MEALS.map((meal) => {
          const restaurant = byId.get(meal.restaurantId);
          return (
            <li key={meal.photo}>
              <button
                type="button"
                className="my-meal"
                onClick={(event) => onOpen(restaurant, event.currentTarget)}
                aria-label={`${meal.dish} at ${restaurant.name}. See the restaurant`}
              >
                <img src={meal.photo} alt="" loading="lazy" decoding="async" />
                <span className="my-meal-copy">
                  <strong>{meal.dish}</strong>
                  {meal.note ? <span className="my-meal-note">{meal.note}</span> : null}
                  <span className="my-meal-place">
                    <span className="my-meal-seal" aria-hidden="true"><RestaurantLogo restaurant={restaurant} /></span>
                    {restaurant.name}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
