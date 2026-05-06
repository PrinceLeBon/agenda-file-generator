'use client';

import React, { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  CloudUpload,
} from 'lucide-react';
import { useCalendarStore, ParsedData } from '../store/calendarStore';

export default function UploadZone() {
  const {
    uploadStatus,
    uploadError,
    fileName,
    setParsedData,
    setUploadStatus,
    setUploadError,
    resetUpload,
  } = useCalendarStore();

  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      // Validate extension
      if (!file.name.toLowerCase().endsWith('.ics')) {
        setUploadError('Le fichier doit avoir l\'extension .ics');
        setUploadStatus('error');
        return;
      }

      // Validate size (max 10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Le fichier est trop volumineux (max 10 Mo).');
        setUploadStatus('error');
        return;
      }

      setUploadStatus('uploading');
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post<ParsedData & { success: boolean }>(
          '/api/upload-ics',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          }
        );

        const { success, byDay, allEvents, meta } = response.data;

        if (!success) {
          throw new Error('Réponse inattendue du serveur.');
        }

        setParsedData({ byDay, allEvents, meta }, file.name);
      } catch (err: unknown) {
        let message = 'Erreur lors de l\'analyse du fichier.';
        if (axios.isAxiosError(err)) {
          message =
            err.response?.data?.detail ||
            err.response?.data?.error ||
            err.message ||
            message;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setUploadError(message);
        setUploadStatus('error');
      }
    },
    [setParsedData, setUploadError, setUploadStatus]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so the same file can be re-uploaded
      e.target.value = '';
    },
    [processFile]
  );

  // ── Idle state ────────────────────────────────────────────────────────────
  if (uploadStatus === 'idle' || uploadStatus === 'error') {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in">
        <div
          role="button"
          tabIndex={0}
          aria-label="Zone de dépôt de fichier ICS"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-4
            border-2 border-dashed rounded-2xl
            p-12 cursor-pointer select-none
            transition-all duration-200
            ${isDragging
              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100 scale-[1.01]'
              : uploadStatus === 'error'
              ? 'border-red-300 bg-red-50/50 hover:border-red-400'
              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".ics"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Icon */}
          <div
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center
              transition-colors duration-200
              ${isDragging
                ? 'bg-blue-100 text-blue-600'
                : uploadStatus === 'error'
                ? 'bg-red-100 text-red-500'
                : 'bg-gray-100 text-gray-500'
              }
            `}
          >
            {uploadStatus === 'error' ? (
              <XCircle className="w-8 h-8" />
            ) : isDragging ? (
              <CloudUpload className="w-8 h-8" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          {/* Main text */}
          <div className="text-center">
            <p
              className={`text-lg font-semibold mb-1 ${
                uploadStatus === 'error' ? 'text-red-600' : 'text-gray-800'
              }`}
            >
              {isDragging
                ? 'Relâchez pour importer'
                : uploadStatus === 'error'
                ? 'Fichier invalide'
                : 'Glissez votre fichier .ics ici'}
            </p>
            {uploadStatus === 'error' && uploadError ? (
              <p className="text-sm text-red-500 max-w-sm text-center">{uploadError}</p>
            ) : (
              <p className="text-sm text-gray-500">
                Fichiers ICS uniquement · max 10 Mo
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Button */}
          <button
            type="button"
            className="
              px-6 py-2.5 rounded-xl font-semibold text-sm
              bg-blue-600 hover:bg-blue-700 active:bg-blue-800
              text-white shadow-sm hover:shadow-md
              transition-all duration-150
              pointer-events-none
            "
          >
            {uploadStatus === 'error' ? 'Réessayer' : 'Choisir un fichier'}
          </button>

          {/* Decorative ring when dragging */}
          {isDragging && (
            <div className="absolute inset-0 rounded-2xl border-2 border-blue-500 pointer-events-none animate-pulse-soft" />
          )}
        </div>
      </div>
    );
  }

  // ── Uploading state ───────────────────────────────────────────────────────
  if (uploadStatus === 'uploading') {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in">
        <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-blue-300 rounded-2xl p-12 bg-blue-50/50">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-700">Analyse en cours…</p>
            <p className="text-sm text-blue-500 mt-1">
              Extraction des événements de Mai 2026
            </p>
          </div>
          <div className="w-full max-w-xs bg-blue-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (uploadStatus === 'success') {
    const { parsedData } = useCalendarStore.getState();
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 border border-green-200 rounded-2xl p-5 bg-green-50">
          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-800 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {fileName}
            </p>
            <p className="text-sm text-green-600 mt-0.5">
              {parsedData?.meta.totalEvents ?? 0} événement
              {(parsedData?.meta.totalEvents ?? 0) !== 1 ? 's' : ''} trouvé
              {(parsedData?.meta.totalEvents ?? 0) !== 1 ? 's' : ''} pour Mai 2026
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetUpload();
            }}
            className="text-sm text-green-600 hover:text-green-800 font-medium underline underline-offset-2 flex-shrink-0"
          >
            Changer
          </button>
        </div>
      </div>
    );
  }

  return null;
}
