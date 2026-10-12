import { useCallback, useEffect, useRef, useState } from "react";
import { restaurants, hoursLabel } from "./data/restaurants";
import { storyFrames } from "./data/stories";

/**
 * Story highlights for one restaurant: a full-screen player like Instagram
 * stories. It is opened from the circle on the restaurant's card, or from the
 * Highlights block on its details page - there is no separate rail.
 */

const storyRestaurants = restaurants.filter((r) => storyFrames(r.id).length > 0);

function Circle({ restaurant, large }) {
  return (
    <span className="highlight-wrap" aria-hidden={large ? "true" : undefined}>
      <span className="highlight-letter" aria-hidden="true">
        {restaurant.name.charAt(0)}
      </span>
      <img
        className="highlight"
        src={restaurant.logoUpload}
        data-rid={restaurant.id}
        data-official={restaurant.logo}
        alt=""
        width="56"
        height="56"
        loading="lazy"
        decoding="async"
        onError={(event) => {
          const el = event.currentTarget;
          const step = Number(el.dataset.step || "0");
          const next = step === 0 ? `/restaurants/logos/${el.dataset.rid}.png` : el.dataset.official || null;
          if (next) {
            el.dataset.step = String(step + 1);
            el.src = next;
          } else {
            el.style.display = "none";
          }
        }}
      />
    </span>
  );
}

/** Full-screen story player. Null when no story is open. */
export function StoryViewer({ storyId, onClose, onStoryChange, onOpenDetails, trigger }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const touchStart = useRef(null);
  const returnFocusTo = useRef(null);

  const position = storyRestaurants.findIndex((r) => r.id === storyId);
  const restaurant = position >= 0 ? storyRestaurants[position] : null;
  const frames = restaurant ? storyFrames(restaurant.id) : [];
  const frame = frames[index] || null;

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  // Read the frame from state instead of updating inside a state updater:
  // a side effect in an updater runs twice and skipped a frame when the
  // viewer rolled over into the next restaurant.
  const advance = useCallback(() => {
    if (index + 1 < frames.length) {
      setIndex(index + 1);
      return;
    }
    const nextRestaurant = storyRestaurants[position + 1];
    if (nextRestaurant) onStoryChange(nextRestaurant.id);
    else close();
  }, [index, frames.length, position, close, onStoryChange]);

  const previous = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
      return;
    }
    const previousRestaurant = storyRestaurants[position - 1];
    if (previousRestaurant) onStoryChange(previousRestaurant.id);
  }, [index, position, onStoryChange]);

  // Auto-advance, paused on hold.
  useEffect(() => {
    if (!frame || paused) return undefined;
    const timer = setTimeout(advance, frame.duration);
    return () => clearTimeout(timer);
  }, [frame, paused, advance]);

  // Advancing to the next restaurant in the rail.
  useEffect(() => {
    if (!restaurant) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Prefer the control the visitor actually pressed; a programmatic click
    // leaves focus on <body>, which is no use to put it back on.
    returnFocusTo.current = trigger?.isConnected ? trigger : document.activeElement;
    const raf = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        advance();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      } else if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        setPaused((p) => !p);
      } else if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), a[href]');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!dialogRef.current.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(raf);
      const target = returnFocusTo.current;
      if (target && typeof target.focus === "function") target.focus();
    };
  }, [restaurant, close, advance, previous, trigger]);

  if (!restaurant || !frame) return null;

  return (
    <div
      className="story-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${restaurant.name} highlights`}
      ref={dialogRef}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(event) => {
        setPaused(false);
        const start = touchStart.current;
        const end = event.changedTouches[0].clientX;
        if (start === null || Math.abs(end - start) < 45) return;
        if (end < start) advance();
        else previous();
      }}
    >
      <div className="story-frame">
        {/* A blurred copy of the same photo fills the frame, so a landscape menu
            page or a portrait meal shot both sit well without being cropped. */}
        <img className="story-backdrop" src={frame.src} alt="" aria-hidden="true" />
        <img className="story-photo" src={frame.src} alt={frame.caption || `${restaurant.name} highlight ${index + 1}`} draggable="false" />

        <div className="story-bars" aria-hidden="true">
          {frames.map((item, i) => (
            <span key={`${restaurant.id}-${i}`} className="story-bar">
              <span
                className="story-bar-fill"
                style={{
                  animationDuration: `${item.duration}ms`,
                  animationPlayState: i < index ? "finished" : paused ? "paused" : "running",
                  animationDelay: i < index ? "-99999ms" : "0ms",
                }}
              />
            </span>
          ))}
        </div>

        <div className="story-top">
          <Circle restaurant={restaurant} large />
          <div className="story-who">
            <strong>{restaurant.name}</strong>
            <span>
              {restaurant.cuisine}
              {hoursLabel(restaurant) ? ` · ${hoursLabel(restaurant)}` : ""}
            </span>
          </div>
          <button type="button" className="story-close" onClick={close} aria-label="Close highlights" ref={closeRef}>
            ✕
          </button>
        </div>

        {frame.caption ? <p className="story-caption">{frame.caption}</p> : null}

        <button type="button" className="story-tap story-tap-prev" onClick={previous} aria-label="Previous photo" />
        <button type="button" className="story-tap story-tap-next" onClick={advance} aria-label="Next photo" />

        <div className="story-foot">
          <span className="story-counter">
            {index + 1} / {frames.length}
          </span>
          <button
            type="button"
            className="story-link"
            onClick={() => {
              close();
              onOpenDetails?.(restaurant.id);
            }}
          >
            View {restaurant.name} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
