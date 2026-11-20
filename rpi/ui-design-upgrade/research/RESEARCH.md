# Research report: UI design upgrade

**Decision: CONDITIONAL GO. Confidence: Medium-High.**
Baseline: commit `e5c1c34`. Sources: `REQUEST.md`, `research/phase-notes.md` (phases 1, 2, 2.5, 3, 4 and the visual baseline).

## 1. Executive Summary

FoodFind's cards already look polished, but the restaurant page and the phone experience fall below them, and the foundations underneath are uneven. Research found one honest-data bug (the restaurant page shows templated descriptions the card hides), contrast failures in both themes, about 35 button styles, no type scale, and over 100 hard-coded colours. The work is CSS and JSX only, needs no new dependencies, and reduces debt, so technical risk is low. The real risk is churn, because this is the third redesign pass. We recommend a **CONDITIONAL GO with Medium-High confidence**: replace "the best UI" with measurable exit criteria, freeze the Option A card, ship in small phases that can each be reverted, and get user approval after every phase. P0 bug fixes should ship whatever the decision.

## 2. Feature Overview

| Item | Detail |
|---|---|
| Name | UI design upgrade (`ui-design-upgrade`) |
| Type | UI enhancement only. No new features, no data changes. |
| Complexity | Medium to Complex. Every screen and both themes are touched, but only CSS and JSX change. |
| Components | Home; results (filters, sort, grid/list/map, states); Option A cards (polish only); restaurant page (`#restaurant/[id]`); dialogs; saved places; phone bottom bar; footer; light and dark mode |
| Goals | 1. Find what holds the UI back. 2. Rank upgrades by biggest visible gain for least risk. 3. Make the restaurant page and phone experience as strong as the cards. |

## 3. Requirements Summary

**Functional**
- Cover every screen a visitor sees.
- Keep the Option A card. Polish only.
- Provide a before / after for each changed screen.
- Deliver in phases, with user approval after each phase.
- Keep the 4 / 3 / 2 grid, equal-height cards, bottom-aligned buttons and no overlaps.

**Non-functional**
- `npm run build` and `npm run lint` pass. No new lint warnings.
- No new console errors.
- Checked at desktop, 768px and 375px, in light and dark mode.
- WCAG AA contrast.
- Holds across all 117 restaurants, including those with sparse data.

**Constraints from CLAUDE.md**
- Honest data: never invent ratings, hours, prices, offers or facilities. Hide templated descriptions.
- Use tokens, not hard-coded colours.
- Keep React 19 + Vite and plain CSS tokens. No UI framework.
- For a redesign, show options first. Replace the live version only after approval.
- Ask before committing.

**Assumptions:** the header rule ("don't touch the header") does not apply to this whole-site request; token and spacing fixes ship per phase after approval; no new data fields.

## 4. Product Analysis

**User value.** The biggest gain is on the **restaurant page** (where people decide and act) and on the **phone**. Next are the home category strip, the results toolbar and states. Lowest are the footer, saved places and dialogs.

**Market patterns to borrow**
- A photo-led page built for portrait photos, with no blurred side fill.
- Sticky actions: an aside on desktop, a bottom bar on phone.
- Key facts scannable near the top.
- Today's hours highlighted, only when the data is real.
- Sections that share the cards' visual language.
- Fewer, larger, scrollable category chips.

**Measurable metrics.** There are no analytics, so engagement cannot be measured. These can:

| Metric | Target |
|---|---|
| Lighthouse accessibility | 95 or more |
| AA contrast failures | 0 in both themes |
| Layout breaks on the fixed sample | 0 at 375, 768 and desktop |
| CLS on the restaurant page | Under 0.1 |
| Bundle size | No growth |
| Hard-coded colours | 0 outside map and always-dark tokens |
| Phase approval | User approves each phase |

**Scope.** In: visual polish, accessibility and consistency on every screen. Out: new data, card redesign, reviews or booking, a UI framework, analytics, routing changes, data fixes.

## 5. Technical Discovery

**Current state**
- `src/App.css` is 2018 lines, `src/components/cards/cards.css` 384, `src/components/RestaurantPage.jsx` 718.
- Restaurant page styles: App.css:1098-1567. Phone bar: App.css:975-1060. Responsive overrides pooled at App.css:1893-2004.
- Colours, spacing (`--space-1` to `--space-10`), radii, shadows, fonts (Inter, Bricolage Grotesque) and motion are tokenised.

**Key problems**

