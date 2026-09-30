import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SAGP_DATE_UNAVAILABLE = 'Fecha no disponible';
const SAGP_TIME_ZONE = 'America/Tegucigalpa';

function sagpDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date : null;
}

function sagpToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    let date: Date;
    if (value instanceof Date) {
      date = new Date(value.getTime());
    } else if (typeof value === 'object') {
      const timestamp = value as {
        toDate?: () => Date;
        seconds?: number;
        nanoseconds?: number;
        _seconds?: number;
        _nanoseconds?: number;
      };
      if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else {
        const seconds = timestamp.seconds ?? timestamp._seconds;
        const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
        if (typeof seconds !== 'number' || !Number.isFinite(seconds) ||
            typeof nanoseconds !== 'number' || !Number.isFinite(nanoseconds) ||
            nanoseconds < 0 || nanoseconds >= 1_000_000_000) return null;
        date = new Date(seconds * 1000 + nanoseconds / 1_000_000);
      }
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      date = new Date(value);
    } else if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return sagpDateOnly(value);
      date = new Date(value);
    } else {
      return null;
    }
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

export function formatDate(value: unknown): string {
  const date = sagpToDate(value);
  if (!date) return SAGP_DATE_UNAVAILABLE;
  const calendarOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  return date.toLocaleDateString('es-HN', {
    timeZone: calendarOnly ? 'UTC' : SAGP_TIME_ZONE,
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateTime(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  const date = sagpToDate(value);
  if (!date) return SAGP_DATE_UNAVAILABLE;
  return date.toLocaleString('es-HN', {
    timeZone: SAGP_TIME_ZONE,
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
