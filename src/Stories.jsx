import { useCallback, useEffect, useRef, useState } from "react";
import { restaurants, hoursLabel } from "./data/restaurants";
import { storyFrames } from "./data/stories";
import { CLOSE_ICON, SOUND_OFF_ICON, SOUND_ON_ICON } from "./components/icons.jsx";

/**
 * Story highlights for one restaurant: a full-screen player like Instagram
 * stories. A frame is a photo or a meal video. It is opened from the logo
 * seal on the restaurant's card; there is no separate rail.
 */

const storyRestaurants = restaurants.filter((r) => storyFrames(r.id).length > 0);
// The restaurants' own highlights. Other sets (like my meals) pass their own.
const RESTAURANT_STORIES = storyRestaurants.map((restaurant) => ({ restaurant, frames: storyFrames(restaurant.id) }));

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
export function StoryViewer({ storyId, groups = RESTAURANT_STORIES, onClose, onStoryChange, onOpenDetails, trigger }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const touchStart = useRef(null);
  const returnFocusTo = useRef(null);
  const videoRef = useRef(null);
  // Stories start muted (phones only autoplay silent video); one tap turns
  // the sound on for every video after it too.
  const [muted, setMuted] = useState(true);
  // A video's length, once known, drives its progress bar.
  const [videoMeta, setVideoMeta] = useState({ src: "", ms: 0, tall: false });

  const position = groups.findIndex((group) => group.restaurant.id === storyId);
  const restaurant = position >= 0 ? groups[position].restaurant : null;
  const frames = position >= 0 ? groups[position].frames : [];
  const frame = frames[index] || null;
  const isVideo = Boolean(frame?.video);
  const meta = isVideo && videoMeta.src === frame.video ? videoMeta : null;
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

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
    const nextRestaurant = groups[position + 1]?.restaurant;
    if (nextRestaurant) onStoryChange(nextRestaurant.id);
    else close();
  }, [index, frames.length, position, groups, close, onStoryChange]);

  const previous = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
      return;
    }
    const previousRestaurant = groups[position - 1]?.restaurant;
    if (previousRestaurant) onStoryChange(previousRestaurant.id);
  }, [index, position, groups, onStoryChange]);

  // Auto-advance, paused on hold. With "reduce motion" on, nothing moves by
  // itself: the visitor taps or uses the arrow keys to go on.
  // A video moves on when it ends instead.
  useEffect(() => {
    if (!frame || isVideo || paused || reduceMotion) return undefined;
    const timer = setTimeout(advance, frame.duration);
    return () => clearTimeout(timer);
  }, [frame, isVideo, paused, advance, reduceMotion]);

  // Holding the story pauses the video with it; the sound follows the toggle.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused, muted, frame]);

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
        {isVideo ? (
          <>
            {frame.poster ? <img className="story-backdrop" src={frame.poster} alt="" aria-hidden="true" /> : null}
            <video
              key={frame.video}
              ref={videoRef}
              className={`story-photo ${meta?.tall ? "is-tall" : ""}`}
              src={frame.video}
              poster={frame.poster}
              autoPlay
              muted
              playsInline
              preload="auto"
              aria-label={frame.caption || `${restaurant.name} video ${index + 1}`}
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setVideoMeta({
                  src: frame.video,
                  ms: Number.isFinite(video.duration) ? video.duration * 1000 : 0,
                  // An upright phone video fills the frame like a real story.
                  tall: video.videoWidth > 0 && video.videoHeight / video.videoWidth > 1.4,
                });
              }}
              onEnded={(event) => {
                // With "reduce motion" on, nothing moves on by itself.
                if (reduceMotion) {
                  event.currentTarget.currentTime = 0;
                  event.currentTarget.play().catch(() => {});
                } else {
                  advance();
                }
              }}
            />
          </>
        ) : (
          <>
            <img className="story-backdrop" src={frame.src} alt="" aria-hidden="true" />
            <img className="story-photo" src={frame.src} alt={frame.caption || `${restaurant.name} highlight ${index + 1}`} draggable="false" />
          </>
        )}

        <div className="story-bars" aria-hidden="true">
          {frames.map((item, i) => (
            <span key={`${restaurant.id}-${i}`} className="story-bar">
              <span
                className="story-bar-fill"
                // Seen photos are full, the current one fills over its
                // duration, and the ones still to come stay empty.
                // A video's bar waits for its length, then runs with it.
                style={
                  i === index && !reduceMotion && (!item.video || meta?.ms)
                    ? { animationDuration: `${item.video ? meta.ms : item.duration}ms`, animationPlayState: paused ? "paused" : "running" }
                    : { animation: "none", transform: i < index || (i === index && !item.video) ? "scaleX(1)" : "scaleX(0)" }
                }
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
          {isVideo ? (
            <button
              type="button"
              className="story-close story-sound"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted ? "Turn the sound on" : "Turn the sound off"}
              aria-pressed={!muted}
            >
              {muted ? SOUND_OFF_ICON : SOUND_ON_ICON}
            </button>
          ) : null}
          <button type="button" className="story-close" onClick={close} aria-label="Close highlights" ref={closeRef}>
            {CLOSE_ICON}
          </button>
        </div>

        {frame.caption ? (
          <p className="story-caption">
            {frame.caption}
            {frame.note ? <span className="story-note">{frame.note}</span> : null}
          </p>
        ) : null}

        <button type="button" className="story-tap story-tap-prev" onClick={previous} aria-label="Previous" />
        <button type="button" className="story-tap story-tap-next" onClick={advance} aria-label="Next" />

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
            View {restaurant.name}
          </button>
        </div>
      </div>
    </div>
  );
}
