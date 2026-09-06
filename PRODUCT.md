# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Tabletop MTG Players:** Magic: The Gathering players in Bangalore attending physical meetups at ReRoll. Ranges from casual beginners to veteran Commander players using smartphones to track their campaign progress, claim starting lands, and submit trial results live from the table.
- **Store Arbitrators & Judges:** ReRoll organizers and designated community judges who verify physical game states and approve or decline trial claims in real time during meetups.

## Product Purpose

- Bridge real-world tabletop Magic games with an interactive, persistent Middle-Earth hex-crawl campaign at `/hobbit`.
- Give players a shared, visual reason to build thematic decks, try unique in-game challenges, and vie for territorial control across Middle-Earth.
- Crown the top Commanders over a 2-session pilot season.

## Positioning

- A tabletop companion for ReRoll Bangalore that turns standard Commander/casual pods into an overarching Middle-Earth territory conquest league without requiring heavy paperwork or complex tournament software.

## Operating Context

- **Physical Environment:** Dim, social board game store / cafe tables during weekly ReRoll MTG events in Bangalore. Players access the map on mobile browsers while playing tabletop card games.
- **Session Cadence:** Piloting over a 2-session initial campaign format.
- **Real-Time Verification:** Players submit claims on their phones at the table; judges/arbitrators review claims on-site.

## Capabilities and Constraints

- **Map Engine:** Client-side Leaflet.js viewer powered by a single high-resolution local WebP asset (`public/images/map/middle-earth.webp`) with zero third-party tile dependencies.
- **Authentication:** Discord OAuth login via Supabase Auth (free tier) matching player identity to the ReRoll Discord community.
- **Conquest Rules:** Individual Commander competition for the pilot season (team/faction rules deferred to a later review). Two approved trials in a region grant territory control.
- **Deployment:** Static Astro site deployed via GitHub Pages (`mtg.reroll.in`), with Supabase handling database persistence, role-based security, and live subscriptions.

## Brand Commitments

- **MTG Physical Card Identity:** Deep tabletop aesthetic with dark parchment (`#1c160e`), MTG gold accents (`#c9a84c`), Cinzel display headings, and EB Garamond italic flavor text.
- **Tabletop Seam:** The ReRoll brand red (`#c72d07`) is preserved as the red mana segment and urgent arbitrator indicators, connecting the site to the broader ReRoll board game family.

## Evidence on Hand

- Canonical Middle-Earth high-resolution stitched map in [`public/images/map/middle-earth.webp`](file:///Users/mg/Desktop/Dev/mtg.reroll.in-1/public/images/map/middle-earth.webp).
- 12 active Middle-Earth territories with exact SVG polygon coordinates and 36 curated MTG achievements in [`src/data/hobbit/regions.ts`](file:///Users/mg/Desktop/Dev/mtg.reroll.in-1/src/data/hobbit/regions.ts).
- Existing ReRoll MTG design system tokens in [`src/styles/global.css`](file:///Users/mg/Desktop/Dev/mtg.reroll.in-1/src/styles/global.css) and design brief [`new-mtg-bridge-instructions.md`](file:///Users/mg/Desktop/Dev/mtg.reroll.in-1/new-mtg-bridge-instructions.md).

## Product Principles

1. **Table-First Flow:** Submitting a match claim must take under 15 seconds so players never disengage from the physical card game in front of them.
2. **Lore-Authentic Trials:** Every achievement must reward genuine, creative MTG gameplay that echoes Tolkien lore (e.g., life gain in the Shire, artifact hoarding in Erebor, board wipes in Moria).
3. **Transparent Arbitration:** Arbitrators must have single-tap review mechanisms with clear feedback to maintain trust and community goodwill.
4. **Resilient Local Assets:** Never rely on external third-party tile servers that can break or throw mixed-content warnings during an event.

## Accessibility & Inclusion

- High-contrast gold and parchment text on dark wood surfaces.
- Mobile-responsive drawers and modals with touch-friendly button hit targets (minimum 44px) for one-handed phone use during matches.
