# Research working notes: ui-design-upgrade

These are the raw findings from phases 1, 2 and 2.5, which the next agents read. The final report is in RESEARCH.md.

## Phase 1: Requirements (requirement-parser)
- This is a UI enhancement only: no new features and no data changes. Complexity is Medium to Complex because every screen and both themes are touched, but the work is CSS and JSX only.
- Must-haves:
  - cover every screen;
  - keep the Option A card (polish only);
  - before/after for each changed screen;
  - phased delivery with user approval after each phase;
  - 4/3/2 grid, equal-height cards with bottom-aligned buttons, no overlaps.
- NFRs: build and lint clean, no new console errors, desktop / 768px / 375px, light and dark, WCAG AA. It must hold across 117 restaurants with uneven data.
- Assumptions:
  - the baseline is commit e5c1c34;
  - "don't touch the header" does not apply to this whole-site request;
  - a visible screen redesign means showing options first, while token and spacing fixes ship per phase after approval;
  - no new data fields.
- No blocking clarifying questions. Verdict: proceed, high confidence.

## Phase 2: Product (product-manager)
- Viability: HIGH. This is polish, not a pivot.
- Biggest user value is on the **restaurant page** (where people decide and act) and the **phone experience**. Next come the home category strip, results toolbar and states. Lowest are the footer, saved places and dialogs.
- Market patterns to borrow:
  - a photo-led page built for portrait photos (no blurred side fill);
  - sticky actions (aside on desktop, bottom bar on phone);
  - key facts scannable near the top;
  - today's hours highlighted only when real;
  - sections that share the cards' visual language;
  - fewer, larger, scrollable category chips.
- Priority order:
  - P0: foundations (type and spacing scale, section surface, hard-coded colours, with cards unchanged);
  - P1: restaurant page, shown as options first;
  - P2: phone experience (sticky action bar merged with the bottom bar);
  - P3: home and results;
  - P4: dialogs, saved places, footer, dark-mode sweep.
- Metrics: there are no analytics, so engagement cannot be measured. Measurable instead:
  - Lighthouse accessibility of 95 or more;
  - zero AA contrast failures in either theme;
  - zero layout breaks on a fixed sample (Nino, the most sparse restaurant, a portrait-only photo, one with offers, one with many branches) at 375, 768 and desktop;
  - CLS under 0.1 on the restaurant page;
  - no bundle growth;
  - hard-coded colours reduced to zero;
  - user approval of each phase.
- Out of scope: new data, card redesign, reviews or booking, a UI framework, analytics, routing, data fixes.
- Red flags:
  - redesign churn: this would be the third redesign pass, so it needs a "done" checklist per phase;
  - photo quality is partly a data problem;
  - token changes could regress the cards;
  - there is no visual regression tooling;
  - the phone bottom bar and a new sticky bar could collide;
  - "best UI" has no end point.

## Phase 2.5: Technical discovery (Explore)
- **Files:** App.css is 2018 lines, cards.css 384, `RestaurantPage.jsx` 718. The restaurant page is styled at App.css:1098-1567, the phone bar at 975-1060, and responsive overrides are pooled at 1893-2004.
- **Tokens:**
  - Colours, spacing (`--space-1` to `--space-10`), radii, shadows, fonts (Inter and Bricolage Grotesque) and motion are tokenised.
  - **There is no type scale:** 102 px font sizes and 30+ distinct sizes, including half-pixels. There are no line-height or letter-spacing tokens.
  - Spacing is about 60% raw px in App.css and 100% raw px in cards.css.
  - The dark-mode block is duplicated (A:64-88 and A:89-111). In dark mode `--accent-dark` is lighter than `--accent`.
- **Hard-coded colours:** about 52 hex and 36 rgba in App.css, 13 hex and 5 rgba in cards.css, and 16 pin colours in MapView.jsx. The red #e11d2e and #fff are hard-coded on the card badge and heart, the offer flag and the map pins, so they won't follow the theme. The lightbox, menu viewer and Stories are always dark and built from about 30 raw values.
- **Buttons:** about 35 separate button styles; 3 close-button sizes (36, 38, 44); 3 arrow sizes (40, 44, 46); control heights of 30, 32, 38, 42, 44, 48, 54 and 60; primary-button radius is a pill, 12px or `--radius-md`.
- **Layout:**
  - The restaurant page max width is 1180px, but the home page uses `--page-max` 1360.
  - `.rpage-nav` is 64px instead of `--nav-h`, and the aside uses `top: 88px` as a magic number.
  - Breakpoints are 1199, 1023, 900 (the odd one), 767 and 400, plus container queries at 250, 285 and 340.
  - Z-index values are ad hoc (1 to 400).
