// Pick the main photo for a restaurant. This file is the manual override;
// scripts/select-primary-photo.mjs edits it for you.
//
// Values:
//   "existing"   keep the Foodfind photo first
//   "google:0"   use the first cached Google photo
//   "google:1"   use the second cached Google photo, and so on
//
// Restaurants not listed here keep their Foodfind photo, or switch to Google
// only when the script found no usable local photo.
export const PHOTO_SELECTION = {};
