import { useEffect, useRef, useState } from "react";
import { CHEVRON_LEFT_ICON, CHEVRON_RIGHT_ICON } from "./icons.jsx";
import RestaurantLogo from "./RestaurantLogo.jsx";
import { MEAL_VIDEOS } from "../data/meal-videos.js";
import { restaurants } from "../data/restaurants.js";

const byId = new Map(restaurants.map((r) => [r.id, r]));
const MEALS = MEAL_VIDEOS.filter((meal) => (meal.src || meal.poster) && byId.has(meal.restaurantId));
// The first slide is always the welcome on the red and the Manama sunset;
// every real meal follows it.
const SLIDES = [{ intro: true }, ...MEALS];
const SLIDE_MS = 6000;

const PAUSE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
);
const PLAY_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5v13l11-6.5z" /></svg>
);

/**
 * The banner at the top of the front page: the welcome slide, then one
 * slide per best meal (video or photo) filling the whole banner, with its
 * name and a way to its restaurant. It moves on every six seconds; arrows,
 * dots and a pause button let people take over. With "reduce motion" on, it
 * starts paused.
 */
export default function HeroMeals({ total, onOpen }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
  const videoRefs = useRef([]);
  const count = SLIDES.length;
  const go = (delta) => setIndex((current) => (current + delta + count) % count);

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, count]);

  // Only the slide on show plays its video.
  useEffect(() => {
    videoRefs.current.forEach((video, position) => {
      if (!video) return;
      if (position === index && !paused) video.play().catch(() => {});
      else video.pause();
    });
  }, [index, paused]);

  return (
    <section className="banner" aria-roledescription="carousel" aria-label="Best meals in Bahrain">
      {SLIDES.map((slide, position) => {
        const on = position === index;
        if (slide.intro) {
          return (
            <div key="intro" className={`banner-slide banner-slide--intro ${on ? "is-on" : ""}`} aria-hidden={!on}>
              <div className="banner-sky" aria-hidden="true" />
              <div className="banner-copy">
                <h1>Where Bahrain eats.</h1>
                <p>{total} restaurants with real menus, hours and locations.</p>
              </div>
            </div>
          );
        }
        const restaurant = byId.get(slide.restaurantId);
        return (
          <div key={slide.src || slide.poster} className={`banner-slide ${on ? "is-on" : ""}`} aria-hidden={!on}>
            {slide.src ? (
              <video
                ref={(node) => { videoRefs.current[position] = node; }}
                src={slide.src}
                poster={slide.poster}
                muted
                loop
                playsInline
                preload={position === 1 ? "auto" : "none"}
                tabIndex={-1}
                aria-hidden="true"
              />
            ) : (
              <img src={slide.poster} alt="" loading={position === 1 ? "eager" : "lazy"} />
            )}
            <div className="banner-copy">
              <h2>{slide.dish}</h2>
              <p className="banner-place">
                <span className="banner-seal" aria-hidden="true"><RestaurantLogo restaurant={restaurant} /></span>
                at {restaurant.name}
              </p>
              <button
                type="button"
                className="banner-cta"
                tabIndex={on ? 0 : -1}
                onClick={(event) => onOpen(restaurant, event.currentTarget)}
              >
                See the restaurant {CHEVRON_RIGHT_ICON}
              </button>
            </div>
          </div>
        );
      })}

      {count > 1 ? (
        <>
          <button type="button" className="banner-arrow banner-arrow--prev" onClick={() => go(-1)} aria-label="Previous slide">
            {CHEVRON_LEFT_ICON}
          </button>
          <button type="button" className="banner-arrow banner-arrow--next" onClick={() => go(1)} aria-label="Next slide">
            {CHEVRON_RIGHT_ICON}
          </button>
          <div className="banner-controls">
            {/* Up next: a small picture of every slide. Under the one on show,
                a red bar fills over its six seconds. */}
            <div className="banner-thumbs" role="group" aria-label="Choose a slide">
              {SLIDES.map((slide, position) => {
                const on = position === index;
                return (
                  <button
                    key={slide.intro ? "intro" : slide.src || slide.poster}
                    type="button"
                    className={`banner-thumb ${on ? "is-on" : ""}`}
                    aria-label={`Slide ${position + 1} of ${count}${slide.intro ? ": welcome" : `: ${slide.dish}`}`}
                    aria-current={on ? "true" : undefined}
                    onClick={() => setIndex(position)}
                  >
                    {slide.intro ? (
                      <span className="banner-thumb-sky" aria-hidden="true" />
                    ) : slide.poster ? (
                      <img src={slide.poster} alt="" loading="lazy" />
                    ) : (
                      <video src={`${slide.src}#t=1`} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" />
                    )}
                    {on ? (
                      <span
                        key={`${index}-${paused}`}
                        className={`banner-thumb-bar ${paused ? "is-paused" : ""}`}
                        style={{ animationDuration: `${SLIDE_MS}ms` }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="banner-pause"
              aria-label={paused ? "Play the slides" : "Pause the slides"}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? PLAY_ICON : PAUSE_ICON}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
