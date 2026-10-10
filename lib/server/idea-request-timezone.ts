import {
  IDEA_CLIENT_TIMEZONE_HEADER,
  isValidIanaTimezone,
} from "../ideas/timezone";
import {
  normalizeRelationshipTimezone,
} from "./relationship-date";

export function resolveIdeaRequestTimezone(
  request: Request,
  relationshipTimezone:
    | string
    | null
    | undefined,
) {
  const requestedTimezone =
    request.headers
      .get(
        IDEA_CLIENT_TIMEZONE_HEADER,
      )
      ?.trim();

  if (
    requestedTimezone &&
    isValidIanaTimezone(
      requestedTimezone,
    )
  ) {
    return requestedTimezone;
  }

  return normalizeRelationshipTimezone(
    relationshipTimezone,
  );
}
