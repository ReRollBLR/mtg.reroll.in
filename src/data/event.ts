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
// event-override.json's `date` must be "YYYY-MM-DD" (e.g. "2026-08-16") — it's
// compared as a plain calendar date against the feed's event date. Leave it ""
// to disable the date gate entirely. `time` must be 24-hour "HH:MM" (e.g.
// "18:00" for 6pm); leave "" and it defaults to 18:00 (see formatDateOnly
// below).
import eventOverride from "./event-override.json";

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

/** Event "type" → drives the MTG card's outer frame gradient (§7). Only "show" is in use. */
export type EventType = "show";

export function classifyEvent(_e: RawEvent): EventType {
  return "show";
}

/** Canonical event + guaranteed fallback. Do not delete — fetch falls back here. */
export const fallbackEvent: RawEvent = fallbackJson;

/**
 * Read the date/time + ticket link from the FIRST feed entry. These are the
 * ONLY two fields the live feed is allowed to override — everything else
 * (title, blurb, image, venue, learn_more) always comes from `event.json` or
 * `event-override.json`. Note: `dateLine` has a THIRD source in between —
 * `event-override.json`'s `date` — see `getEvents()` below for the priority.
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

// Formats event-override.json's `date` ("YYYY-MM-DD") + `time` ("HH:MM", 24h)
// into the same style as formatDateLine, without needing a full ISO timestamp
// from the feed. `time` defaults to 18:00 (6pm) when blank/invalid.
function formatDateOnly(isoDate: string, time: string | undefined): string {
  const validTime = time && /^\d{2}:\d{2}$/.test(time) ? time : "18:00";
  const date = new Date(`${isoDate}T${validTime}:00`);
  if (isNaN(date.getTime())) return isoDate;
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

function readOverrides(entry: unknown): { dateLine?: string; url?: string; isoDate?: string } {
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
  const isIso = !!rawDate && /^\d{4}-\d{2}-\d{2}T/.test(rawDate);
  const dateLine = isIso ? formatDateLine(rawDate!) : rawDate;

  return {
    dateLine,
    // Ticket link (the Buy Tickets CTA).
    url: pick("url", "ticket_url", "tickets_url"),
    // Calendar date (YYYY-MM-DD) of the feed's event, when it gave us a real
    // ISO timestamp — compared against event-override.json's `date` (§ below).
    isoDate: isIso ? rawDate!.slice(0, 10) : undefined,
  };
}

/**
 * Fetch the live feed at build time and return only the date/ticket overrides
 * from its first entry. Returns `{}` on any error, empty feed, or missing
 * values — so the caller simply keeps `event.json`'s committed values.
 */
async function fetchOverrides(): Promise<{ dateLine?: string; url?: string; isoDate?: string }> {
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
 * `event-override.json`'s `date` (a "YYYY-MM-DD") does double duty: it's both
 * the manual dateLine fallback AND the gate for text/image/color/fit — decided
 * once per build and shared by `getEvents()` (for dateLine) and `site.ts`
 * (for everything else) so both agree on the same call:
 *
 *   - Feed gave a real calendar date AND it matches the override's `date`
 *     → apply the override (it's pinned to the event actually happening).
 *   - Feed gave a real calendar date that DOESN'T match `date`
 *     → the override is stale for the upcoming event; fall back to event.json.
 *   - Feed gave no usable date (empty/failed feed, or a non-ISO dateLine like
 *     "Every Saturday, 6pm") → can't compare, so trust the manual override.
 *   - No `date` set in the override at all → no gate; override always applies.
 */
function overrideApplies(feedIsoDate: string | undefined): boolean {
  const pinnedDate = eventOverride.date?.trim();
  if (!pinnedDate) return true; // no gate set — override always applies
  if (!feedIsoDate) return true; // feed has nothing to compare against
  return feedIsoDate === pinnedDate;
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
 * `dateLine` priority: live feed → `event-override.json`'s `date` (manual
 * pin, gated by `overrideApplies` — same gate as text/image/color/fit) →
 * `event.json`'s committed `dateLine`. The feed wins over the manual override
 * so a real upstream schedule change is never masked by a stale override.
 */
export async function getEvents(): Promise<RawEvent[]> {
  const { dateLine, url, isoDate } = await fetchOverrides();
  const pinnedDate = eventOverride.date?.trim() || undefined;
  const manualDate = overrideApplies(isoDate) && pinnedDate ? formatDateOnly(pinnedDate, eventOverride.time) : undefined;
  const event: RawEvent = {
    ...fallbackEvent,
    dateLine: dateLine ?? manualDate ?? fallbackEvent.dateLine,
    url: url ?? fallbackEvent.url,
  };
  return [event];
}

/**
 * Exposed so `site.ts` can gate the blurb/image/color/fit override the same
 * way `dateLine` is gated above — both need to agree on one build-time
 * decision. Re-fetches the feed (Astro/fetch caches this at build time, so
 * it's not a second network round trip in practice within one build).
 */
export async function shouldApplyOverride(): Promise<boolean> {
  const { isoDate } = await fetchOverrides();
  return overrideApplies(isoDate);
}
