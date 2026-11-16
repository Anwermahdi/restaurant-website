// Image fallbacks for the card and the details page.
//
// Every card photo has a chain: the real file for that restaurant, then a
// researched photo, then a cuisine placeholder. Nothing is requested that is
// known not to exist, and the last link in the chain always exists.

/** Card image chain: real file, then researched photo, then cuisine photo. */
export function handleImgError(e) {
  const el = e.currentTarget;
  const step = Number(el.dataset.step || "0");
  const fallbacks = (el.dataset.fallbacks || "").split(",").filter(Boolean);
  let next = fallbacks[step] || null;
  if (!next) {
    const rest = step - fallbacks.length;
    next = rest === 0 ? el.dataset.fallback : rest === 1 ? el.dataset.fallbackFinal : null;
  }
  if (next && el.src !== next) {
    el.dataset.step = String(step + 1);
    el.src = next;
    return true;
  }
  return false;
}

/** Logo chain: the uploaded mark, then a webp/png of it, then the official one.
 *  Returns true while another source was queued, false when the chain is done. */
export function handleLogoError(e) {
  const el = e.currentTarget;
  const step = Number(el.dataset.step || "0");
  const id = el.dataset.rid;
  const next =
    step === 0 && id ? `/restaurants/logos/${id}.webp`
    : step === 1 && id ? `/restaurants/logos/${id}.png`
    : step === 2 ? el.dataset.official || null
    : null;
  if (next) {
    el.dataset.step = String(step + 1);
    el.src = next;
    return true;
  }
  el.style.display = "none";
  return false;
}
