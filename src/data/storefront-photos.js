// ============================================================
// Storefront photo registry - the manual approval file.
//
// Every restaurant's main card image and details hero are chosen by
// src/data/photo-display.js. This file is where a person approves a photo or
// records that a real landscape replacement is still needed. It is never
// generated away: scripts/photo-set.mjs edits it, and hand edits are welcome.
//
// Entry shape
//   status:    "approved" | "needs-replacement"
//   src:       optional. The exact file to use as the main storefront photo.
//              It must be a real photo of this restaurant, never a stock or
//              AI image. Leave it out to let the selector use the best
//              existing photo from the restaurant's own gallery.
//   width/height: real pixel size of src (so layout does not shift).
//   source:    where the photo came from, e.g. "Foodfind listing photo",
//              "Official Instagram", "Google Places (Place ID ...)".
//   credit:    photographer / attribution text required by the source.
//   focus:     object-position used only when the photo is shown with a
//              gentle crop (e.g. "center 32%"). Omit for portraits, which are
//              always shown whole.
//   approvedAt / note: audit trail for the reviewer.
//
// The frame rules live in PHOTO_RULES below. They are shared by the cards,
// the details gallery and scripts/photo-audit.mjs so the report and the page
// always agree.
// ============================================================

export const PHOTO_RULES = {
  // A storefront must be at least this wide to stay sharp in a card at 2x.
  minCardWidth: 640,
  // From this ratio on, a photo is landscape and may fill the frame. Below
  // it the photo is shown whole (contain) instead of being cropped.
  minLandscapeRatio: 1.18,
  // Very wide panoramas lose too much height in the card frame.
  maxLandscapeRatio: 2.4,
  // The card frame is 4:3 and the details hero is 16:9 (see App.css).
  cardRatio: 4 / 3,
  detailRatio: 16 / 9,
};

export const STOREFRONT_PHOTOS = {
  "aseeri-star": {
    "status": "needs-replacement",
    "source": "Foodfind listing photo",
    "note": "Real storefront, night shot, 382x510 portrait. Sign and entrance are complete, so it stays visible whole until a landscape storefront is sourced."
  },
  "chicken-land-cafeteria": {
    "status": "needs-replacement",
    "source": "Foodfind listing photo",
    "note": "289x312 portrait and the source crop already cuts the sign on the left. Needs an official or Google Places landscape storefront of the full frontage."
  },
  "white-house": {
    "status": "approved",
    "source": "Foodfind listing photo",
    "focus": "center 32%",
    "approvedAt": "2026-10-29",
    "note": "680x382 landscape: full sign, entrance and building visible. Approved as the pilot reference for the landscape treatment."
  },
  "wadi-altayibin-grills": {
    "status": "needs-replacement",
    "source": "Foodfind listing photo",
    "note": "289x312 portrait of the illuminated frontage. Sign and entrance are visible; needs a landscape storefront from the official source or Google Places."
  }
};