| Problem | Evidence |
|---|---|
| Honest-data bug | `RestaurantPage.jsx:528` renders `restaurant.description` raw, so the templated "{name} — X in Y." text appears. The page does not use `cardData.js`. The rating is not formatted with `toFixed(1)`. |
| Contrast, light | `--ink-faint` #8d8d8d on `--bg` is about 3.1:1 and fails AA (11px bottom-bar labels, placeholders, "Hours unavailable"). Accent on `--bg` is about 4.4:1, borderline for small eyebrow text. |
| Contrast, dark | `--ink-faint` #74747c is about 4.2:1 on bg and 3.8:1 on card. `--accent-dark` is lighter than `--accent`. Dark block duplicated at App.css:64-111. |
| 35 button styles | 3 close-button sizes (36, 38, 44); 3 arrow sizes (40, 44, 46); control heights 30 to 60; primary radius is a pill, 12px or `--radius-md`. |
| No type scale | 102 px font sizes, 30+ distinct sizes including half-pixels. No line-height or letter-spacing tokens. |
| Raw spacing | About 60% raw px in App.css, 100% in cards.css (no `--space-*` use). |
| Hard-coded colours | About 52 hex + 36 rgba in App.css, 13 hex + 5 rgba in cards.css, 16 pin colours in `src/MapView.jsx`. Red #e11d2e and #fff on badge, heart, offer flag and pins don't follow the theme. Lightbox, menu viewer and Stories use about 30 raw values. |
| Focus gaps | Restaurant page has no `<main>` or skip link. Its lightbox does not move or restore focus. BranchPicker and card dialogs have no focus trap. |
| Reduced-motion gaps | A CSS kill switch exists, but JS smooth scrolling and story auto-advance ignore it. |
| Leaflet CSS order | Leaflet CSS loads in lazy chunks after App.css, so overrides at App.css:964-972 may lose. |
| Unescaped map HTML | `src/MapView.jsx:132` builds popups from HTML strings with `r.name` and `p.label` unescaped. |

**Other findings**
- Layout magic numbers: restaurant page max width 1180px (used 3 times) vs `--page-max` 1360; `.rpage-nav` 64px instead of `--nav-h`; aside `top: 88px`.
- Breakpoints include an odd 900px; z-index values are ad hoc (1 to 400).
- Invalid inline style `animationPlayState: "finished"` (`src/Stories.jsx:181`).
- Several `.style.overflow` scroll locks can clash. MapView's onOpen skips `openRestaurant` (no scroll save, no focus return).
- Dead CSS and repo clutter (`.checkpoint-*`, `prototype/`, `src.rar`).

**Visual baseline.** The home hero and cards look strong; the category strip (about 14 tiny chips) is dense. On the restaurant page (Nino), a portrait photo sits in heavy blurred fill and the left column reads like a plain form. On phone, the logo crop cuts "NINO".

## 6. Technical Analysis

**Feasibility: High.** CSS and JSX only, no new dependencies. The difficulty is breadth, not complexity.

**Approach**
- **(a) Gradual token migration.** Add `--text-xs` to `--text-3xl` with line heights, `--control-sm/md/lg` (36/44/52), `--z-*` and `--content-max`. Never one big rewrite.
- **(b) Split CSS per screen, during its phase.** Move each screen into `src/styles/<screen>.css` as a pure move. Don't split App.css up front.
- **(c) Thin shared layer.** CSS `.btn` / `.btn--primary|ghost|icon` with sizes, and one `useModal(ref)` hook (ref-counted scroll lock, focus in/trap/restore, Escape). No React Button components.
- **(d) Honest data on the restaurant page.** Use `cardData(restaurant).description` and `toFixed(1)` for the rating. Don't swap in `cardData` fully yet, because of branch overrides at RestaurantPage.jsx:123-233.
- **(e) Protect the cards.** Phases only add tokens. If a shared value must change, pin the card value first (for example `.cx{--radius-lg:20px}`). The one exception is the `--ink-faint` fix (used 3 times in cards.css), called out in the before/after.

**Risks and mitigations**

| Risk | Mitigation |
|---|---|
| Leaflet CSS overrides lose | Raise selector specificity; don't load leaflet.css eagerly. |
| Always-dark surfaces break in a theme | Own tokens (`--scrim`, `--on-media`, `--media-ctrl-bg`) with the same value in both themes. |
| Card equal-height layout breaks | Never change `.cx` padding or font size in a shared phase. Check the narrowest card (about 170px at 375). |
| Scroll locks clash | One ref-counted lock in `useModal`. |
| No test runner | Manual checks on the fixed sample. No new tooling. |

