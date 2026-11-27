import { CHEVRON_ICON, CHEVRON_RIGHT_ICON, PIN_ICON, RESTAURANT_ICON, SEARCH_ICON, TAG_ICON } from "./icons.jsx";

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
  cuisineGroups = [],
  foodCounts = {},
  cuisine = "All",
  onCuisineChange,
  areas = [],
  area = "All",
  onAreaChange,
  offerApps = [],
  offerApp = "All",
  onOfferAppChange,
  // The home header's look: an icon on every part and plainer words.
  rich = false,
}) {
  const icon = (glyph) => (rich ? <span className="finder-icon" aria-hidden="true">{glyph}</span> : null);
  return (
    <form
      className={`finder ${rich ? "finder--rich" : ""}`.trim()}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <label className="finder-field finder-field--search">
        {icon(SEARCH_ICON)}
        <span className={rich ? "sr-only" : "finder-field-label"}>Search</span>
        <input
          type="search"
          name="restaurant-search"
          autoComplete="off"
          aria-label="Search restaurants, cuisines, areas and dishes"
          aria-controls="restaurant-grid"
          placeholder={rich ? "Restaurants or dishes" : "Restaurant, dish or cuisine"}
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
        />
      </label>

      <div className="finder-field">
        {icon(RESTAURANT_ICON)}
        <span className="finder-field-label" aria-hidden="true">{rich ? "Type of food" : "Cuisine"}</span>
        <span className="finder-field-value" aria-hidden="true">{cuisine === "All" ? (rich ? "All cuisines" : "Any cuisine") : cuisineGroups.find((group) => group.id === cuisine)?.name || cuisine}</span>
        <select
          className="finder-field-select"
          name="cuisine"
          aria-label="Cuisine"
          value={cuisine}
          onChange={(event) => onCuisineChange?.(event.target.value)}
        >
          <option value="All">Any cuisine</option>
          {cuisineGroups.length ? (
            <optgroup label="Dishes">
              {cuisineGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.name} ({group.count})</option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label="Cuisines">
            {cuisines.filter((item) => item !== "All").map((item) => (
              <option key={item} value={item}>{item} ({foodCounts[item] ?? 0})</option>
            ))}
          </optgroup>
        </select>
        {CHEVRON_ICON}
      </div>

      <div className="finder-field">
        {icon(PIN_ICON)}
        <span className="finder-field-label" aria-hidden="true">{rich ? "Location" : "Area"}</span>
        <span className="finder-field-value" aria-hidden="true">{area === "All" ? (rich ? <>All areas<span className="finder-long"> in Bahrain</span></> : "All areas") : area}</span>
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
        {icon(TAG_ICON)}
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
        <span className="finder-go-text">{rich ? "Find restaurants" : "Search"}</span>
        {rich ? <span className="finder-go-more" aria-hidden="true">{CHEVRON_RIGHT_ICON}</span> : null}
      </button>
    </form>
  );
}
