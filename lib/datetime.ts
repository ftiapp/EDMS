export const BANGKOK_TZ = "Asia/Bangkok";

function parseUnknownDateInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If the string already has timezone info (Z or ±hh:mm), trust native parsing.
  const hasTimeZoneInfo = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  if (hasTimeZoneInfo) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Handle common DB formats without timezone:
  // - "YYYY-MM-DD HH:mm"
  // - "YYYY-MM-DD HH:mm:ss"
  // - "YYYY-MM-DDTHH:mm"
  // - "YYYY-MM-DDTHH:mm:ss"
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/
  );

  if (match) {
    const [, y, m, day, hh, mm, ssMaybe] = match;
    const year = Number(y);
    const monthIndex = Number(m) - 1;
    const dateNum = Number(day);
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ssMaybe ?? "0");

    // Treat "no timezone" DB inputs as UTC (common when using server-side NOW() in UTC).
    const utcMs = Date.UTC(year, monthIndex, dateNum, hour, minute, second);
    const d = new Date(utcMs);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Fallback: native parsing (can be environment-dependent)
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatThaiDateTime(raw: string | null | undefined): string {
  if (!raw) return "ไม่พบวันที่บันทึกเอกสาร";

  const d = parseUnknownDateInput(raw);
  if (!d) return raw;

  const formatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: BANGKOK_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(d)} น.`;
}

export function formatThaiDateTimeOrDash(raw: string | null | undefined): string {
  if (!raw) return "-";
  return formatThaiDateTime(raw);
}

export function toBangkokDateString(raw: string | Date | null | undefined): string | null {
  if (!raw) return null;

  const d =
    raw instanceof Date
      ? raw
      : typeof raw === "string"
        ? parseUnknownDateInput(raw)
        : null;

  if (!d) return null;

  // YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(d);
}
