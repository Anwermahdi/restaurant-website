# FoodFind

A responsive restaurant directory for Bahrain, built with React and Vite. Visitors can search restaurants and menu dishes, filter by cuisine, price, and area, then open restaurant details with locations and external links.

## Features

- Search across restaurant names, cuisines, cities, addresses, and dishes
- Cuisine, price, and location filters
- Breakfast / lunch / dinner filter, set by hand in `src/data/meal-times.js`
- Offers-only, open-now and rating filters, each shown only when there is real data behind it
- One search bar at the top — search, food type, location, offers — and no duplicate filter stack
- Cuisine shortcuts that set the same food-type value as the search bar
- Sort by recommended, top rated or name A–Z
- One card per brand: a place with several branches shows "3 locations" and opens a branch list
- Surprise me: opens a random place that matches what is on screen
- Grid, list and map views of the same results
- Save places with the heart on a card or in the header; the "Saved" filter shows just those (kept in the browser)
- Share any place from its card: the phone's own share sheet, or a copied link
- Restaurant menus with dish search and vegetarian-only filtering
- Google Maps, phone, and Instagram links
- Responsive card grid: two cards per row on a phone, three on a tablet, four on a desktop
- Card photos are shown whole: a portrait photo is never blown up and blurred
- Keyboard: `/` focuses the search, `Esc` closes a dialog, and focus is trapped while one is open
- A mobile bottom bar for Explore, Search and Saved
- Paper-and-ink design in `src/App.css`: one stylesheet, one theme, no emoji icons

## Design system

| Token | Value | Use |
|---|---|---|
| `--green` | `#07513D` | Emerald: nav, actions, the "All food" chip |
| `--deep` | `#113F33` | Headings and deep text |
| `--gold` | `#D99E35` | Honey gold: accents, the "in Bahrain." line, the active chip |
| `--paper` | `#FAF8F2` | Warm cream background |
| `--offer` | `#E94B43` | The offers flag |

Type is **DM Sans** for the interface and **Fraunces** for the headlines, both
from Google Fonts.

## Project layout

```
src/
  App.jsx                 the page: header, hero, filters, grid, dialog
  App.css                 the whole design system, one stylesheet
  components/
    RestaurantCard.jsx    one restaurant, sized by the width of its own column
    RestaurantGrid.jsx    the grid, the list view and the paging
    RestaurantSearch.jsx  the main search bar: search, food type, area, offers
    RestaurantFilters.jsx the extra filters the search bar does not cover
    CuisineBadge.jsx      one pastel food-type pill
    OffersBadge.jsx       the red offers flag
    RestaurantCardSkeleton.jsx  the placeholder for a card on its way
    BranchPicker.jsx      the list of branches behind "View locations"
    icons.jsx             every icon in the app
    media.js              the image and logo fallback chains
    useMediaQuery.js      a media query as state
  data/
    restaurants.js        the restaurant records and the helpers over them
```

## The one filter source of truth

The search bar at the top of the page is the only place a visitor filters:
the words they type, the type of food, the area and the offers. The cuisine
shortcuts below it set the same food-type value, so there is never a second
filter stack to keep in step. The remaining filters (meal, rating, offers
only, open now) sit behind **Filters** next to the view switcher.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (http://localhost:5173 by default).

## Testing the responsive design

The dev server hot-reloads, so the whole page can be checked in one pass.

1. Start the server with `npm run dev`.
2. Open the printed URL and use the browser's device toolbar (Chrome: `Ctrl`+`Shift`+`M`).
3. Step through the widths that matter: **320, 360, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px**.

At each width check that:

- the grid has the right number of columns (1 below 320px, 2 to 767px, 3 to 1023px, 4 from 1024px up);
- there is no horizontal scrolling of the page (the cuisine chips scroll sideways on their own, and nothing else does);
- the card's name, rating, food types, area, hours and both buttons are readable and never clipped;
- the buttons are 44px tall or more, and stack on the narrow cards;
- the offers flag only appears on a place that really has an offer.

Turn on the browser's device toolbar "Show rulers" and the CSS grid overlay if a
column looks off, and use the accessibility tree in DevTools to check that every
control still has a name.

## Multiple branches

A brand with more than one branch shows one card, and the card's location line
reads "3 locations". The **View locations** button opens a list of the branches,
and the details popup has a **Locations** section where picking a branch
updates the address, the hours, the phone number and the Maps link.

The menus and offers belong to the brand, so they are shared by every branch and
open straight away.

Each branch's own details must come from its own Google listing. A branch with
no exact location keeps only its name: the site shows **Location not verified**
and never puts a neighbourhood-centre pin on the map.

The location audit uses the official **Google Places API (New)** and never edits
restaurant data automatically:

```bash
# Current stored data, for review (no API calls)
npm run locations:audit -- --only=al-haseer,white-house,tren-tren

# Cost estimate before a live run
npm run locations:audit -- --estimate --only=al-haseer

# Live verification (requires GOOGLE_PLACES_API_KEY)
npm run locations:audit -- --live --only=al-haseer --yes
```

Add the key to `.env.local` (server-side only):

```bash
GOOGLE_PLACES_API_KEY=your-key
```

The report is written to `reports/location-audit.html` (and `.md` / `.json`).
It separates **Verified**, **Needs review**, and **Missing** locations, shows the
Google Place ID, coordinates, listing link and directions link, and lists
possible listings instead of silently choosing one. Existing accurate data is
never overwritten.

## Checks

```bash
npm run lint
npm run build
node scripts/selfcheck.mjs
```

## Restaurant data

Restaurant records live in `src/data/restaurants.js`. The exported data is filtered to the supported cuisine list before it reaches the UI.

### Meal times (breakfast / lunch / dinner)

Every restaurant serves dinner and nothing else. Breakfast and lunch are yours
to set, by editing `src/data/meal-times.js`:

```js
export const MEAL_OVERRIDES = {
  "5 Spoons": ["Breakfast", "Lunch"],  // add meals
  "adam-subs": { Dinner: false },      // remove a meal
};
```

The key is the restaurant name or its id — either works. Restaurants you do not
list stay dinner-only, and a meal only appears in the filter once at least one
restaurant has it.

To see every restaurant with its id, name and current meals:

```bash
npm run meals:list              # all of them
npm run meals:list breakfast    # only the ones that serve breakfast
```

For a locally hosted restaurant photo, add a real image at:

```text
public/restaurants/<restaurant-id>.jpg
```

For a local circular logo, add:

```text
public/restaurants/logos/<restaurant-id>.jpg
```

Supported image extensions are `.jpg`, `.jpeg`, `.webp`, and `.png`. Keep restaurant photos sharp and food-focused; square logos work best.

## Optional data scripts

Set `GOOGLE_PLACES_API_KEY` before running the enrichment command to update supported restaurant details from Google Places:

```bash
npm run enrich:places
```

Additional maintenance scripts are available in `scripts/` for fetching logos and food photos.
