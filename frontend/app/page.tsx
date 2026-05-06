'use client';

import React from 'react';
import { CalendarDays, Github, Zap } from 'lucide-react';
import UploadZone from './components/UploadZone';
import CalendarPreview from './components/CalendarPreview';
import DownloadButtons from './components/DownloadButtons';
import { useCalendarStore } from './store/calendarStore';

export default function HomePage() {
  const uploadStatus = useCalendarStore((s) => s.uploadStatus);
  const parsedData = useCalendarStore((s) => s.parsedData);

  const hasData = uploadStatus === 'success' && parsedData !== null;

  return (
    <div className="min-h-screen bg-surface">
      {/* ══════════ HERO HEADER ══════════ */}
      <header className="gradient-header relative overflow-hidden">
        {/* Decorative pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-20">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-100 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest">
              <Zap className="w-3 h-3" />
              Générateur d&apos;agenda professionnel
            </span>
          </div>

          {/* Title */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
                Agenda EJP – Cotonou
              </h1>
            </div>

            <p className="text-lg sm:text-xl text-blue-100 font-light max-w-xl mx-auto leading-relaxed">
              Importez votre fichier <span className="font-semibold text-white">.ics</span> et générez
              un calendrier professionnel pour{' '}
              <span className="font-semibold text-white">Mai 2026</span> en PDF ou PNG.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {[
              { emoji: '📅', text: 'Mai 2026' },
              { emoji: '🎨', text: 'Design professionnel' },
              { emoji: '📄', text: 'Export PDF A4' },
              { emoji: '🖼️', text: 'Export PNG HD' },
              { emoji: '⚡', text: 'Instantané' },
            ].map(({ emoji, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full border border-white/15"
              >
                {emoji} {text}
              </span>
            ))}
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 40L60 33.3C120 26.7 240 13.3 360 10C480 6.7 600 13.3 720 16.7C840 20 960 20 1080 18.3C1200 16.7 1320 13.3 1380 11.7L1440 10V40H0Z"
              fill="#F8FAFC"
            />
          </svg>
        </div>
      </header>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* ── Step 1: Upload ── */}
        <section aria-label="Étape 1 : Importer le fichier ICS">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </div>
            <h2 className="text-base font-semibold text-gray-700">
              Importer votre fichier ICS
            </h2>
          </div>
          <UploadZone />
        </section>

        {/* ── Step 2: Preview (conditional) ── */}
        {hasData && (
          <section aria-label="Étape 2 : Aperçu du calendrier">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                2
              </div>
              <h2 className="text-base font-semibold text-gray-700">
                Aperçu du calendrier
              </h2>
            </div>
            <CalendarPreview />
          </section>
        )}

        {/* ── Step 3: Download (conditional) ── */}
        {hasData && (
          <section aria-label="Étape 3 : Téléchargement">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                3
              </div>
              <h2 className="text-base font-semibold text-gray-700">
                Télécharger le calendrier
              </h2>
            </div>
            <DownloadButtons />
          </section>
        )}

        {/* Empty state hint */}
        {!hasData && uploadStatus !== 'uploading' && (
          <div className="text-center py-6 text-gray-400 text-sm">
            <p>
              Importez un fichier <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono text-xs">.ics</code> pour commencer
            </p>
          </div>
        )}
      </main>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>
            Agenda EJP – Cotonou · Mai 2026
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
              Serveur actif
            </span>
            <a
              href="https://github.com"
              className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4" />
              Code source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
