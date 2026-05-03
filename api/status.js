/**
 * /api/status — Vercel Edge Function.
 *
 * Returns shop-level open/closed + next-free-slot, derived from Booksys
 * availability when reachable, falling back to scheduled hours otherwise.
 *
 * Caching:
 *   - 60s edge cache (s-maxage)
 *   - 300s stale-while-revalidate (serves stale during background refresh)
 *   - All requests go through the edge so the Booksys API isn't hammered.
 *
 * Truthfulness contract:
 *   - We DO promise "open right now" / "closed right now"
 *   - We DO promise "next free slot at HH:MM" within the current day
 *   - We DON'T promise per-artist availability — too risky to be wrong
 *   - On API failure, we degrade to schedule-only (no slot estimate)
 */

import { fetchAvailability, computeStatus, scheduledStatus } from "./_lib/booksys-mock.js";
import siteData from "../src/_data/site.json" with { type: "json" };

export const config = { runtime: "edge" };

export default async function handler() {
  const now = new Date();
  let payload;

  try {
    const availability = await withTimeout(fetchAvailability(now), 2000);
    payload = computeStatus(availability, siteData.hours, now);
  } catch (err) {
    // Booksys unreachable → fall back to schedule-only
    payload = scheduledStatus(siteData.hours, now);
    payload.source = "schedule-fallback";
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Status-Source": payload.source,
    },
  });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}
