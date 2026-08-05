export function parseLocalDate(value: string | number | Date) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (!value) {
    return null;
  }

  let normalized = value;

  /*
    D1 CURRENT_TIMESTAMP:
    2026-07-25 22:42:36

    SQLite 没有时区，
    默认认为是 UTC，补 Z。
  */
  if (
    normalized.includes(" ") &&
    !normalized.includes("T")
  ) {
    normalized =
      normalized.replace(" ", "T") + "Z";
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}


export function formatLocalDate(
  value: string | number | Date,
  withTime = false,
) {
  const date = parseLocalDate(value);

  if (!date) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(withTime
        ? {
            hour: "2-digit",
            minute: "2-digit",
          }
        : {}),
    },
  ).format(date);
}


export function formatLocalDateTime(
  value: string | number | Date,
) {
  const date = parseLocalDate(value);

  if (!date) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}


export function formatLocalTime(
  value: string | number | Date,
) {
  const date = parseLocalDate(value);

  if (!date) {
    return "刚刚";
  }

  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}