**Debt impact: reduces it.** About 35 button styles become one system and about 30 font sizes become 8 tokens. The z scale and duplicated logic shrink. Debt would grow only if App.css were split before rework or a component library were added.

## 7. Strategic Recommendation

**Decision: CONDITIONAL GO, confidence Medium-High.**

**Rationale.** The value sits on the weakest screens. Technical risk is low and debt goes down. Churn is the real risk, acceptable because earlier passes left frozen assets and this pass mostly consolidates.

**Exit criteria (these replace "best UI").** The work is DONE when all are met:
- Lighthouse accessibility 95 or more.
- Zero AA contrast failures in both themes.
- Zero hard-coded colours outside the map and always-dark tokens.
- CLS under 0.1 on the restaurant page.
- No bundle growth.
- User approval of each phase.

**Conditions**
- Card freeze. The only exception is `--ink-faint`, called out.
- A fixed screenshot sample, with restaurant IDs named in `plan/` before P0: home grid, Nino, the most sparse restaurant, a portrait-only photo, one with offers, one with many branches; at 1440, 768 and 375; light and dark.
- A per-phase done checklist (see section 8).
- Photo honesty: no fake fill, upscaling or stock images.
- No new tooling.

**Rejected alternatives**

| Alternative | Why not |
|---|---|
| Do nothing | Leaves AA failures, the honest-data violation and unescaped HTML. |
| Bug fixes only | Valid fallback. It is the default if P2 stalls. |
| Full rewrite or UI framework | Breaks the stack constraint, risks Option A, worst churn. |

**Top risks:** scope creep; card regressions; an options loop; missed manual checks; Leaflet and sticky-bar collisions.

## 8. Phase Roadmap

Each phase is one revertible commit with an approval gate.

**Shared "done" checklist (every phase):** build and lint pass; no new console errors; fixed screenshot set taken before and after; AA contrast checked; one revertible commit; user approval.

| Phase | Scope | Complexity | Extra "done" items |
|---|---|---|---|
| **P0 Bug fixes** | Description via `cardData`, rating `toFixed(1)`; escape `r.name` and `p.label`; `--ink-faint` contrast in both themes (light about #6b6b6b, dark about #8e8e96); small accent text #bf1424 and rename `--accent-dark` to `--accent-strong`; restaurant-page `<main>` and skip link; reduced motion in JS; fix invalid `animationPlayState`. Ships whatever the decision. | Simple | Templated text gone from the page; `--ink-faint` card change shown in before/after. Repo clutter is a separate chore; deletion needs approval. |
| **P1 Foundations (slimmed)** | Tokens only: type, control, z, content-max. Replace 64px nav, `top: 88px` and 1180px magic numbers. | Medium | Screenshots identical before and after. |
| **P2 Restaurant page + phone action bar** | 2–3 options, each with the 375 layout and the merged sticky action / bottom bar. Portrait-aware hero with no blur fill, facts strip, hours, section surfaces; move to `styles/restaurant.css`. Add `useModal` with the lightbox as first consumer. Options go on a branch or a dev-only hash, not `prototype/`. | Complex | One revision round, then the user picks; CLS under 0.1; lightbox moves and restores focus; no collision between sticky bar and bottom bar. |
| **P2b Bottom bar** | AA labels and safe-area insets. | Simple | Labels pass AA at 375 in both themes. |
| **Decision point** | After P2: are P4 and P5 worth doing? | n/a | User decides. |
| **P4 Home and results** | Category strip (fewer, larger, scrollable chips), toolbar, empty and loading states. | Medium | 4 / 3 / 2 grid unchanged. |
| **P5 Dialogs, saved, footer, dark sweep** | `--scrim`, `--on-media`, `--media-ctrl-bg` for always-dark surfaces; map pins on CSS variables; roll out `useModal`. Time-boxed, can be cut. | Medium | Zero hard-coded colours outside map and always-dark tokens. |

## 9. Next Steps

1. Review this report and confirm the CONDITIONAL GO and its conditions.
2. Run `/rpi:plan ui-design-upgrade` to write `pm.md`, `ux.md`, `eng.md` and `PLAN.md`. Name the fixed screenshot sample IDs in `plan/` before P0.
3. P0 bug fixes can ship first, ahead of the plan, as a direct fix under CLAUDE.md's bug-fix rule.
