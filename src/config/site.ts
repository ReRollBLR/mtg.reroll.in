/**
 * Site config — the home page reads from here.
 *
 * 1. `getEventCards()` is derived from `getEvents()` (src/data/event.ts), which
 *    fetches the live feed at build time and falls back to the canonical event.
 *    This file maps each raw event onto the card view-model (incl. its MTG
 *    `type`). It's async because the fetch is — `index.astro` awaits it.
 * 2. `links` / `socials` hold the site's profile + invite URLs.
 */

import { getEvents, classifyEvent, type EventType } from "../data/event";

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
}

/**
 * Every listed event as a card view-model (workshops already filtered out).
 * Async: `getEvents()` fetches the live feed at build time. `index.astro`
 * awaits this in its frontmatter.
 */
export async function getEventCards(): Promise<EventCard[]> {
  const events = await getEvents();
  return events.map((e) => ({
    title: e.title,
    type: classifyEvent(e),
    date: e.dateLine,
    venue: e.venue,
    blurb: e.excerpt,
    image: e.image_url,
    ctaText: "Buy Tickets",
    ctaHref: e.url || links.district, // District ticket link is the fallback CTA
    learnMore: e.learn_more,
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
