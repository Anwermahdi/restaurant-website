import { MEAL_HIGHLIGHTS } from "../data/meal-highlights.js";

/**
 * "Meals I've eaten" as story highlights: a row of round photos, one per
 * restaurant, each opening my meal photos from that place full screen.
 * Hidden until there is at least one meal in src/data/my-meals.js.
 */
export default function MyMeals({ onOpenStory }) {
  if (!MEAL_HIGHLIGHTS.length) return null;
  return (
    <section className="my-meals" aria-labelledby="my-meals-title">
      <div className="my-meals-head">
        <h2 id="my-meals-title">Meals I’ve eaten</h2>
        <p>Real plates from my own visits. Tap one to watch.</p>
      </div>
      <ul className="meal-highlights">
        {MEAL_HIGHLIGHTS.map(({ restaurant, frames }) => (
          <li key={restaurant.id}>
            <button
              type="button"
              className="meal-highlight"
              onClick={(event) => onOpenStory(restaurant.id, event.currentTarget)}
              aria-label={`${restaurant.name}: ${frames.length === 1 ? "1 meal" : `${frames.length} meals`}. Watch`}
            >
              <span className="meal-highlight-ring" aria-hidden="true">
                <img src={frames[0].src} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="meal-highlight-name" aria-hidden="true">{restaurant.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
