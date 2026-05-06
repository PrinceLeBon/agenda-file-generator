import { create } from 'zustand';

export type EventCategory = 'MPI' | 'STAFF' | 'EJP';

export interface CalendarEvent {
  id: string;
  dateKey: string;
  dayNum: number;
  title: string;
  description: string;
  location: string;
  timeStr: string;
  isAllDay: boolean;
  category: EventCategory;
  color: string;
  startIso: string | null;
  endIso: string | null;
}

export interface ParsedData {
  byDay: Record<string, CalendarEvent[]>;
  allEvents: CalendarEvent[];
  meta: {
    month: string;
    totalEvents: number;
  };
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';
export type GenerateStatus = 'idle' | 'generating' | 'done' | 'error';

interface CalendarStore {
  // Upload state
  uploadStatus: UploadStatus;
  uploadError: string | null;
  parsedData: ParsedData | null;
  fileName: string | null;

  // Generate state
  generateStatus: GenerateStatus;
  generateError: string | null;

  // Actions
  setUploadStatus: (status: UploadStatus) => void;
  setUploadError: (err: string | null) => void;
  setParsedData: (data: ParsedData, fileName: string) => void;
  resetUpload: () => void;

  setGenerateStatus: (status: GenerateStatus) => void;
  setGenerateError: (err: string | null) => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  uploadStatus: 'idle',
  uploadError: null,
  parsedData: null,
  fileName: null,

  generateStatus: 'idle',
  generateError: null,

  setUploadStatus: (status) => set({ uploadStatus: status }),
  setUploadError: (err) => set({ uploadError: err }),
  setParsedData: (data, fileName) =>
    set({ parsedData: data, fileName, uploadStatus: 'success', uploadError: null }),
  resetUpload: () =>
    set({
      uploadStatus: 'idle',
      uploadError: null,
      parsedData: null,
      fileName: null,
      generateStatus: 'idle',
      generateError: null,
    }),

  setGenerateStatus: (status) => set({ generateStatus: status }),
  setGenerateError: (err) => set({ generateError: err }),
}));