- **Dead CSS:** `.filter-star`, `.highlight-wrap.large`, the `cuisine-badge--{tint}` family with no CSS, and several JSX classes with no rules.
- **Repo clutter:** `.checkpoint-*` folders, `prototype/`, `src.rar`, unused `src/assets`.
- **Restaurant page and honest data:** the page does **not** use `cardData.js`; it duplicates reviewCount, photos and offers.
  - **Bug:** it shows `restaurant.description` raw, so the templated "{name} — X in Y." text the card hides appears on the page.
  - The rating is not formatted with `toFixed(1)`.
- **Accessibility:**
  - Present: global `:focus-visible`, a skip link (list page only), `.sr-only`, a reduced-motion CSS kill switch, plenty of ARIA.
  - Gaps:
    - `--ink-faint` #8d8d8d on `--bg` is about 3.1:1 and **fails AA**; it is used for 11px bottom-bar labels, placeholders and "Hours unavailable";
    - the accent on `--bg` is about 4.4:1, borderline for small eyebrow text;
    - the restaurant page has no `<main>` or skip link;
    - the restaurant-page lightbox does not move or restore focus;
    - BranchPicker and the card dialogs have no focus trap;
    - JS smooth scrolling and story auto-advance ignore reduced motion.
- **Risks:**
  - Leaflet CSS loads in lazy chunks after App.css, so the overrides at A:964-972 may lose;
  - map pins and popups are HTML strings with hard-coded colours, and `r.name` is not escaped;
  - inline styles on photos and stories (including the invalid `animationPlayState: "finished"`);
  - several `.style.overflow` scroll locks can clash;
  - the card's equal-height layout depends on `.cx` flex, `margin-top: auto` and the 250/285/340 container thresholds, so changes to padding or font size can break it;
  - MapView's onOpen skips `openRestaurant` (no scroll save, no focus return).

## Visual baseline (screenshots from the running app, captured by the main session)
- **Desktop home:**
  - strong hero (big "Where Bahrain eats.", sunset photo, 117/5/45 stat chips);
  - finder bar with a red Search button;
  - category strip of about 14 tiny icon chips that is dense and small;
  - 4-up Option A cards that look polished.
- **Desktop restaurant page (Nino):**
  - a portrait photo sits in a wide frame with heavy blurred fill on both sides, which looks low quality;
  - the left column has About, Location map, Opening Hours (plain grey table rows) and Contact, and reads like a plain form;
  - the right sticky card has hours status, a big red "View menu", Directions/Call/Instagram and the offer;
  - there is a lot of empty whitespace.
- **Phone restaurant page:** a tall photo with blurred sides, the logo as a square crop (the text "NINO" is cut), then the action card. Usable, but below the cards' quality.

## Phase 3: Technical feasibility (senior-software-engineer)
- **Feasibility: HIGH.** The work is CSS and JSX only, with no new dependencies. The difficulty is breadth, not complexity. cards.css uses no `--space-*` tokens, so new type and spacing tokens can't reach the cards. The engineer confirmed by reading the code: RestaurantPage.jsx:528 shows the raw description, MapView.jsx:132 has the unescaped name, Leaflet CSS loads only in lazy chunks, and the dark block is duplicated at A:64-111.
- **Approach:**
  - (a) Migrate tokens gradually, never in one big rewrite. Add `--text-xs` to `--text-3xl` with line heights, `--control-sm/md/lg` (36/44/52), `--z-*` and `--content-max`.
  - (b) Don't split App.css up front. Split each screen into `src/styles/<screen>.css` during that screen's phase, as pure moves.
  - (c) Add a thin shared layer: CSS `.btn` / `.btn--primary|ghost|icon` with sizes, and one `useModal(ref)` hook (ref-counted scroll lock, focus in/trap/restore, Escape). Don't build React Button components. Native `<dialog>` is an option for later.
  - (d) RestaurantPage should use `cardData(restaurant).description` and format the rating with `toFixed(1)`. Don't swap in cardData fully yet, because the page has branch overrides at RP:123-233.
  - (e) Protect the cards: phases only add tokens. If an existing value has to change, pin the card value first (e.g. `.cx{--radius-lg:20px}`). Take a fixed screenshot set before and after each phase: home grid, Nino, the most sparse restaurant, a portrait-only photo, one with offers, one with many branches, at 1440, 768 and 375, in light and dark. The one deliberate exception is the `--ink-faint` contrast fix (cards.css uses it 3 times); call it out in the before/after.
