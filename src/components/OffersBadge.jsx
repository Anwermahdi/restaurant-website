import { PERCENT_ICON } from "./icons.jsx";

/**
 * The red offers flag that sits on a card's photo.
 *
 * It is only ever rendered when the place really has an offer, and it opens
 * the place's own offer details rather than a generic page. The flag names
 * the actual deal ("Buy 1 Get 1 Free", "25% discount", ...) instead of the
 * generic word "Offers", so the card says what the deal is at a glance.
 */
export default function OffersBadge({ text, count = 0, onClick, label }) {
  return (
    <button
      type="button"
      className="offers-badge"
      onClick={onClick}
      title={text || undefined}
      aria-label={label || `See ${count} offer${count === 1 ? "" : "s"}`}
    >
      <span className="offers-badge-icon">{PERCENT_ICON}</span>
      <span className="offers-badge-text">{text || "Offers"}</span>
    </button>
  );
}
