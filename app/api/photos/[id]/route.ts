import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { authenticateMember } from "../../../../lib/server/member-auth";

export const runtime = "edge";

type PhotoObjectRow = {
  originalObjectKey: string;
  thumbnailObjectKey: string | null;
  mimeType: string;
};

function getDatabase() {
  return env.DB as D1Database | undefined;
}

function getPhotoBucket() {
  return env.PHOTOS as R2Bucket | undefined;
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const database = getDatabase();
  const photoBucket = getPhotoBucket();

  if (!database || !photoBucket) {
    return new Response(
      "Photo storage unavailable",
      { status: 503 },
    );
  }

  try {
    const member = await authenticateMember(
      request,
      database,
    );

    if (!member) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const { id } = await context.params;

    if (!id || id.length > 100) {
      return new Response("Invalid photo id", {
        status: 400,
      });
    }

    const requestedVariant =
      request.nextUrl.searchParams.get("variant");

    const variant =
      requestedVariant === "thumbnail"
        ? "thumbnail"
        : "original";

    const row = await database
      .prepare(
        `SELECT
          object_key AS originalObjectKey,
          thumbnail_object_key AS thumbnailObjectKey,
          mime_type AS mimeType

        FROM photos

        WHERE id = ?
          AND relationship_id = ?

        LIMIT 1`,
      )
      .bind(id, member.relationshipId)
      .first<PhotoObjectRow>();

    if (!row) {
      return new Response("Photo not found", {
        status: 404,
      });
    }

    const objectKey =
      variant === "thumbnail" &&
      row.thumbnailObjectKey
        ? row.thumbnailObjectKey
        : row.originalObjectKey;

    const object = await photoBucket.get(objectKey);

    if (!object) {
      return new Response(
        "Photo file not found",
        { status: 404 },
      );
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType ??
        row.mimeType,
    );

    headers.set(
      "Cache-Control",
      variant === "thumbnail"
        ? "private, max-age=86400"
        : "private, max-age=3600",
    );

    headers.set("ETag", object.httpEtag);
    headers.set(
      "Content-Disposition",
      "inline",
    );

    return new Response(object.body, {
      headers,
    });
  } catch (reason) {
    console.error("Load photo file failed", reason);

    return new Response(
      "Unable to load photo",
      { status: 500 },
    );
  }
}
