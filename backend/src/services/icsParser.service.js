'use strict';

const ical = require('node-ical');
const { parseISO, getDate, getMonth, getYear, isValid, differenceInMilliseconds } = require('date-fns');
const { utcToZonedTime, formatInTimeZone, getTimezoneOffset } = require('date-fns-tz');

const TARGET_MONTH = 4; // May = index 4 (0-based)
const TARGET_YEAR  = 2026;
const DEFAULT_TZ   = 'Africa/Porto-Novo'; // UTC+1, Cotonou

// Boundaries for RRULE expansion (UTC)
const MAY_START_UTC = new Date('2026-05-01T00:00:00Z');
const MAY_END_UTC   = new Date('2026-05-31T23:59:59Z');

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
 * Build a serialisable event object from a resolved local start date.
 */
function buildEvent(item, utcStart, utcEnd, uid) {
  // Use formatInTimeZone for all formatting — immune to Docker/system timezone
  const isAllDay = detectAllDay(item.start);
  let timeStr = '';
  if (!isAllDay) {
    timeStr = formatInTimeZone(utcStart, DEFAULT_TZ, 'HH:mm');
    if (utcEnd) timeStr += ' – ' + formatInTimeZone(utcEnd, DEFAULT_TZ, 'HH:mm');
  }

  const localStart = toLocal(utcStart); // only used for dateKey / dayNum
  const title       = (item.summary  || 'Sans titre').trim();
  const description = cleanDescription(item.description);
  const location    = (item.location || '').trim();
  const { category, color } = categorize(title);

  return {
    id:          uid,
    dateKey:     formatInTimeZone(utcStart, DEFAULT_TZ, 'yyyy-MM-dd'),
    dayNum:      getDate(localStart),
    title,
    description,
    location,
    timeStr,
    isAllDay,
    category,
    color,
    startIso:    utcStart.toISOString(),
    endIso:      utcEnd ? utcEnd.toISOString() : null,
    // Keep numeric timestamp for sorting (stripped before final return)
    _ts:         utcStart.getTime(),
  };
}

/**
 * Parse an ICS buffer and return events grouped by day for May 2026.
 * Handles both one-off events and recurring events (RRULE).
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

    const utcEnd      = toUtcDate(item.end);
    // Duration in ms, used to compute end time of recurrences
    const durationMs  = utcEnd ? differenceInMilliseconds(utcEnd, utcStart) : 0;

    if (item.rrule) {
      // ── Recurring event: expand all occurrences within May 2026 ──────────
      // node-ical stores DTSTART as correct UTC in item.start, but the rrule
      // object internally treats it as local time and re-converts to UTC when
      // expanding, causing a double-offset shift. Correct by re-adding the
      // event timezone offset to each returned occurrence.
      const eventTz   = (item.start && item.start.tz) ? item.start.tz : null;
      const occurrences = item.rrule.between(MAY_START_UTC, MAY_END_UTC, true);

      occurrences.forEach((occRaw, i) => {
        const occUtc = eventTz
          ? new Date(occRaw.getTime() + getTimezoneOffset(eventTz, occRaw))
          : occRaw;

        const localOcc = toLocal(occUtc);
        if (!isInMay(localOcc)) return;

        const occEnd = durationMs > 0 ? new Date(occUtc.getTime() + durationMs) : null;
        events.push(buildEvent(item, occUtc, occEnd, `${key}_occ${i}`));
      });
    } else {
      // ── One-off event ─────────────────────────────────────────────────────
      const localStart = toLocal(utcStart);
      if (!isInMay(localStart)) continue;

      events.push(buildEvent(item, utcStart, utcEnd, key));
    }
  }

  // Sort chronologically
  events.sort((a, b) => a._ts - b._ts);

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
