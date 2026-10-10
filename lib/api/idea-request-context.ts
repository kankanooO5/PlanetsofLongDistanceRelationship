import {
  deviceTimezone,
} from "../date/device-local-date";
import {
  IDEA_CLIENT_TIMEZONE_HEADER,
} from "../ideas/timezone";

export function ideaRequestHeaders(
  memberToken: string,
  extraHeaders: Record<
    string,
    string
  > = {},
) {
  const headers: Record<
    string,
    string
  > = {
    ...extraHeaders,
    "x-member-token":
      memberToken,
  };

  const timezone =
    deviceTimezone();

  if (timezone) {
    headers[
      IDEA_CLIENT_TIMEZONE_HEADER
    ] = timezone;
  }

  return headers;
}
