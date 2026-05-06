'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Download, Image, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useCalendarStore } from '../store/calendarStore';

type Format = 'pdf' | 'png';
type Status = 'idle' | 'loading' | 'success' | 'error';

interface ButtonState {
  pdf: Status;
  png: Status;
}

interface ErrorState {
  pdf: string | null;
  png: string | null;
}

/**
 * Trigger a browser download from a Blob.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DownloadButtons() {
  const parsedData = useCalendarStore((s) => s.parsedData);

  const [status, setStatus] = useState<ButtonState>({ pdf: 'idle', png: 'idle' });
  const [errors, setErrors] = useState<ErrorState>({ pdf: null, png: null });

  if (!parsedData) return null;

  const handleDownload = async (format: Format) => {
    if (status[format] === 'loading') return;

    setStatus((prev) => ({ ...prev, [format]: 'loading' }));
    setErrors((prev) => ({ ...prev, [format]: null }));

    try {
      const response = await axios.post(
        '/api/generate',
        { byDay: parsedData.byDay, format },
        {
          responseType: 'blob',
          timeout: 120_000, // 2 min — Puppeteer can be slow
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const mimeType = format === 'pdf' ? 'application/pdf' : 'image/png';
      const ext = format;
      const blob = new Blob([response.data], { type: mimeType });
      triggerDownload(blob, `agenda-ejp-mai-2026.${ext}`);

      setStatus((prev) => ({ ...prev, [format]: 'success' }));

      // Reset to idle after 3s
      setTimeout(() => {
        setStatus((prev) => ({ ...prev, [format]: 'idle' }));
      }, 3000);
    } catch (err: unknown) {
      let message = 'Erreur lors de la génération.';

      if (axios.isAxiosError(err)) {
        // Try to read the error blob as text
        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            message = json.detail || json.error || message;
          } catch {
            // ignore parse error
          }
        } else {
          message =
            err.response?.data?.detail ||
            err.response?.data?.error ||
            err.message ||
            message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      setErrors((prev) => ({ ...prev, [format]: message }));
      setStatus((prev) => ({ ...prev, [format]: 'error' }));

      // Reset error after 5s
      setTimeout(() => {
        setStatus((prev) => ({ ...prev, [format]: 'idle' }));
        setErrors((prev) => ({ ...prev, [format]: null }));
      }, 5000);
    }
  };

  // ── Button renderer ─────────────────────────────────────────────────────────

  function DownloadButton({
    format,
    label,
    icon,
    colorClass,
    hoverClass,
    activeClass,
    loadingText,
  }: {
    format: Format;
    label: string;
    icon: React.ReactNode;
    colorClass: string;
    hoverClass: string;
    activeClass: string;
    loadingText: string;
  }) {
    const s = status[format];
    const err = errors[format];

    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => handleDownload(format)}
          disabled={s === 'loading'}
          className={`
            inline-flex items-center justify-center gap-2.5
            px-6 py-3 rounded-xl font-semibold text-sm text-white
            shadow-sm transition-all duration-150
            disabled:opacity-70 disabled:cursor-not-allowed
            ${s === 'success'
              ? 'bg-green-500 hover:bg-green-500 cursor-default'
              : s === 'error'
              ? 'bg-red-500 hover:bg-red-500 cursor-default'
              : `${colorClass} ${hoverClass} ${activeClass} hover:shadow-md active:scale-[0.98]`
            }
          `}
          aria-label={label}
        >
          {s === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{loadingText}</span>
            </>
          ) : s === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Téléchargé !</span>
            </>
          ) : s === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>Erreur</span>
            </>
          ) : (
            <>
              {icon}
              <span>{label}</span>
            </>
          )}
        </button>

        {/* Error message */}
        {s === 'error' && err && (
          <p className="text-xs text-red-500 text-center max-w-[200px]">{err}</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full animate-slide-up">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card-md p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Télécharger le calendrier
            </h2>
            <p className="text-xs text-gray-500">
              Choisissez votre format d&apos;export
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <DownloadButton
            format="pdf"
            label="Télécharger PDF"
            icon={<Download className="w-4 h-4" />}
            colorClass="bg-blue-600"
            hoverClass="hover:bg-blue-700"
            activeClass="active:bg-blue-800"
            loadingText="Génération PDF…"
          />
          <DownloadButton
            format="png"
            label="Télécharger Image PNG"
            icon={<Image className="w-4 h-4" />}
            colorClass="bg-purple-600"
            hoverClass="hover:bg-purple-700"
            activeClass="active:bg-purple-800"
            loadingText="Génération PNG…"
          />
        </div>

        <p className="mt-3 text-[11px] text-gray-400 flex items-start gap-1.5">
          <span className="mt-px">ℹ️</span>
          La génération peut prendre quelques secondes selon la complexité du calendrier.
        </p>
      </div>
    </div>
  );
}
