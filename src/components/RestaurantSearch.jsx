import { SEARCH_ICON, CHEVRON_ICON, CHEVRON_RIGHT_ICON, RESTAURANT_ICON, PIN_ICON, TAG_ICON } from "./icons.jsx";

/**
 * The main search bar at the top of the page.
 *
 * It is the one place a visitor filters: the words they type, the type of
 * food, the area and the offers. Every field is a real control bound to the
 * same state the grid reads, so nothing is ever out of step.
 */
export default function RestaurantSearch({
  query,
  onQueryChange,
  onSubmit,
  cuisines = [],
  foodCounts = {},
  cuisine = "All",
  onCuisineChange,
  areas = [],
  area = "All",
  onAreaChange,
  offerApps = [],
  offerApp = "All",
  onOfferAppChange,
}) {
  return (
    <form
      className="finder"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <label className="finder-field finder-field--search">
        {SEARCH_ICON}
        <span className="sr-only">Search restaurants, cuisines, cities, and dishes</span>
        <span className="finder-field-text">
          <span className="finder-field-label">Search</span>
          <input
            type="search"
            name="restaurant-search"
            autoComplete="off"
            aria-label="Search restaurants, cuisines, cities, and dishes"
            aria-controls="restaurant-grid"
            placeholder="Restaurants, dishes or cuisines…"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
          />
        </span>
      </label>
      <span className="fsep" aria-hidden="true" />

      <div className="finder-field">
        {RESTAURANT_ICON}
        <span className="finder-field-text" aria-hidden="true">
          <span className="finder-field-label">Type of food</span>
          <span className="finder-field-value">
            {cuisine === "All" ? "All cuisines" : cuisine}
          </span>
        </span>
        <select
          className="finder-field-select"
          name="cuisine"
          aria-label="Type of food"
          value={cuisine}
          onChange={(event) => onCuisineChange?.(event.target.value)}
        >
          <option value="All">All cuisines</option>
          {cuisines.filter((item) => item !== "All").map((item) => (
            <option key={item} value={item}>{item} ({foodCounts[item] ?? 0})</option>
          ))}
        </select>
        {CHEVRON_ICON}
      </div>
      <span className="fsep" aria-hidden="true" />

      <div className="finder-field finder-field--wide">
        {PIN_ICON}
        <span className="finder-field-text" aria-hidden="true">
          <span className="finder-field-label">Location</span>
          <span className="finder-field-value">
            {area === "All" ? "All areas" : area}
          </span>
        </span>
        <select
          className="finder-field-select"
          name="area"
          aria-label="Location"
          value={area}
          onChange={(event) => onAreaChange?.(event.target.value)}
        >
          <option value="All">All areas</option>
          {areas.filter((item) => item !== "All").map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        {CHEVRON_ICON}
      </div>
      <span className="fsep" aria-hidden="true" />

      <div className="finder-field">
        {TAG_ICON}
        <span className="finder-field-text" aria-hidden="true">
          <span className="finder-field-label">Offers</span>
          <span className="finder-field-value">
            {offerApp === "All" ? "Any offers" : `${offerApp} offers`}
          </span>
        </span>
        <select
          className="finder-field-select"
          name="offerApp"
          aria-label="Offers"
          value={offerApp}
          onChange={(event) => onOfferAppChange?.(event.target.value)}
        >
          <option value="All">Any offers</option>
          {offerApps.map((app) => (
            <option key={app} value={app}>{app} offers</option>
          ))}
        </select>
        {CHEVRON_ICON}
      </div>

      <button className="finder-go" type="submit">
        {SEARCH_ICON}
        <span className="finder-go-text">Find restaurants</span>
        {CHEVRON_RIGHT_ICON}
      </button>
    </form>
  );
}
