import { useEffect, useRef, useState } from "react";
import { CHEVRON_LEFT_ICON, CHEVRON_RIGHT_ICON, CLOSE_ICON, PERCENT_ICON } from "../icons.jsx";
import RestaurantPhoto from "../RestaurantPhoto.jsx";
import useFocusTrap from "../useFocusTrap.js";

// Escape closes, the page behind stays still, focus goes in, stays in while
// the pop-up is open, and comes back afterwards.
function useDialog(onClose, returnTo, dialogRef) {
  const closeRef = useRef(null);
  useFocusTrap(dialogRef);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      if (returnTo && returnTo.isConnected) returnTo.focus();
    };
  }, [onClose, returnTo]);
  return closeRef;
}

/** The real offers of one place: the app, the deal and where to claim it. */
export function OfferDetails({ restaurant, offers, onClose, returnTo }) {
  const dialogRef = useRef(null);
  const closeRef = useDialog(onClose, returnTo, dialogRef);
  return (
    <div className="modal-backdrop cx-sheet-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="cx-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cx-offer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cx-sheet-head">
          <div>
            <h2 id="cx-offer-title">Offers at {restaurant.name}</h2>
            <p>{offers.length === 1 ? "1 offer" : `${offers.length} offers`} through partner apps</p>
          </div>
          <button type="button" className="close" ref={closeRef} onClick={onClose} aria-label="Close offers">
            {CLOSE_ICON}
          </button>
        </header>
        <ul className="cx-offer-list">
          {offers.map((offer) => (
            <li key={offer.app} className="cx-offer-item">
              <span className="cx-offer-app">
                {offer.icon ? <img src={offer.icon} alt="" width="28" height="28" /> : <span aria-hidden="true">{PERCENT_ICON}</span>}
              </span>
              <div className="cx-offer-body">
                <span className="cx-offer-app-name">{offer.app}</span>
                <strong>{offer.text}</strong>
                {offer.url ? (
                  <a href={offer.url} target="_blank" rel="noopener noreferrer">
                    Open the {offer.app} offer
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="cx-sheet-note">
          Terms, dates and eligibility are set by each app and can change. Check the app before you order.
        </p>
      </div>
    </div>
  );
}

/** Every photo of the place, shown whole: no crop, no zoom. */
export function PhotoGallery({ restaurant, photos, onClose, returnTo }) {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef(null);
  const closeRef = useDialog(onClose, returnTo, dialogRef);
  const count = photos.length;
  const go = (delta) => setIndex((current) => (current + delta + count) % count);

  useEffect(() => {
    if (count < 2) return undefined;
    const onKey = (event) => {
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % count);
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + count) % count);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count]);

  return (
    <div ref={dialogRef} className="detail-lightbox" role="dialog" aria-modal="true" aria-label={`Photos of ${restaurant.name}`} onClick={onClose}>
      <button type="button" className="detail-lightbox-close" ref={closeRef} onClick={onClose} aria-label="Close photos">
        {CLOSE_ICON}
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            className="detail-lightbox-arrow detail-lightbox-arrow--prev"
            onClick={(event) => { event.stopPropagation(); go(-1); }}
            aria-label="Previous photo"
          >
            {CHEVRON_LEFT_ICON}
          </button>
          <button
            type="button"
            className="detail-lightbox-arrow detail-lightbox-arrow--next"
            onClick={(event) => { event.stopPropagation(); go(1); }}
            aria-label="Next photo"
          >
            {CHEVRON_RIGHT_ICON}
          </button>
        </>
      )}
      <RestaurantPhoto
        key={photos[index].src}
        photo={photos[index]}
        alt={`${restaurant.name}, photo ${index + 1} of ${count}`}
        frameClassName="detail-lightbox-photo"
        loading="eager"
        fallback={restaurant.fallbackImage}
        fallbackFinal={restaurant.fallbackFinal}
        onClick={(event) => event.stopPropagation()}
      />
      <span className="detail-lightbox-counter">{index + 1} / {count}</span>
    </div>
  );
}
