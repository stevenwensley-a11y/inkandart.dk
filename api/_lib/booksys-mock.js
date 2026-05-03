/**
 * Mock Booksys API. Replace `fetchAvailability()` with a real call to
 * inkart.book.dk (or wherever) once Simone confirms endpoint + auth.
 *
 * Contract:
 *   fetchAvailability() -> Promise<{ slots: Array<{ start, end, free }> }>
 *
 * Returns 12 hourly slots starting from "now", with 70% randomly free.
 * Deterministic-ish per-day so the page doesn't flicker between requests.
 */

export async function fetchAvailability(now = new Date()) {
  const slots = [];
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  // Use day-of-month as a poor-man's seed → same shape during a day
  const seed = start.getUTCDate() + start.getUTCMonth() * 31;
  for (let i = 0; i < 12; i++) {
    const slotStart = new Date(start.getTime() + i * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    // Pseudo-deterministic free/booked
    const free = ((seed * 17 + i * 31) % 10) >= 3;
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      free,
    });
  }

  return { slots, source: "booksys-mock" };
}

/**
 * Compute a UI-ready status from raw availability + scheduled hours.
 * Shop-level (not per-artist) to avoid promising specific availability we
 * can't deliver.
 */
export function computeStatus(availability, scheduledHours, now = new Date()) {
  const open = isOpenNow(scheduledHours, now);
  if (!open) {
    return {
      open: false,
      nextSlot: null,
      source: availability?.source || "schedule",
      stale: false,
    };
  }
  const nextFree = (availability?.slots || []).find(
    (s) => s.free && new Date(s.end) > now
  );
  return {
    open: true,
    nextSlot: nextFree ? formatTime(new Date(nextFree.start)) : null,
    source: availability?.source || "schedule",
    stale: false,
  };
}

/**
 * Schedule-only fallback when Booksys API is unreachable. Returns
 * truthful "open if within hours, else closed" without a slot estimate.
 */
export function scheduledStatus(scheduledHours, now = new Date()) {
  return {
    open: isOpenNow(scheduledHours, now),
    nextSlot: null,
    source: "schedule",
    stale: false,
  };
}

/* ---------- helpers ---------- */

function isOpenNow(hours, now) {
  if (!hours) return false;
  const dayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][now.getDay()];
  const range = hours[dayKey];
  if (!range || typeof range !== "string") return false;
  const m = range.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return false;
  const [, oh, om, ch, cm] = m.map(Number);
  const minNow = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + om;
  let close = ch * 60 + cm;
  if (close <= open) close += 24 * 60; // crosses midnight (e.g. fri til 05:00)
  const minNowAdj = minNow < open ? minNow + 24 * 60 : minNow;
  return minNowAdj >= open && minNowAdj < close;
}

function formatTime(d) {
  return d.toTimeString().slice(0, 5); // "HH:MM"
}
