import { CLOCK_ICON, CHEVRON_ICON, StarIcon } from "./icons.jsx";

/**
 * The filters the main search bar does not already cover.
 *
 * The type of food, the area and the offers live in the search bar at the top
 * of the page, so only what is left sits here: the meal, the rating, the
 * offers-only switch and the open-now switch.
 */
export default function RestaurantFilters({
  meals = [],
  mealTime = "All",
  onMealTimeChange,
  ratingOptions = [],
  minRating = "Any",
  onMinRatingChange,
  offersOnly = false,
  onOffersOnlyChange,
  offerCount = 0,
  openNow = false,
  onOpenNowChange,
  openNowCount = 0,
  hasFilters = false,
  onClear,
  open = false,
}) {
  return (
    <div className="filter-panel" id="filter-panel" hidden={!open}>
      <div className="filter-panel-inner">
        {meals.length > 0 && (
          <div className="filter-field">
            <label className="filter-label" htmlFor="filter-meal">
              {CLOCK_ICON}
              Meal
            </label>
            <div className="filter-select">
              <select id="filter-meal" value={mealTime} onChange={(event) => onMealTimeChange?.(event.target.value)}>
                <option value="All">Any meal</option>
                {meals.map((meal) => (
                  <option key={meal} value={meal}>{meal}</option>
                ))}
              </select>
              <span className="filter-select-chevron" aria-hidden="true">{CHEVRON_ICON}</span>
            </div>
          </div>
        )}

        {ratingOptions.length > 0 && (
          <div className="filter-field">
            <label className="filter-label" htmlFor="filter-rating">
              <StarIcon />
              Rating
            </label>
            <div className="filter-select">
              <select id="filter-rating" value={minRating} onChange={(event) => onMinRatingChange?.(event.target.value)}>
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <span className="filter-select-chevron" aria-hidden="true">{CHEVRON_ICON}</span>
            </div>
          </div>
        )}

        <div className="filter-field filter-field--switches">
          {offerCount > 0 && (
            <label className="filter-switch">
              <input
                type="checkbox"
                checked={offersOnly}
                onChange={(event) => onOffersOnlyChange?.(event.target.checked)}
              />
              <span className="filter-switch-track" aria-hidden="true"><span className="filter-switch-knob" /></span>
              <span className="filter-switch-text">Offers only</span>
            </label>
          )}

          {openNowCount > 0 && (
            <label className="filter-switch">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(event) => onOpenNowChange?.(event.target.checked)}
              />
              <span className="filter-switch-track" aria-hidden="true"><span className="filter-switch-knob" /></span>
              <span className="filter-switch-text">Open now</span>
            </label>
          )}
        </div>

        {hasFilters && (
          <button type="button" className="filter-clear" onClick={onClear}>
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
