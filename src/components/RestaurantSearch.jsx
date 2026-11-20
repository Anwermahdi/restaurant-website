import { SEARCH_ICON, CHEVRON_ICON } from "./icons.jsx";

/**
 * The main search bar: the words a visitor types, plus cuisine, area and
 * offer app. Every field is a real control bound to the same state the
 * results read, so nothing is ever out of step.
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
        <span className="finder-field-label">Search</span>
        <input
          type="search"
          name="restaurant-search"
          autoComplete="off"
          aria-label="Search restaurants, cuisines, areas and dishes"
          aria-controls="restaurant-grid"
          placeholder="Restaurant, dish or cuisine"
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
        />
      </label>

      <div className="finder-field">
        <span className="finder-field-label" aria-hidden="true">Cuisine</span>
        <span className="finder-field-value" aria-hidden="true">{cuisine === "All" ? "Any cuisine" : cuisine}</span>
        <select
          className="finder-field-select"
          name="cuisine"
          aria-label="Cuisine"
          value={cuisine}
          onChange={(event) => onCuisineChange?.(event.target.value)}
        >
          <option value="All">Any cuisine</option>
          {cuisines.filter((item) => item !== "All").map((item) => (
            <option key={item} value={item}>{item} ({foodCounts[item] ?? 0})</option>
          ))}
        </select>
        {CHEVRON_ICON}
      </div>

      <div className="finder-field">
        <span className="finder-field-label" aria-hidden="true">Area</span>
        <span className="finder-field-value" aria-hidden="true">{area === "All" ? "All areas" : area}</span>
        <select
          className="finder-field-select"
          name="area"
          aria-label="Area"
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

      <div className="finder-field">
        <span className="finder-field-label" aria-hidden="true">Offers</span>
        <span className="finder-field-value" aria-hidden="true">{offerApp === "All" ? "Any app" : offerApp}</span>
        <select
          className="finder-field-select"
          name="offerApp"
          aria-label="Offers"
          value={offerApp}
          onChange={(event) => onOfferAppChange?.(event.target.value)}
        >
          <option value="All">Any app</option>
          {offerApps.map((app) => (
            <option key={app} value={app}>{app}</option>
          ))}
        </select>
        {CHEVRON_ICON}
      </div>

      <button className="finder-go" type="submit">
        {SEARCH_ICON}
        <span className="finder-go-text">Search</span>
      </button>
    </form>
  );
}