- **Phases** (each is one commit, can be reverted, and has an approval gate):
  - **P0 Bug fixes (Simple):** description and rating; escape the map HTML; contrast tokens; restaurant-page `<main>` and skip link; reduced motion in JS.
  - **P1 Foundations (Medium):** type, control and z tokens; nav-h and aside magic numbers; `useModal` in 2 or more dialogs. Screenshots must stay identical.
  - **P2 Restaurant page (Complex):** show options first. Portrait-aware hero with no blur fill, facts strip, hours, section surfaces, moved to `styles/restaurant.css`. CLS under 0.1.
  - **P3 Phone (Medium):** one merged sticky action / bottom bar with safe-area insets; AA labels.
  - **P4 Home and results (Medium):** category strip, toolbar, empty and loading states.
  - **P5 Dialogs, saved, footer, dark sweep (Medium):** `--scrim`, `--on-media` and `--media-ctrl-bg` for always-dark surfaces; map pins on CSS variables.
- **Risks and mitigations:**
  - Leaflet: raise the selector specificity rather than loading leaflet.css eagerly.
  - Always-dark surfaces: give them their own tokens with the same value in both themes.
  - Container-query thresholds: never change `.cx` padding or font size in a shared phase. Check the narrowest card (about 170px at 375).
  - Scroll locks: one ref-counted lock.
  - No test runner: manual checks on the fixed sample, and no new tooling.
- **Debt: reduces it.** About 35 button styles become one system, about 30 font sizes become 8 tokens, and the z scale and duplicated logic shrink. Debt would only grow if App.css were split before rework or a component library were added.
- **Quick-win corrections:**
  - `--ink-faint` fails in **dark mode too**: #74747c is about 4.2:1 on bg and about 3.8:1 on card, so use about #8e8e96. In light mode use #6b6b6b (about 5.0:1); it then sits close to `--ink-soft`, so build hierarchy from size and weight.
  - Small accent text in light mode should use #bf1424. Rename `--accent-dark` to `--accent-strong` (in dark mode it is lighter).
  - `p.label` in MapView is also unescaped.
  - Magic numbers: 64px nav, `top: 88px`, 1180px used 3 times.
  - Invalid inline style: `animationPlayState: "finished"`.

## Phase 4: Strategic assessment (technical-cto-advisor)
- **CONDITIONAL GO, confidence Medium-High.**
- **Rationale.** The value sits mostly on the restaurant page and on phone, which are the weakest screens. Technical risk is low and the work reduces debt. The real risk is churn, since this is the third pass. That is acceptable only because earlier passes left frozen assets and this pass mostly consolidates.
- **"Best UI" is replaced by exit criteria:**
  - Lighthouse accessibility 95 or more;
  - zero AA contrast failures in both themes;
  - zero hard-coded colours outside the map and always-dark tokens;
  - CLS under 0.1 on the restaurant page;
  - no bundle growth;
  - user approval of each phase.

  Once these are met, the work is DONE.
- **Adjusted phases:**
  - **P0 Bug fixes:** ship whatever the decision. Description and rating `toFixed(1)`; escape `r.name` and `p.label`; `--ink-faint` contrast in both themes; `<main>` and skip link; reduced motion in JS; invalid `animationPlayState`. Repo clutter is a separate chore, and deleting it needs approval.
  - **P1 Foundations, slimmed:** tokens only (type, control, z, content-max) and the magic numbers. Screenshots must stay identical. `useModal` moves to P2 with its first consumer, the lightbox.
  - **P2 Restaurant page, merged with the restaurant part of phone:** 2–3 options, each including the 375 layout and the merged sticky action bar. One revision round, then the user picks. Options go on a branch or a dev-only hash, not a new `prototype/` folder.
  - **P2b:** bottom-bar AA labels and safe-area insets.
  - **Decision point after P2:** is P4/P5 worth doing?
  - **P4 Home and results:** category strip, toolbar, states.
  - **P5 Dialogs, saved, footer, dark sweep:** time-boxed and can be cut. Roll out `useModal` here.
- **Conditions:**
  - card freeze (only the `--ink-faint` exception, called out);
  - a fixed screenshot sample, with IDs named in `plan/` before P0;
  - a per-phase done checklist: build and lint, no console errors, screenshots, AA, one revertible commit, user approval;
  - photo honesty: no fake fill, upscaling or stock images;
  - no new tooling.
- **Rejected alternatives:**
  - do nothing: leaves AA failures, the honest-data violation and unescaped HTML;
  - bug fixes only: a valid fallback, and the default if P2 stalls;
  - full rewrite or framework: breaks the stack constraint, risks Option A, worst churn.
- **Top risks:** scope creep; card regressions; an options loop; missed manual checks; Leaflet and sticky-bar collisions.
