'use client';

import React, { useMemo } from 'react';
import { useCalendarStore, CalendarEvent } from '../store/calendarStore';
import { Calendar } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MAY_2026_FIRST_WEEKDAY = 5; // Friday (Sunday-first, 0-indexed)
const MAY_2026_DAYS = 31;
const MAX_VISIBLE = 2;

// ─── Category styling ─────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { border: string; bg: string; title: string; time: string }> = {
  MPI: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    title: 'text-blue-700',
    time: 'text-blue-500',
  },
  STAFF: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    title: 'text-green-700',
    time: 'text-green-500',
  },
  EJP: {
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    title: 'text-purple-700',
    time: 'text-purple-500',
  },
};

function getCategory(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.EJP;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const style = getCategory(event.category);
  return (
    <div
      className={`
        border-l-2 ${style.border} ${style.bg} rounded-sm
        px-1.5 py-0.5 mb-0.5 overflow-hidden
      `}
    >
      <p className={`text-[10px] font-semibold leading-tight truncate ${style.title}`}>
        {event.title}
      </p>
      <p className={`text-[9px] leading-tight mt-px ${style.time}`}>
        {event.timeStr || 'Journée entière'}
      </p>
    </div>
  );
}

// ─── Calendar grid builder ────────────────────────────────────────────────────

