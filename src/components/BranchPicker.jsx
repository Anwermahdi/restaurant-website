import { CLOCK_ICON, PIN_ICON } from "./icons.jsx";
import { locationMapsUrl, weekStatus } from "../data/restaurants.js";

/**
 * The list of places a brand is in.
 *
 * Every line carries only what was researched for that branch: the area, the
 * address, the hours and the phone. Nothing is filled in when it is unknown.
 */
export default function BranchPicker({ restaurant, locations, onSelect, onClose }) {
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
          <button type="button" className="branch-close" onClick={onClose} aria-label="Close locations">
            ✕
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
                  <span className="branch-chevron" aria-hidden="true">›</span>
                </button>
                {mapUrl ? (
                  <a
                    className="branch-map"
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="branch-map branch-map--pending">Location not verified</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
