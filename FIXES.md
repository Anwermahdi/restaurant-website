# FoodFind — fix list

Audit of the site as of 2026-11-16 (dev server, desktop 1024px + phone 375px, plus a script over `src/data/restaurants.js`).
Project: React 19 + Vite 8, data in `src/data/restaurants.js`, page in `src/App.jsx`, styles in `src/App.css`.

Good news first: the build passes, no console errors, no broken images, no missing image files, no horizontal scroll on phone, no duplicate restaurants.

---

## 1. Broken / dead UI (fix first)

1. **Account button does nothing** — `src/App.jsx` ~line 650, `nav-account` button has no `onClick`. Either remove it or give it a purpose (e.g. open Saved).
2. **Hamburger menu won't close** — the dropdown (Explore restaurants / Saved places / Surprise me) stays open after pressing Esc, clicking outside, or switching to Map view. Add Esc + outside-click close, and close it after any item is picked (`navOpen` in `App.jsx`).
3. **"1 restaurants"** — the result count doesn't handle singular (seen with the Seafood chip). Use "1 restaurant".
4. **"Map pending"** shows on cards (ShawarmaZ, LAHAB) — internal status leaking to visitors. Hide the map button or show "Location not available" instead.
5. **"Exact location not verified yet."** in the details popup — same problem, internal wording. Reword or hide.
6. **"Open daily" with no real hours** — `statusLabel()` in `restaurants.js` (~line 4325) returns "Open daily" when `hours` is a string it can't parse. 55 places have no valid hours, and many of them (Chicken Land, White House, Tren Tren, Wadi Al Tayibeen…) wrongly say "Open daily". Show "Hours unavailable" or the raw text instead.
7. **"Closed · Opens 6:30"** (Sando X Urban) — missing AM/PM.
8. **Status text cut off on cards** — "Open · Close…" is truncated in the 3-column grid. Shorten it ("Open till 4 AM") or let it wrap.

## 2. Wrong data

9. **Wrong cuisines**
   - Fatto: "Levantine salads, grills and fattoush" but tagged **Italian**.
   - Zulu: South-Asian (tandoori, biryani) but main cuisine **Italian** (and the description mentions "paella").
   - The Bossman: "Italian-American kitchen" filed under Burger — check.
   - FYR: burgers/tacos filed under Grill — check.
10. **Location dropdown has raw street addresses as areas**: "112 Rd No 3803, Manama" and "Rd No 2431, Manama". Those should map to "Manama". Also duplicates: "Hidd" and "Al Hidd", "Maqabah" and "Muqaba", "City Centre"/"Sea Front" aren't areas.
11. **Area doesn't match description**: Lahom (area Maqabah, text says Muqaba), Hashtag (area Isa Town, text says Zayed Town), Cheesy Burger (area Maqabah, text says Samaheej).
12. **LAHAB details show city "Manama"** but it's in Arad (Muharraq).
13. **17 restaurants have an empty `area`** (Engineer Burger, Jan Burger, Al Mihwar, Adam Subs, Dave Burger, Mama Joz, Little Caesars, Pizzaro, IC Pizza, The72, Welayat Ali, Al Furat Nights, Al Farhan Grills, Swaikhat, Tikka Numee, Al Jabriya, Chico Chicken) — they disappear from the area filter. 17 also only have area-centre coordinates (`coordSource: "area"`), so their map pins are approximate.
14. **"Batlco"** is misspelled — should be **Batelco** (`OFFER_APPS` / `OFFERS` in `restaurants.js` ~line 4101, and the `offer-batlco.ico` file name).
15. **"Malghom"** as a cuisine name means nothing to most visitors — rename (e.g. "Bahraini Grills / Local") or explain it. Also the "Bahraini" chip returns only 5 places while the Malghom places are Bahraini too.
16. **Price range**: every place is `$` or `$$` (108 are `$$`) — the price filter is almost useless. Either fill real data or hide the filter.

## 3. Thin / placeholder content

