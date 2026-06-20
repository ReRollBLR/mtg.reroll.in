/**
 * Event data — fallback / source of truth.
 *
 * `fallbackEvent` (loaded from event.json) is the canonical event and the
 * guaranteed fallback. `getEvents()` performs a build-time live fetch of the
 * Underline-ingest feed (`FEED_URL`) and falls back to `fallbackEvent` on any
 * miss / error / empty feed. The JSON shape below IS the contract: anything
 * fetched is coerced into `RawEvent` before it's returned.
 *
 * The fetch runs at BUILD time only (Astro evaluates this on the server during
 * `astro build`), so every deploy bakes in the latest feed — picking up a
 * changed event date or an updated ticket link. There is no commit back to the
 * repo: `event.json` is purely the fallback. The deploy workflow re-runs the
 * build every Sunday 00:00 IST to refresh the baked feed; see
 * .github/workflows/deploy.yml.
 */

import fallbackJson from "./event.json";

/**
 * Live feed of UC-tagged events, published as a GitHub release asset by the
 * UC-ingest pipeline (§11). An array of events; may be empty when nothing is
 * scheduled. Fetched once at build time.
 */
const FEED_URL =
  "https://github.com/heresmohit/UC-ingest/releases/download/events-latest/mtg.json";

/** The Underline-feed event shape. The fetch target must conform to this. */
export interface RawEvent {
  title: string;
  excerpt: string;
  full_content: string | null;
  image_url: string;
  thumbnails: Array<{
    max_width: number | null;
    max_height: number | null;
    width: number;
    height: number;
    url: string;
  }>;
  dateLine: string;
  slug: string;
  /** District ticket page — the Buy Tickets CTA. */
  url: string;
  /** Underline.center event thread — the Learn More link. */
  learn_more: string;
  venue: string;
}

/**
 * Event "type" → drives the MTG card's outer frame gradient (§7).
 * Classified from a keyword in the title (the Magic color pie = canon).
 *   show     (default) → gold→brown
 *   jam      (title contains "jam") → green
 *   workshop (title contains "workshop") → blue, and FILTERED OUT of the listing
 */
export type EventType = "show" | "jam" | "workshop";

export function classifyEvent(e: RawEvent): EventType {
  const t = e.title.toLowerCase();
  if (t.includes("workshop")) return "workshop";
  if (t.includes("jam")) return "jam";
  return "show";
}

/** Canonical event + guaranteed fallback. Do not delete — fetch falls back here. */
export const fallbackEvent: RawEvent = fallbackJson;

/**
 * Read the date/time + ticket link from the FIRST feed entry. These are the
 * ONLY two fields the live feed is allowed to override — everything else
 * (title, blurb, image, venue, learn_more) always comes from `event.json`.
 *
 * The feed and the local JSON don't share field names exactly (the feed may use
 * `event_starts_at`/`ticket_url`; see §11), so each value is read from a list
 * of candidate keys. A missing/blank value returns `undefined` → no override.
 */
function formatDateLine(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function readOverrides(entry: unknown): { dateLine?: string; url?: string } {
  if (!entry || typeof entry !== "object") return {};
  const e = entry as Record<string, any>;

  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = e[k];
      if (typeof v === "string" && v.trim() !== "") return v.trim();
    }
    return undefined;
  };

  const rawDate = pick("dateLine", "date_line", "event_starts_at", "starts_at", "date");
  const dateLine = rawDate && /^\d{4}-\d{2}-\d{2}T/.test(rawDate)
    ? formatDateLine(rawDate)
    : rawDate;

  return {
    dateLine,
    // Ticket link (the Buy Tickets CTA).
    url: pick("url", "ticket_url", "tickets_url"),
  };
}

/**
 * Fetch the live feed at build time and return only the date/ticket overrides
 * from its first entry. Returns `{}` on any error, empty feed, or missing
 * values — so the caller simply keeps `event.json`'s committed values.
 */
async function fetchOverrides(): Promise<{ dateLine?: string; url?: string }> {
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) {
      console.warn(`[event] feed fetch failed: HTTP ${res.status}; keeping committed event`);
      return {};
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      // Empty / non-array feed = nothing to override; keep committed values.
      return {};
    }
    return readOverrides(data[0]);
  } catch (err) {
    console.warn("[event] feed fetch errored; keeping committed event:", err);
    return {};
  }
}

/**
 * Single entry point for the page's event list. Async because it fetches the
 * live feed at build time (Astro frontmatter can `await` it).
 *
 * The committed `event.json` is the base for everything. The live feed only
 * updates the event's **date/time** and **ticket link** (from its first entry);
 * all other fields stay fixed. On empty feed / fetch error, the committed
 * values are kept unchanged, so the page is never empty (§11).
 *
 * Workshops are filtered out of the listing (§7).
 */
export async function getEvents(): Promise<RawEvent[]> {
  const { dateLine, url } = await fetchOverrides();
  const event: RawEvent = {
    ...fallbackEvent,
    dateLine: dateLine ?? fallbackEvent.dateLine,
    url: url ?? fallbackEvent.url,
  };
  const listed = [event].filter((e) => classifyEvent(e) !== "workshop");
  return listed.length > 0 ? listed : [fallbackEvent];
}
