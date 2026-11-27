# FoodFind

A restaurant directory for Bahrain (117 restaurants). React 19 + Vite 8, plain JSX, hash routing (`#restaurant/[id]`). There is no backend: all data is in `src/data/`.

## Commands

- `npm run dev`: dev server on port 5173 (launch config `restaurant-website`)
- `npm run build`: Vite build. There is no test runner, so the build passing is the test.
- `npm run lint`: oxlint. It is clean (no warnings, no errors). Keep it that way.
- `npm run locations:audit`: Google Places check. It needs `GOOGLE_PLACES_API_KEY` in `.env.local`.

If Vite serves stale modules after a large edit (an old CSS rule, "does not provide an export named 'default'"), restart the dev server.

## Where things live

- `src/data/restaurants.js`: every restaurant. `mk()` sets defaults. `priceRange` defaults to "$$" and is **not** real data.
- `src/components/cards/cardData.js`: the only place that decides what a card shows. Add new card fields here, not in JSX.
- The home page is sections by time of day (`src/data/meal-sections.js`, `src/components/MealSections.jsx`). A place's meals come from its researched opening hours (`mealsFromHours` in `restaurants.js`; cafes also go in "Coffee and desserts"), and a place with no hours is in no section. Each section's "See all" opens the full list (its own page, `#restaurants`) with the same meal filter, so the counts always match.
- The design language is the "signboard": a red sign panel (`--sign`) beside the storefront or skyline photo, bold left-aligned display type, and quiet cards. Keep new screens in it.
- `src/components/RestaurantCard.jsx`: the card (an edge-to-edge photo with the logo seal, left-aligned facts, "View details" plus icon buttons). Shared parts are in `cards/CardParts.jsx`, and the offer and photo dialogs are in `cards/CardDialogs.jsx`.
- `src/components/RestaurantPage.jsx` works out the restaurant page's data. `restaurant-page/RestaurantPageView.jsx` and `restaurant-page.css` draw it.
- `src/App.css`: site styles and tokens. `src/styles/home.css`: front page hero and cuisine strip. `src/components/cards/cards.css`: card styles (`.cx`, `.cxs`).
- `scripts/`: Node data and audit scripts. Their output goes in `reports/` (gitignored).

## Honest data (the most important rule)

Never invent ratings, review counts, opening hours, offers, facilities, prices, phone numbers or descriptions. If a value is missing, hide it or show a quiet fallback.

- Show price only when `priceSource` exists.
- Show facilities only when `restaurant.facilities.source` exists.
- Show the "verified" badge only when `verification.status === "verified"`.
- Hide templated descriptions (`"{name} — X in Y."`).
- Data changes from Google need the official Places API. Never scrape Google Maps or get around a CAPTCHA. Apply only matches you have confirmed.

## Design rules

- Tokens are CSS custom properties (`--bg`, `--surface`, `--card`, `--ink`, `--accent`, `--line`…) with light and dark variants. Use tokens, not hard-coded colours.
- Red has two jobs: `--accent-fill` behind white text (buttons, badges) and `--accent-text` for red words. Never put white text on `--accent` itself: in dark mode it is too light.
- Pop-ups use `useFocusTrap` (focus goes in, stays in, and comes back). Map pins and popups are HTML strings: escape every data value with `escapeHtml`.
- The card grid has 4 columns on desktop, 3 on tablet (768px and up) and 2 on mobile. No overlapping text, buttons or badges. Cards in a row are the same height, with their buttons aligned at the bottom. Photos crop to fill the frame without heavy zoom.
- When a brief covers only one part (for example the cards), don't change the header, navigation, filters or other sections.
- For a redesign, show options first. Replace the live version only after the user approves one.
- Check every visual change at desktop width and at a 375px phone width, in light and dark mode, with no console errors.
- For design work, use the frontend-design skill (`.agents/skills/frontend-design`).

## Secrets

`GOOGLE_PLACES_API_KEY` goes only in `.env.local`, which is gitignored. Never give it a `VITE_` prefix, never commit it, and never ask the user to paste it into chat.

## Git

Ask before committing or pushing. Run `npm run build` and `npm run lint` before you commit.

## Feature workflow (RPI)

For a feature that needs more than a quick fix, use Research → Plan → Implement:

1. Describe the feature in `rpi/<feature-slug>/REQUEST.md`.
2. `/rpi:research rpi/<feature-slug>/REQUEST.md` gives a GO / NO-GO verdict in `research/RESEARCH.md`.
3. `/rpi:plan <feature-slug>` writes `pm.md`, `ux.md`, `eng.md` and `PLAN.md` in `plan/`.
4. `/rpi:implement <feature-slug>` builds the plan phase by phase and stops for your approval after each phase.

For bug fixes and small changes, skip RPI and make the change directly.
