import { DateTime } from "luxon";

export const DEFAULT_CUSTOM_PROGRESS_TIME_ZONE = "Asia/Taipei";

export function normalizeTimeZone(value: unknown) {
  if (typeof value !== "string") {
    return DEFAULT_CUSTOM_PROGRESS_TIME_ZONE;
  }

  const timeZone = value.trim();
  if (!timeZone || timeZone.length > 64) {
    return DEFAULT_CUSTOM_PROGRESS_TIME_ZONE;
  }

  return DateTime.now().setZone(timeZone).isValid
    ? timeZone
    : DEFAULT_CUSTOM_PROGRESS_TIME_ZONE;
}

export function parseClientDateTime(value: unknown, timeZone: string) {
  if (typeof value !== "string" || !value.trim()) {
    return DateTime.invalid("missing datetime");
  }

  return DateTime.fromISO(value.trim(), { zone: timeZone });
}

export function readUtcDateTime(value: unknown) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: "utc" });
  }

  if (typeof value === "string") {
    const sqlDateTime = DateTime.fromSQL(value, { zone: "utc" });
    if (sqlDateTime.isValid) {
      return sqlDateTime;
    }

    return DateTime.fromISO(value, { zone: "utc" });
  }

  return DateTime.invalid("unsupported datetime");
}