function buildGrid(byDay: Record<string, CalendarEvent[]>) {
  function pad2(n: number) {
    return String(n).padStart(2, '0');
  }

  type Cell =
    | { empty: true }
    | {
        empty: false;
        day: number;
        dateKey: string;
        isToday: boolean;
        isWeekend: boolean;
        visible: CalendarEvent[];
        overflow: number;
        total: number;
      };

  const cells: Cell[] = [];
  const TODAY_DAY = 6; // May 6 2026

  // Leading empties
  for (let i = 0; i < MAY_2026_FIRST_WEEKDAY; i++) {
    cells.push({ empty: true });
  }

  for (let d = 1; d <= MAY_2026_DAYS; d++) {
    const dateKey = `2026-05-${pad2(d)}`;
    const allEvt = byDay[dateKey] ?? [];
    const colIdx = (MAY_2026_FIRST_WEEKDAY + d - 1) % 7;
    const isWeekend = colIdx === 0 || colIdx === 6;

    cells.push({
      empty: false,
      day: d,
      dateKey,
      isToday: d === TODAY_DAY,
      isWeekend,
      visible: allEvt.slice(0, MAX_VISIBLE),
      overflow: Math.max(0, allEvt.length - MAX_VISIBLE),
      total: allEvt.length,
    });
  }

  // Trailing empties
  const rows = Math.ceil(cells.length / 7);
  while (cells.length < rows * 7) {
    cells.push({ empty: true });
  }

  const weeks: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    weeks.push(cells.slice(r * 7, r * 7 + 7));
  }
  return weeks;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPreview() {
  const parsedData = useCalendarStore((s) => s.parsedData);

  const weeks = useMemo(
    () => buildGrid(parsedData?.byDay ?? {}),
    [parsedData]
  );

  if (!parsedData) return null;

  const { meta, allEvents } = parsedData;

  // Count by category
  const countMPI = allEvents.filter((e) => e.category === 'MPI').length;
  const countSTAFF = allEvents.filter((e) => e.category === 'STAFF').length;
  const countEJP = allEvents.filter((e) => e.category === 'EJP').length;

  return (
    <div className="w-full animate-slide-up">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Aperçu du calendrier</h2>
          <p className="text-sm text-gray-500">
            {meta.totalEvents} événement{meta.totalEvents !== 1 ? 's' : ''} · {meta.month}
          </p>
        </div>
        {/* Category stats */}
        <div className="ml-auto flex items-center gap-2">
          {countMPI > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />
              MPI · {countMPI}
            </span>
          )}
          {countSTAFF > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
              <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
              STAFF · {countSTAFF}
            </span>
          )}
          {countEJP > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
              <span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />
              EJP · {countEJP}
            </span>
          )}
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card-md overflow-hidden">
        {/* Mini header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 px-5 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm tracking-wide">Mai 2026</span>
          <span className="text-white/70 text-xs font-medium">
            Programmes EJP – Cotonou
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-[11px] font-bold uppercase tracking-wide ${
                i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {weeks.map((week, wi) =>
            week.map((cell, ci) => {
              if (cell.empty) {
                return (
                  <div
                    key={`e-${wi}-${ci}`}
                    className="min-h-[90px] bg-gray-50/50"
                  />
                );
              }

              const isWeekend = ci === 0 || ci === 6;

              return (
                <div
                  key={cell.dateKey}
                  className={`
                    min-h-[90px] p-1.5 relative
                    ${isWeekend ? 'bg-gray-50/60' : 'bg-white'}
                    ${cell.isToday ? 'bg-orange-50/80' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={`
                        inline-flex items-center justify-center w-6 h-6 rounded-full
                        text-xs font-semibold
                        ${cell.isToday
                          ? 'bg-orange-500 text-white'
                          : isWeekend
                          ? 'text-red-400 font-medium'
                          : 'text-gray-700'
                        }
                      `}
                    >
                      {cell.day}
                    </span>
                  </div>

                  {/* Events */}
                  <div>
                    {cell.visible.map((evt) => (
                      <EventCard key={evt.id} event={evt} />
                    ))}
                    {cell.overflow > 0 && (
                      <span className="inline-flex items-center text-[9px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5 mt-0.5">
                        +{cell.overflow} autre{cell.overflow > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-gray-600">
        <span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
          Légende :
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
          MPI
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
          STAFF
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" />
          EJP
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-5 h-5 rounded-full bg-orange-500 inline-flex items-center justify-center text-white text-[9px] font-bold">6</span>
          Aujourd&apos;hui
        </span>
      </div>

      {/* Detailed event list — grouped by day (timeline) */}
      {allEvents.length > 0 && (() => {
        const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const DAY_NAMES_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

        // Group events by dayNum
        const byDay: Record<number, CalendarEvent[]> = {};
        for (const evt of allEvents) {
          if (!byDay[evt.dayNum]) byDay[evt.dayNum] = [];
          byDay[evt.dayNum].push(evt);
        }
        const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);

        // Week number helper (May 1 = Fri = col 5)
        const weekOf = (d: number) => Math.ceil((MAY_2026_FIRST_WEEKDAY + d) / 7);

        // Group days into weeks
        const weeks: Record<number, number[]> = {};
        for (const d of days) {
          const w = weekOf(d);
          if (!weeks[w]) weeks[w] = [];
          weeks[w].push(d);
        }

        return (
          <div className="mt-5 space-y-6">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                Détail des événements
              </h3>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                {meta.totalEvents} événements
              </span>
            </div>

            {Object.entries(weeks).map(([weekNum, weekDays]) => (
              <div key={weekNum}>
                {/* Week label */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">
                    Semaine {weekNum}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Days in this week */}
                <div className="space-y-3">
                  {weekDays.map((dayNum) => {
                    const dow = (MAY_2026_FIRST_WEEKDAY + dayNum - 1) % 7;
                    const isWeekend = dow === 0 || dow === 6;
                    const isToday = dayNum === 6;
                    const eventsOfDay = byDay[dayNum];

                    return (
                      <div key={dayNum} className="flex gap-3">
                        {/* Day badge */}
                        <div className="flex-shrink-0 w-16 pt-0.5">
                          <div className={`
                            rounded-xl text-center py-1.5 px-1
                            ${isToday
                              ? 'bg-orange-500 text-white'
                              : isWeekend
                              ? 'bg-red-50 border border-red-100'
                              : 'bg-gray-50 border border-gray-200'
                            }
                          `}>
                            <div className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-orange-100' : isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                              {DAY_NAMES[dow]}
                            </div>
                            <div className={`text-xl font-extrabold leading-tight ${isToday ? 'text-white' : isWeekend ? 'text-red-500' : 'text-gray-800'}`}>
                              {String(dayNum).padStart(2, '0')}
                            </div>
                            <div className={`text-[9px] ${isToday ? 'text-orange-100' : 'text-gray-400'}`}>
                              mai
                            </div>
                          </div>
                        </div>

                        {/* Events for this day */}
                        <div className="flex-1 space-y-1.5">
                          {eventsOfDay.map((evt) => {
                            const style = getCategory(evt.category);
                            return (
                              <div
                                key={evt.id}
                                className={`
                                  flex items-start gap-2.5 rounded-xl px-3 py-2
                                  border-l-4 ${style.border} ${style.bg}
                                `}
                              >
                                {/* Time */}
                                <div className="flex-shrink-0 w-20 pt-px">
                                  <span className={`text-[11px] font-semibold tabular-nums ${style.time}`}>
                                    {evt.timeStr || 'Journée'}
                                  </span>
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold leading-tight ${style.title}`}>
                                    {evt.title}
                                  </p>
                                  {evt.description && (
                                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-1">
                                      {evt.description}
                                    </p>
                                  )}
                                </div>
                                {/* Category badge */}
                                <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.title} border ${style.border} opacity-80`}>
                                  {evt.category}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
