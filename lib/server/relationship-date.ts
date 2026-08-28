const DEFAULT_TIMEZONE = "Asia/Shanghai";

export function normalizeRelationshipTimezone(
  value: string | null | undefined,
) {
  const timezone = value?.trim() || DEFAULT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    }).format(new Date());

    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function dateKeyInTimezone(
  value: Date,
  timezone: string,
) {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(value);

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";

  const month =
    parts.find((part) => part.type === "month")?.value ?? "";

  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  if (!year || !month || !day) {
    throw new Error("无法计算关系日期");
  }

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(
  dateKey: string,
  amount: number,
) {
  const date = new Date(`${dateKey}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("无效的日期");
  }

  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

export function calendarDayOrdinal(
  dateKey: string,
) {
  const date = new Date(`${dateKey}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("无效的日期");
  }

  return Math.floor(
    date.getTime() / (24 * 60 * 60 * 1000),
  );
}

function timezoneOffsetMs(
  value: Date,
  timezone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(value);

  const read = (type: string) =>
    Number(
      parts.find(
        (part) =>
          part.type === type,
      )?.value ?? "0",
    );

  const representedAsUtc =
    Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour"),
      read("minute"),
      read("second"),
    );

  return (
    representedAsUtc -
    value.getTime()
  );
}

export function localDateStartUtc(
  dateKey: string,
  timezone: string,
) {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    throw new Error(
      "无效的关系日期",
    );
  }

  const desired =
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0,
    );

  let instant =
    desired -
    timezoneOffsetMs(
      new Date(desired),
      timezone,
    );

  instant =
    desired -
    timezoneOffsetMs(
      new Date(instant),
      timezone,
    );

  return new Date(
    instant,
  ).toISOString();
}
