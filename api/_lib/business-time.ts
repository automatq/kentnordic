export interface WorkspaceSchedule {
  timezone: string;
  firstResponseSlaHours: number;
  followUpBusinessDays: number;
  followUpTime: string;
  businessHours: {
    start: string;
    end: string;
    weekdays: number[];
  };
}

export const DEFAULT_WORKSPACE_SCHEDULE: WorkspaceSchedule = {
  timezone: "Atlantic/Reykjavik",
  firstResponseSlaHours: 4,
  followUpBusinessDays: 1,
  followUpTime: "09:00",
  businessHours: {
    start: "09:00",
    end: "17:00",
    weekdays: [1, 2, 3, 4, 5],
  },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

export function workspaceSchedule(value: unknown): WorkspaceSchedule {
  const source = isRecord(value) ? value : {};
  const hours = isRecord(source.businessHours) ? source.businessHours : {};
  const timezone = canonicalTimezone(source.timezone);
  const weekdays = Array.isArray(hours.weekdays)
    ? [
        ...new Set(
          hours.weekdays
            .map(Number)
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
        ),
      ]
    : DEFAULT_WORKSPACE_SCHEDULE.businessHours.weekdays;

  return {
    timezone,
    firstResponseSlaHours: boundedNumber(
      source.firstResponseSlaHours,
      1,
      72,
      4,
    ),
    followUpBusinessDays: boundedNumber(source.followUpBusinessDays, 1, 30, 1),
    followUpTime: validTime(source.followUpTime)
      ? String(source.followUpTime)
      : validTime(hours.start)
        ? String(hours.start)
        : "09:00",
    businessHours: {
      start: validTime(hours.start) ? String(hours.start) : "09:00",
      end: validTime(hours.end) ? String(hours.end) : "17:00",
      weekdays: weekdays.length
        ? weekdays.sort((a, b) => a - b)
        : [1, 2, 3, 4, 5],
    },
  };
}

export function businessMinutesBetween(
  from: Date | string,
  to: Date | string,
  rawSchedule: WorkspaceSchedule | unknown = DEFAULT_WORKSPACE_SCHEDULE,
) {
  const start = new Date(from);
  const end = new Date(to);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  )
    return 0;

  const schedule = workspaceSchedule(rawSchedule);
  const startLocal = zonedParts(start, schedule.timezone);
  const endLocal = zonedParts(end, schedule.timezone);
  const cursor = new Date(
    Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day),
  );
  const last = Date.UTC(endLocal.year, endLocal.month - 1, endLocal.day);
  const [openHour, openMinute] = parseTime(schedule.businessHours.start);
  const [closeHour, closeMinute] = parseTime(schedule.businessHours.end);
  let total = 0;

  while (cursor.getTime() <= last) {
    const weekday = cursor.getUTCDay();
    if (schedule.businessHours.weekdays.includes(weekday)) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      const day = cursor.getUTCDate();
      const open = zonedDateTimeToUtc(
        year,
        month,
        day,
        openHour,
        openMinute,
        schedule.timezone,
      ).getTime();
      const close = zonedDateTimeToUtc(
        year,
        month,
        day,
        closeHour,
        closeMinute,
        schedule.timezone,
      ).getTime();
      const overlapStart = Math.max(start.getTime(), open);
      const overlapEnd = Math.min(end.getTime(), close);
      if (overlapEnd > overlapStart)
        total += (overlapEnd - overlapStart) / 60_000;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return Math.round(total);
}

export function nextBusinessDay(
  from: Date | string = new Date(),
  rawSchedule: WorkspaceSchedule | unknown = DEFAULT_WORKSPACE_SCHEDULE,
) {
  const schedule = workspaceSchedule(rawSchedule);
  const local = zonedParts(new Date(from), schedule.timezone);
  const cursor = new Date(Date.UTC(local.year, local.month - 1, local.day));
  let remaining = schedule.followUpBusinessDays;

  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (schedule.businessHours.weekdays.includes(cursor.getUTCDay()))
      remaining -= 1;
  }

  const [hour, minute] = parseTime(schedule.followUpTime);
  return zonedDateTimeToUtc(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth() + 1,
    cursor.getUTCDate(),
    hour,
    minute,
    schedule.timezone,
  ).toISOString();
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
) {
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(guess), timezone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const difference = desired - represented;
    if (!difference) break;
    guess += difference;
  }
  return new Date(guess);
}

function zonedParts(date: Date, timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timezone, formatter);
  }
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
  };
}

function parseTime(value: string): [number, number] {
  const [hour, minute] = value.split(":").map(Number);
  return [hour || 0, minute || 0];
}

function validTime(value: unknown) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validTimezone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function canonicalTimezone(value: unknown) {
  const requested = value === "Europe/Reykjavik" ? "Atlantic/Reykjavik" : value;
  return validTimezone(requested)
    ? String(requested)
    : DEFAULT_WORKSPACE_SCHEDULE.timezone;
}

function boundedNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, Math.round(number)))
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
