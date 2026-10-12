# FoodFind

A responsive restaurant directory for Bahrain, built with React and Vite. Visitors can search restaurants and menu dishes, filter by cuisine, price, and area, then open restaurant details with locations and external links.

## Features

- Search across restaurant names, cuisines, cities, addresses, and dishes
- Cuisine, price, and location filters
- Restaurant menus with dish search and vegetarian-only filtering
- Google Maps, phone, and Instagram links
- Responsive card grid and mobile-friendly restaurant dialog
- Keyboard-friendly dialog with focus management, Escape-to-close, and visible focus states
- Curated local images and logos with resilient fallbacks

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Checks

```bash
npm run lint
npm run build
node scripts/selfcheck.mjs
```

## Restaurant data

Restaurant records live in `src/data/restaurants.js`. The exported data is filtered to the supported cuisine list before it reaches the UI.

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
