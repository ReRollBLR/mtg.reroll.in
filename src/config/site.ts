/**
 * Site config — the home page reads from here.
 *
 * 1. `getEventCards()` is derived from `getEvents()` (src/data/event.ts), which
 *    fetches the live feed at build time and falls back to the canonical event.
 *    This file maps each raw event onto the card view-model (incl. its MTG
 *    `type`). It's async because the fetch is — `index.astro` awaits it.
 * 2. `links` / `socials` hold the site's profile + invite URLs.
 */

import { getEvents, classifyEvent, shouldApplyOverride, type EventType } from "../data/event";
import eventOverride from "../data/event-override.json";

/**
 * Default blurb shown on the event card when `event-override.json` has no
 * `text` set — keeps the card from ever looking empty/unfinished.
 */
const DEFAULT_BLURB =
  "Join the only (as far as we know) MTG group in Bangalore for a day of Magic. Beginners and veterans welcome — bring a deck or borrow one!";

/** Standalone links used across the site (§11 config object). */
export const links = {
  reroll: "https://reroll.in",
  discord: "https://reroll.in/chat",
  instagram: "https://www.instagram.com/mtg_bangalore/",
  whatsapp: "https://reroll.in/whatsapp-mtg",
  underline:
    "https://underline.center/t/magic-the-gathering-with-reroll-board-games/130",
  district:
    "https://www.district.in/events/magic-the-gathering-with-reroll-board-games-buy-tickets",
} as const;

export interface EventCard {
  title: string;
  type: EventType;
  date: string;
  venue: string;
  blurb: string;
  image: string;
  ctaText: string;
  ctaHref: string;
  learnMore: string;
  /** Overrides the frame's base color (hex) for "show"-type cards. */
  frameColor?: string;
  /** How the art image fills its window — "cover" (default, crops to fill) or "contain" (shows the whole image). */
  imageFit?: "cover" | "contain";
}

/**
 * Every listed event as a card view-model.
 * Async: `getEvents()` fetches the live feed at build time. `index.astro`
 * awaits this in its frontmatter.
 */
export async function getEventCards(): Promise<EventCard[]> {
  const [events, applyOverride] = await Promise.all([getEvents(), shouldApplyOverride()]);
  return events.map((e) => ({
    title: e.title,
    type: classifyEvent(e),
    date: e.dateLine,
    venue: e.venue,
    blurb: (applyOverride && eventOverride.text) || DEFAULT_BLURB,
    image: (applyOverride && eventOverride.image) || e.image_url,
    ctaText: "Buy Tickets",
    ctaHref: e.url || links.district, // District ticket link is the fallback CTA
    learnMore: e.learn_more,
    frameColor: (applyOverride && eventOverride.color) || undefined,
    imageFit: applyOverride && eventOverride.fit === "contain" ? "contain" : "cover",
  }));
}

/**
 * Social cards — rendered as flat booster packs (SocialPacks.astro). Each pack's
 * body gradient is its brand color (§7). `theme` maps to a --color-social-*
 * token; `icon` selects the inline SVG.
 */
export type SocialTheme =
  | "reroll"
  | "discord"
  | "instagram"
  | "underline"
  | "whatsapp";

export interface SocialCard {
  label: string;
  handle: string;
  href: string;
  theme: SocialTheme;
  icon: SocialTheme;
}

export const socials: SocialCard[] = [
  // Note: ReRoll itself is intentionally omitted — the "← Back to ReRoll"
  // link in the header already covers it.
  {
    label: "Discord",
    handle: "Join the chat",
    href: links.discord,
    theme: "discord",
    icon: "discord",
  },
  {
    label: "Instagram",
    handle: "@mtg_bangalore",
    href: links.instagram,
    theme: "instagram",
    icon: "instagram",
  },
  {
    label: "Underline",
    handle: "All our events",
    href: links.underline,
    theme: "underline",
    icon: "underline",
  },
  {
    label: "WhatsApp",
    handle: "Join the group chat",
    href: links.whatsapp,
    theme: "whatsapp",
    icon: "whatsapp",
  },
];
