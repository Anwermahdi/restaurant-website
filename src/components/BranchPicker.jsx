import { ARROW_ICON, CHEVRON_RIGHT_ICON, CLOCK_ICON, CLOSE_ICON, PIN_ICON } from "./icons.jsx";
import { locationMapsUrl, weekStatus } from "../data/restaurants.js";

/**
 * The list of places a brand is in.
 *
 * Every line carries only what was researched for that branch: the area, the
 * address, the hours and the phone. Nothing is filled in when it is unknown.
 */
export default function BranchPicker({ restaurant, locations, onSelect, onClose, mode = "browse" }) {
  if (mode === "directions") {
    return <DirectionsPicker restaurant={restaurant} locations={locations} onClose={onClose} />;
  }
  return (
    <div className="modal-backdrop branch-backdrop" onClick={onClose}>
      <div
        className="branch-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="branch-picker-head">
          <h2 id="branch-picker-title">
            Locations ({locations.length})
          </h2>
          <button type="button" className="close branch-close" onClick={onClose} aria-label="Close locations">
            {CLOSE_ICON}
          </button>
        </header>

        <ul className="branch-list">
          {locations.map((location) => {
            const status = weekStatus(location.hours);
            const mapUrl = locationMapsUrl(restaurant, location);
            return (
              <li key={location.name} className="branch-item">
                <button
                  type="button"
                  className="branch-pick"
                  onClick={() => onSelect(location)}
                >
                  <span className="branch-pick-text">
                    <strong>{location.name}</strong>
                    {location.address ? (
                      <span className="branch-address">
                        <span className="branch-icon">{PIN_ICON}</span>
                        {location.address}
                      </span>
                    ) : null}
                    {status ? (
                      <span className="branch-hours">
                        <span className="branch-icon">{CLOCK_ICON}</span>
                        {status}
                      </span>
                    ) : null}
                    {location.phone ? <span className="branch-phone">{location.phone}</span> : null}
                  </span>
                  <span className="branch-chevron" aria-hidden="true">{CHEVRON_RIGHT_ICON}</span>
                </button>
                {mapUrl ? (
                  <a
                    className="branch-map"
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps <span aria-hidden="true">{ARROW_ICON}</span>
                  </a>
                ) : (
                  <span className="branch-map branch-map--pending">Map unavailable</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** "Get directions" for a chain: pick the branch, go straight to its pin. */
function DirectionsPicker({ restaurant, locations, onClose }) {
  return (
    <div className="modal-backdrop branch-backdrop" onClick={onClose}>
      <div
        className="branch-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="branch-picker-head">
          <div>
            <h2 id="branch-picker-title">Which {restaurant.name}?</h2>
            <p className="branch-picker-sub">Choose a branch to get directions in Google Maps.</p>
          </div>
          <button type="button" className="close branch-close" onClick={onClose} aria-label="Close directions">
            {CLOSE_ICON}
          </button>
        </header>

        <ul className="branch-list">
          {locations.map((location) => {
            const status = weekStatus(location.hours);
            const mapUrl = locationMapsUrl(restaurant, location);
            const details = (
              <span className="branch-pick-text">
                <strong>{location.name}</strong>
                {location.address ? (
                  <span className="branch-address">
                    <span className="branch-icon">{PIN_ICON}</span>
                    {location.address}
                  </span>
                ) : null}
                {status ? (
                  <span className="branch-hours">
                    <span className="branch-icon">{CLOCK_ICON}</span>
                    {status}
                  </span>
                ) : null}
                {!mapUrl ? <span className="branch-map--pending">Map unavailable for this branch</span> : null}
              </span>
            );
            return (
              <li key={location.name} className="branch-item">
                {mapUrl ? (
                  <a className="branch-pick" href={mapUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}>
                    {details}
                    <span className="branch-chevron" aria-hidden="true">{ARROW_ICON}</span>
                    <span className="sr-only"> (opens Google Maps)</span>
                  </a>
                ) : (
                  <div className="branch-pick is-disabled">{details}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
