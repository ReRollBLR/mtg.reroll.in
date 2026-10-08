# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Tabletop MTG Players:** Magic: The Gathering players in Bangalore attending weekly Saturday meetups at Underline Center, Indiranagar. Ranges from casual beginners learning the game with Jumpstart decks to veteran Commander (EDH) players and card traders.
- **Curious Beginners:** New players looking for event details, rules guidance, ticket booking, and community links.

## Product Purpose

- Community hub for Bangalore's dedicated Magic: The Gathering meetup group organized by ReRoll Board Games.
- Provide real-time event schedules, ticket purchase links, venue information, and answers to common player questions.
- Enable players to place bulk card orders and connect across community channels (Discord, WhatsApp, Instagram).

## Positioning

- The official web home for Magic: The Gathering Bangalore by ReRoll Board Games — beginner-friendly, accessible, and community-driven.

## Operating Context

- **Physical Meetup Location:** Underline Center, Indiranagar, Bengaluru.
- **Session Cadence:** Weekly Saturday meetups (6:00 PM onwards).
- **Core Formats:** Casual Commander (EDH), Jumpstart 2022 for newcomers, casual Standard, and card trading.

## Capabilities and Constraints

- **Static Generation:** Built with Astro and deployed via GitHub Pages (`mtg.reroll.in`).
- **Dynamic Event Feed:** Build-time live fetch of the Underline Center event ingest feed with graceful fallback to committed event data.
- **Responsive Layout:** Mobile-friendly card-based layout designed for phone browsing before and during meetups.

## Brand Commitments

- **MTG Physical Card Identity:** Deep tabletop aesthetic with dark parchment (`#1c160e`), MTG gold accents (`#c9a84c`), Cinzel display headings, and EB Garamond italic flavor text.
- **Tabletop Seam:** The ReRoll brand red (`#c72d07`) is preserved as the red mana segment, connecting the site to the broader ReRoll board game family.

## Evidence on Hand

- Existing ReRoll MTG design system tokens in [`src/styles/global.css`](file:///Users/mg/Desktop/Dev/mtg.reroll.in-1/src/styles/global.css) and design brief [`new-mtg-bridge-instructions.md`](file:///Users/mg/Desktop/Dev/mtg.reroll.in-1/new-mtg-bridge-instructions.md).
- Canonical event fallback data in [`src/data/event.json`](file:///Users/mg/Desktop/Dev/mtg.reroll.in-1/src/data/event.json).

## Product Principles

1. **Welcoming to Newcomers:** Clear signposting that events are beginner-friendly, with Jumpstart decks ready to play.
2. **Resilient Data:** Always render scheduled event details or fallback information without broken states.
3. **Tabletop Card Aesthetic:** Every key section mirrors the physical construction and tactile feel of Magic: The Gathering cards.

## Accessibility & Inclusion

- High-contrast gold and parchment text on dark wood surfaces.
- Touch-friendly hit targets (minimum 44px) and semantic HTML with full keyboard navigation and structured schema data.
