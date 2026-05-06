'use strict';

const ical = require('node-ical');
const { parseISO, getDate, getMonth, getYear, isValid, differenceInMilliseconds } = require('date-fns');
const { utcToZonedTime, formatInTimeZone, getTimezoneOffset } = require('date-fns-tz');

const TARGET_MONTH = 4; // May = index 4 (0-based)
const TARGET_YEAR  = 2026;
const DEFAULT_TZ   = 'Africa/Porto-Novo'; // UTC+1, Cotonou

// Wider search window for rrule expansion — ensures midnight events that cross
// UTC day boundaries are captured. isInMay() does the precise filtering.
const RRULE_START = new Date('2026-04-29T22:00:00Z'); // 2 days before May 1 local
const RRULE_END   = new Date('2026-06-02T02:00:00Z'); // 2 days after May 31 local

/**
 * Safely convert any node-ical date value to a plain JS Date (UTC-based).
 */
function toUtcDate(rawDate) {
  if (!rawDate) return null;
  if (rawDate instanceof Date) return isValid(rawDate) ? rawDate : null;
  if (typeof rawDate === 'string') {
    const d = parseISO(rawDate);
    return isValid(d) ? d : null;
  }
  if (rawDate.val) {
    const d = parseISO(rawDate.val);
    return isValid(d) ? d : null;
  }
  return null;
}

/**
 * Convert a UTC Date to Cotonou-local Date.
 */
function toLocal(utcDate) {
  return utcToZonedTime(utcDate, DEFAULT_TZ);
}

/**
 * Return true if the local date falls in May 2026.
 */
function isInMay(localDate) {
  return getMonth(localDate) === TARGET_MONTH && getYear(localDate) === TARGET_YEAR;
}

/**
 * Strip Google Meet boilerplate and other noise from event descriptions.
 * Removes: ~:~ separator lines, Meet links, support links, "do not edit" notices.
 */
