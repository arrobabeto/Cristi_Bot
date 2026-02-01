// app/src/lib/tools/validate.ts
const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number) {
  const days = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[m - 1] ?? 0;
}

export function isValidDateIso(value: string): boolean {
  if (!DATE_ISO_RE.test(value)) return false;
  const [ys, ms, ds] = value.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isInteger(y) || y < 1900 || y > 3000) return false;
  if (!Number.isInteger(m) || m < 1 || m > 12) return false;
  const maxD = daysInMonth(y, m);
  return Number.isInteger(d) && d >= 1 && d <= maxD;
}

export function isValidMonth(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const [ys, ms] = value.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isInteger(y) || y < 1900 || y > 3000) return false;
  return Number.isInteger(m) && m >= 1 && m <= 12;
}

export function isNonNegativeInteger(value: number): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER // important for bigint-ish cents in JS
  );
}

export function isNonEmptyString(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidDateTimeIso(value: string): boolean {
  const dt = new Date(value);
  return !Number.isNaN(dt.getTime());
}
