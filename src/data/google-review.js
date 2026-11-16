// Manual conflict resolution for Google Places data.
//
// The sync fills missing fields automatically, but when Google and Foodfind
// both have a different value it keeps the Foodfind value and records a
// conflict in src/data/google-places.js. Use this file to choose Google for a
// specific branch/field after checking the admin page (/admin.html).
//
// Shape:
//   export const GOOGLE_FIELD_CHOICES = {
//     "white-house": {
//       "Busaiteen": { phone: "google", hours: "google", address: "google" },
//       "Hamad Town": { phone: "foodfind" },
//     },
//   };
//
// The branch key is the Foodfind branch name (case-insensitive). You can also
// use the Google Place ID instead of the name. Supported fields: name, address,
// area, phone, hours, lat, lng, website, rating, reviews, businessStatus.
// `rating` and `reviews` already prefer fresh Google values by default.
export const GOOGLE_FIELD_CHOICES = {};
