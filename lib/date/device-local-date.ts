export function deviceTimezone() {
  try {
    const timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone
        ?.trim();

    return timezone || null;
  } catch {
    return null;
  }
}

export function deviceLocalDateKey(
  value = new Date(),
) {
  const timezone =
    deviceTimezone();

  if (timezone) {
    try {
      const parts =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          },
        ).formatToParts(value);

      const year =
        parts.find(
          (part) =>
            part.type === "year",
        )?.value;

      const month =
        parts.find(
          (part) =>
            part.type === "month",
        )?.value;

      const day =
        parts.find(
          (part) =>
            part.type === "day",
        )?.value;

      if (
        year &&
        month &&
        day
      ) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fall through to native local date.
    }
  }

  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      value.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}
