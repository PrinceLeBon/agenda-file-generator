'use strict';

/**
 * Builds the full calendar grid data structure for May 2026.
 *
 * May 2026:
 *   - 31 days
 *   - May 1st is a Friday (weekday index 5, Mon=0 … Sun=6, or Sun=0 … Sat=6)
 *   - We use Sunday-first grid (Sun=0, Mon=1, … Sat=6)
 *   - May 1 2026 is a Friday → index 5 in Sun-first grid
 */

const DAYS_OF_WEEK = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAYS_OF_WEEK_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const MAY_2026_FIRST_WEEKDAY = 5; // Friday (Sunday-first, 0-indexed)
const MAY_2026_DAYS = 31;
const YEAR = 2026;
const MONTH = 5; // 1-indexed for display

/**
 * Pad a number with leading zero.
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Build the calendar grid for May 2026.
 *
 * @param {Object} byDay  { 'yyyy-MM-dd': [ eventObj, … ] }
 * @param {number} maxVisible  Max events shown before "+X autres" overflow
 * @returns {Object} Full grid data for the EJS template
 */
function buildCalendarGrid(byDay = {}, maxVisible = 2) {
  // Total cells needed: leading empty cells + 31 days
  const leadingEmpty = MAY_2026_FIRST_WEEKDAY;
  const totalCells = leadingEmpty + MAY_2026_DAYS;
  // Round up to full week
  const rows = Math.ceil(totalCells / 7);

  const cells = [];

  // Leading empty cells
  for (let i = 0; i < leadingEmpty; i++) {
    cells.push({ empty: true, day: null, dateKey: null, events: [], visible: [], overflow: 0 });
  }

  // Day cells
  for (let d = 1; d <= MAY_2026_DAYS; d++) {
    const dateKey = `${YEAR}-${pad2(MONTH)}-${pad2(d)}`;
    const allEvents = (byDay[dateKey] || []).slice(); // already sorted by time

    const visible = allEvents.slice(0, maxVisible);
    const overflow = Math.max(0, allEvents.length - maxVisible);

    // Is today? (May 6, 2026 — but we can also check against actual today)
    const isToday = d === 6; // current date from context: 2026-05-06

    cells.push({
      empty: false,
      day: d,
      dateKey,
      weekdayIndex: (leadingEmpty + d - 1) % 7,
      isToday,
      events: allEvents,
      visible,
      overflow,
    });
  }

  // Trailing empty cells to complete the grid
  const trailing = rows * 7 - cells.length;
  for (let i = 0; i < trailing; i++) {
    cells.push({ empty: true, day: null, dateKey: null, events: [], visible: [], overflow: 0 });
  }

  // Build weeks array (rows of 7 cells)
  const weeks = [];
  for (let r = 0; r < rows; r++) {
    weeks.push(cells.slice(r * 7, r * 7 + 7));
  }

  // Build a flat list of all events sorted chronologically for the detail section
  const allEventsList = [];
  for (let d = 1; d <= MAY_2026_DAYS; d++) {
    const dateKey = `${YEAR}-${pad2(MONTH)}-${pad2(d)}`;
    const evts = byDay[dateKey] || [];
    for (const evt of evts) {
      allEventsList.push({ ...evt, dateKey, day: d });
    }
  }

  return {
    weeks,
    daysOfWeek: DAYS_OF_WEEK,
    daysOfWeekFull: DAYS_OF_WEEK_FULL,
    allEventsList,
    meta: {
      month: 'Mai',
      year: YEAR,
      totalEvents: allEventsList.length,
    },
  };
}

module.exports = { buildCalendarGrid };