17. **~55 auto-generated descriptions** like "Tony's — Burger in Jidhafs.", "Ghancha — Cafe in Bahrain.", "Jan Burger — Burger in Bahrain." Write a real one-liner for each (full list: run the data script, or search `restaurants.js` for `— Burger in`, `— Cafe in`, `— Grill in`, `— Broasted in`, `— Pasta in`, `— Fried Chicken in`, `— Pizza in`, `— Mexican in`).
18. **44 places have no rating** — fine, but the "Recommended" sort puts unrated places first (Aseeri Star, White House, Wadi Al Tayibeen are the top 3). Recommended should favour places with good ratings + full info.
19. **24 places have no phone**, 7 have no Instagram (Tika Abu Jamal, LAHAB, Burger Fries and More, Double Smash, Pizzaro, Melenzane, Klakiz).
20. **49 places have no logo** (incl. well-known ones: Tren Tren, Little Caesars, Jamie's Italian, Coco's, Nu Asia…).
21. **Footer disclaimer is out of date**: "Food photography is illustrative and does not represent each restaurant's menu." (`App.jsx` ~line 863) — the cards now show real storefront photos. Update or remove.
22. **Hero says "Explore 100+ restaurants"** — fine now (117), but consider showing the live count.
23. **Low-resolution photos blown up** in the details popup (e.g. LAHAB hero is very blurry). Use a bigger source or cap the display size.

## 4. Inconsistencies / polish

24. **Emoji icons** in the "Popular" chips (🍔 🌯 🍕 …) — README says "no emoji icons", and Italian uses 🍲 (stew). Swap for the SVG icons in `icons.jsx`, or at least fix Italian (🍝).
25. **Popular chips wrap badly**: 8 chips → 7 + a lone "Indian" on the second row at desktop width. Seafood chip only has 1 result and Indian only 2 — consider dropping/replacing them.
26. **"View menu" sometimes opens an external site** (e.g. Tren Tren → menusa.app in a new tab) and sometimes the in-app menu viewer (LAHAB). Make it consistent, or label the external one ("Menu on menusa.app ↗").
27. **Button text case**: card says "View menu", details popup says "View Menu".
28. **Menu viewer close button** uses a text "✕" while everything else uses an SVG icon; menu page image is small and doesn't use the available width.
29. **Location placeholder truncated**: "All areas in Bahr…" in the search bar — shorten to "All areas".
30. **Map view**
    - Opens zoomed out to show Saudi Arabia/Qatar; fit bounds to Bahrain.
    - ~117 pins overlap into one blob with no clustering — add marker clustering (e.g. `leaflet.markercluster`).
    - Pin letter codes (IT, B, P, FC, BR…) have no legend.
31. **Phone**: the back-to-top button sits over the cards and near the bottom nav bar; nudge it up / hide it when the bottom bar is visible.
32. **Header "Bahrain" select** — it's a full area list in the header plus another area select in the search bar. Pick one.

## 5. Accessibility

33. **"View menu" / "View on map" on cards are not buttons or links** (accessibility tree shows them as plain `generic` elements). Use `<button>` or `<a href>` so keyboard and screen-reader users can reach them.
34. Photo-count badges ("1", "4", "3") are read out as bare numbers — add an `aria-label` like "4 photos".
35. "Verified on Google" text is inside every card `<h3>` — move it out of the heading.

## 6. Performance

36. **JS bundle is 604 KB** (174 KB gzip) — Vite warns. Biggest cause is the 4,400-line `restaurants.js` + 1,400-line `image-manifest.js` in the main chunk. Lazy-load the map (Leaflet) and the details/menu code with `import()`.
37. **`public/` is 74 MB**: Al Mihwar menu PNGs are ~2 MB each (10 of them), `hero-sunset.png` is 1.9 MB (only the .webp is used — delete the PNG and `hero-manama.jpg` if unused), `menus/tikka-village.pdf` 2.7 MB. Convert menu PNGs to WebP/JPG at ~1600px wide.

## 7. Code / repo cleanup

38. **Lint**: `scripts/photo-set.mjs` line 1 has an invalid character (`!` — probably a stray shebang/BOM), unused `icon` in `scripts/photo-audit.mjs:38`, `setState` inside an effect at `src/components/RestaurantDetails.jsx:188`, and `icons.jsx` exports non-components (breaks fast refresh — move constants to a separate file).
39. **Junk files in the repo root**: `src.rar` (126 KB), `dev.log`, `geo-results.txt`, `geo-results2.txt`, `.checkpoint-2026-10-04/`, `.checkpoint-2026-10-12/`, `prototype.html`, `prototype/`, `opencode.json`. Delete or add to `.gitignore`.
40. **~40 uncommitted changes** on `main`, including a deleted `src/theme.css` and many new untracked files — commit them before more work so nothing is lost.
41. README still describes old features in places (e.g. "no emoji icons") — refresh after fixes.

---

### Suggested order
1 → 8 (broken UI), then 9 → 16 (wrong data), then 33 → 35 (accessibility), then the rest.
