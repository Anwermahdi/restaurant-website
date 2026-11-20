# UI design upgrade

## What the user wants

"The best UI design" for FoodFind: the whole site should look and feel like a top-tier restaurant discovery product, as polished as the best restaurant sites online, while keeping the idea of the site.

## Scope

Every screen a visitor sees:

- Home: header, hero ("Where Bahrain eats."), search bar, category strip
- Results: filters, sort, grid / list / map views, empty and loading states
- Restaurant cards (the approved framed-photo "Option A" design: keep it, only polish it)
- Restaurant page (`#restaurant/[id]`): photos, info, menu, branches, map
- Dialogs: branch picker, offers, photo gallery, menu viewer, stories
- Saved places, phone bottom bar, footer, light and dark mode

## Goals

1. Find what holds the UI back today: visual hierarchy, spacing rhythm, typography, colour use, consistency between screens, motion, and accessibility.
2. Propose a ranked set of upgrades with the biggest visible gain for the least risk.
3. Make the restaurant page and phone experience as strong as the cards.

## Constraints

- Follow every rule in `CLAUDE.md`, especially honest data: never invent ratings, hours, prices, offers or facilities.
- Keep the stack: React 19 + Vite, plain CSS tokens, no new UI framework.
- Keep the approved card design (Option A) and the "Bahrain Red" identity unless research shows a strong reason to change. If so, propose options and wait for approval before replacing anything live.
- 4 / 3 / 2 cards per row on desktop / tablet / phone; no overlapping text; check at desktop and 375px phone, in light and dark mode.
- `npm run build` and `npm run lint` must pass. Ask before committing.

## Success looks like

- A clear before / after for each changed screen.
- No new console errors, no layout breaks at 375px, contrast meets WCAG AA.
- The user approves each phase before the next one starts.
