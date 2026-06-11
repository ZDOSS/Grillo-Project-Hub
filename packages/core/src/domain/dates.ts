/**
 * Date-only and timestamp domain types.
 *
 * Rules (from AI.md / FullSpec):
 *  - Planning dates use ISO YYYY-MM-DD strings, no time, no timezone.
 *  - Date-only values must display as the same day on every machine.
 *  - Reminders and history timestamps use full ISO 8601 UTC timestamps.
 *  - Never represent date-only values as UTC-midnight JS dates.
 */

export type DateOnly = string; // "YYYY-MM-DD"
export type Timestamp = string; // full ISO 8601 UTC, e.g. "2026-06-10T17:00:00.000Z"

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

export function isValidDateOnly(value: unknown): value is DateOnly {
  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function isValidTimestamp(value: unknown): value is Timestamp {
  if (typeof value !== "string" || !ISO_REGEX.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function dateOnlyToParts(value: DateOnly): { y: number; m: number; d: number } {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m, d };
}

export function isDateOnlyOrderValid(start: DateOnly | null, due: DateOnly | null): boolean {
  if (!start || !due) return true;
  return start <= due; // lexical YYYY-MM-DD comparison is chronological
}

export function formatDateOnly(value: DateOnly): string {
  return value;
}

export function nowTimestamp(): Timestamp {
  return new Date().toISOString();
}

export function todayDateOnly(timeZone?: string): DateOnly {
  if (!timeZone) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    // en-CA yields "YYYY-MM-DD"
    return fmt.format(new Date());
  } catch {
    return todayDateOnly();
  }
}

export function isValidIanaTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
