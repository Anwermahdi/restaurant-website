import { useCallback, useState } from "react";
import { handleImgError } from "./media.js";

/**
 * The one image renderer for restaurant storefronts.
 *
 * The outer frame is always the fixed size supplied by the card/gallery. The
 * decision of how the photo sits inside it comes from
 * src/data/photo-display.js:
 *
 *   fit="cover"   a real landscape storefront fills the frame full-width. The
 *                 crop is bounded and steered by `focus`, so the sign stays in
 *                 view; the photo is never stretched or blurred.
 *   fit="contain" a portrait (or too-small) photo is shown whole on top of a
 *                 soft, blurred copy of itself. The sign is never cropped,
 *                 stretched or zoomed; the blurred mount just fills the frame
 *                 so the photo reads as a deliberate print rather than a
 *                 letterboxed mistake.
 */
export default function RestaurantPhoto({
  photo,
  src,
  alt = "",
  className = "",
  frameClassName = "",
  fit = "contain",
  focus = "center",
  loading = "lazy",
  fetchPriority,
  fallbacks = [],
  fallback = "",
  fallbackFinal = "",
  imgRef,
  onLoad,
  onError,
  ...imgProps
}) {
  const image = typeof photo === "string" ? { src: photo } : photo || {};
  const imageSrc = image.src || src || "";
  // The blurred mount follows the same fallback chain as the photo itself, so
  // a broken file never leaves a flat grey card behind. It is stored with the
  // source it belongs to, so a gallery that reuses the frame picks up the new
  // photo during render instead of one frame late.
  const [mount, setMount] = useState({ for: imageSrc, src: imageSrc });
  const mountSrc = mount.for === imageSrc ? mount.src : imageSrc;
  // The mount is only painted once its photo has arrived. Off-screen cards
  // therefore never fetch the same file twice: the lazy <img> stays in charge.
  const [readyFor, setReadyFor] = useState(null);
  const loaded = readyFor === imageSrc;

  const fallbackList = (Array.isArray(fallbacks) ? fallbacks : String(fallbacks || "").split(","))
    .filter(Boolean);
  const shownFit = fit === "cover" ? "cover" : "contain";

  const handleLoad = (event) => {
    setReadyFor(imageSrc);
    onLoad?.(event);
  };

  // A cached photo can finish before React attaches onLoad, so the ref checks
  // the element itself too.
  const attachRef = useCallback(
    (node) => {
      imgRef?.(node);
      if (node?.complete && node.naturalWidth > 0) setReadyFor(imageSrc);
    },
    [imgRef, imageSrc]
  );

  // Every hook above runs on every render; a place with no photo at all simply
  // renders nothing.
  if (!imageSrc) return null;

  const handleError = (event) => {
    const swapped = handleImgError(event);
    if (swapped) {
      const current = event.currentTarget.currentSrc || event.currentTarget.src;
      if (current) setMount({ for: imageSrc, src: current });
    } else {
      onError?.(event);
    }
  };

  return (
    <span
      className={`restaurant-photo-frame ${shownFit === "contain" ? "is-portrait" : "is-landscape"} ${frameClassName}`.trim()}
    >
      {shownFit === "contain" && loaded ? (
        <span
          className="restaurant-photo-mount"
          aria-hidden="true"
          style={{ backgroundImage: `url(${JSON.stringify(mountSrc)})` }}
        />
      ) : null}
      <img
        {...imgProps}
        ref={attachRef}
        className={`restaurant-photo is-${shownFit} ${className}`.trim()}
        src={imageSrc}
        alt={alt}
        width={image.width || undefined}
        height={image.height || undefined}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        style={{ objectPosition: focus }}
        data-fit={shownFit}
        data-fallbacks={fallbackList.join(",")}
        data-fallback={fallback}
        data-fallback-final={fallbackFinal}
        onLoad={handleLoad}
        onError={handleError}
      />
    </span>
  );
}