function cleanDescription(raw) {
  if (!raw) return '';

  return raw
    // Remove the -::~:~:...:~::- separator blocks (Google Meet artifact)
    .replace(/-::~:~[:\~]*-?/g, '')
    // Remove Google Meet join lines
    .replace(/Join with Google Meet:.*$/gim, '')
    // Remove Meet/support URLs
    .replace(/https?:\/\/(meet\.google\.com|support\.google\.com)[^\s]*/gi, '')
    // Remove "Learn more about Meet" lines
    .replace(/Learn more about Meet at:.*$/gim, '')
    // Remove "Please do not edit" lines
    .replace(/Please do not edit this section\.?/gi, '')
    // Remove lines that are only punctuation/dashes
    .replace(/^[\s\-_=:~]+$/gm, '')
    // Collapse multiple blank lines into one
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Detect all-day events.
 */
function detectAllDay(rawStart) {
  if (!rawStart) return false;
  if (rawStart.dateOnly === true) return true;
  if (typeof rawStart === 'string' && rawStart.length === 8) return true; // YYYYMMDD
  return false;
}

/**
 * Determine event category and color from title.
 */
function categorize(title = '') {
  const upper = title.toUpperCase();
  if (upper.includes('MPI'))   return { category: 'MPI',   color: '#2563EB' };
  if (upper.includes('STAFF')) return { category: 'STAFF', color: '#16A34A' };
  return { category: 'EJP', color: '#7C3AED' };
}

/**
 * Build a serialisable event object.
 *
 * utcStart  – corrected UTC used for time display (timeStr, startIso, _ts)
 * dateRef   – raw rrule occurrence used for date grouping (dateKey, dayNum)
 *             falls back to utcStart for one-off events
 */
function buildEvent(item, utcStart, utcEnd, uid, dateRef) {
  const ref = dateRef || utcStart;

  // Use formatInTimeZone for all formatting — immune to Docker/system timezone
  const isAllDay = detectAllDay(item.start);
  let timeStr = '';
  if (!isAllDay) {
    timeStr = formatInTimeZone(utcStart, DEFAULT_TZ, 'HH:mm');
    if (utcEnd) timeStr += ' – ' + formatInTimeZone(utcEnd, DEFAULT_TZ, 'HH:mm');
  }

  const localRef = toLocal(ref);
  const title       = (item.summary  || 'Sans titre').trim();
  const description = cleanDescription(item.description);
  const location    = (item.location || '').trim();
  const { category, color } = categorize(title);

  return {
    id:          uid,
    dateKey:     formatInTimeZone(ref, DEFAULT_TZ, 'yyyy-MM-dd'),
    dayNum:      getDate(localRef),
    title,
    description,
    location,
    timeStr,
    isAllDay,
    category,
    color,
    startIso:    utcStart.toISOString(),
    endIso:      utcEnd ? utcEnd.toISOString() : null,
    // Keep numeric timestamp for chronological sorting (stripped before final return)
    _ts:         utcStart.getTime(),
  };
}

/**
 * Parse an ICS buffer and return events grouped by day for May 2026.
 * Handles both one-off events and recurring events (RRULE).
 *
 * node-ical bug: rrule.between() applies a double timezone conversion, returning
 * occurrences shifted by -1×timezone_offset. This matters in two ways:
 *   1. TIME is shifted (e.g. 03:00 → 02:00) → fix by adding offset to get corrected UTC
 *   2. DATE may shift for midnight-crossing events (e.g. Mon 00:00 Lagos appears as
 *      Sun 22:00Z raw → Mon 23:00Z corrected = Tue 00:00 Porto-Novo if correction applied
 *      to dateKey too) → fix by using the RAW occurrence for dateKey only
 *
 * @param {Buffer} buffer
 * @returns {{ byDay: Object, allEvents: Array, meta: Object }}
 */
function parseIcsBuffer(buffer) {
  const raw    = ical.parseICS(buffer.toString('utf-8'));
  const events = [];

  for (const key of Object.keys(raw)) {
    const item = raw[key];
    if (item.type !== 'VEVENT') continue;

    const utcStart = toUtcDate(item.start);
    if (!utcStart) continue;

    const utcEnd     = toUtcDate(item.end);
    // Duration in ms, used to compute end time of recurrences
    const durationMs = utcEnd ? differenceInMilliseconds(utcEnd, utcStart) : 0;

    if (item.rrule) {
      // ── Recurring event: expand all occurrences within May 2026 ──────────
      const eventTz     = (item.start && item.start.tz) ? item.start.tz : null;
      const occurrences = item.rrule.between(RRULE_START, RRULE_END, true);

      occurrences.forEach((occRaw, i) => {
        // occRaw: use AS-IS for dateKey (the raw rrule output already maps to
        // the correct Porto-Novo local date when formatted with formatInTimeZone)
        const localOcc = toLocal(occRaw);
        if (!isInMay(localOcc)) return;

        // occUtc: timezone-corrected date used for time display and startIso
        // (adds back the offset that rrule incorrectly subtracted)
        const occUtc = eventTz
          ? new Date(occRaw.getTime() + getTimezoneOffset(eventTz, occRaw))
          : occRaw;

        const occEnd = durationMs > 0 ? new Date(occUtc.getTime() + durationMs) : null;
        events.push(buildEvent(item, occUtc, occEnd, `${key}_occ${i}`, occRaw));
      });
    } else {
      // ── One-off event (including multi-day all-day events) ────────────────
      const isAllDay = detectAllDay(item.start);

      if (isAllDay && utcEnd && durationMs >= 86400000 * 2) {
        // Multi-day all-day event: DTEND is exclusive in ICS.
        // Create one entry per day covered so each day appears on the calendar.
        const MS_PER_DAY = 86400000;
        const totalDays  = Math.round(durationMs / MS_PER_DAY);

        for (let d = 0; d < totalDays; d++) {
          const dayStart = new Date(utcStart.getTime() + d * MS_PER_DAY);
          const localDay = toLocal(dayStart);
          if (!isInMay(localDay)) continue;
          events.push(buildEvent(item, dayStart, utcEnd, `${key}_day${d}`));
        }
      } else {
        const localStart = toLocal(utcStart);
        if (!isInMay(localStart)) continue;
        events.push(buildEvent(item, utcStart, utcEnd, key));
      }
    }
  }

  // Sort chronologically by Porto-Novo local date + time
  // (using dateKey + timeStr avoids UTC-to-local day-boundary issues)
  events.sort((a, b) => {
    const aKey = a.dateKey + (a.timeStr || '');
    const bKey = b.dateKey + (b.timeStr || '');
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });

  // Group by day
  const byDay = {};
  for (const evt of events) {
    if (!byDay[evt.dateKey]) byDay[evt.dateKey] = [];
    byDay[evt.dateKey].push(evt);
  }

  // Strip internal sort key
  const clean = (arr) => arr.map(({ _ts, ...rest }) => rest);

  const allEvents  = clean(events);
  const byDayClean = {};
  for (const [dk, arr] of Object.entries(byDay)) {
    byDayClean[dk] = clean(arr);
  }

  return {
    byDay:     byDayClean,
    allEvents,
    meta: {
      month:       'Mai 2026',
      totalEvents: allEvents.length,
    },
  };
}

module.exports = { parseIcsBuffer };
