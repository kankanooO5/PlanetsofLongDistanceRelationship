export const IDEA_CLIENT_TIMEZONE_HEADER =
  "x-client-timezone";

export function isValidIanaTimezone(
  value: string,
) {
  const timezone =
    value.trim();

  if (!timezone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
      },
    ).format(
      new Date(),
    );

    return true;
  } catch {
    return false;
  }
}
