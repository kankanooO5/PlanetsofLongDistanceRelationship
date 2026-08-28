import {
  env,
} from "cloudflare:workers";

import {
  NextRequest,
} from "next/server";

import {
  authenticateMember,
} from "../../../../../../lib/server/member-auth";

import {
  analyzePhotoVision,
  analyzePhotoVisionQwen,
} from "../../../../../../lib/server/photo-vision-analysis";

export const runtime = "edge";

type PhotoRow = {
  id: string;
  objectKey: string;
  mimeType: string;
  caption:
    | string
    | null;
};

export async function POST(
  request: NextRequest,
) {
  const database =
    env.DB as
      | D1Database
      | undefined;

  const bucket =
    env.PHOTOS as
      | R2Bucket
      | undefined;

  const ai =
    env.AI as
      | Ai
      | undefined;

  if (
    !database ||
    !bucket ||
    !ai
  ) {
    return Response.json(
      {
        error:
          "TEST 环境缺少 DB / PHOTOS / AI binding",
      },
      {
        status: 503,
      },
    );
  }

  const member =
    await authenticateMember(
      request,
      database,
    );

  if (!member) {
    return Response.json(
      {
        error:
          "成员身份已经失效",
      },
      {
        status: 401,
      },
    );
  }

  const payload =
    await request.json()
      .catch(
        () => ({}),
      ) as {
        photoId?: unknown;
      };

  const photoId =
    typeof payload.photoId ===
      "string"
      ? payload.photoId.trim()
      : "";

  const photo =
    photoId
      ? await database
          .prepare(
            `SELECT
              id,
              object_key AS objectKey,
              mime_type AS mimeType,
              caption
             FROM photos
             WHERE id = ?
               AND relationship_id = ?
             LIMIT 1`,
          )
          .bind(
            photoId,
            member.relationshipId,
          )
          .first<PhotoRow>()
      : await database
          .prepare(
            `SELECT
              id,
              object_key AS objectKey,
              mime_type AS mimeType,
              caption
             FROM photos
             WHERE relationship_id = ?
             ORDER BY
               created_at DESC,
               rowid DESC
             LIMIT 1`,
          )
          .bind(
            member.relationshipId,
          )
          .first<PhotoRow>();

  if (!photo) {
    return Response.json(
      {
        error:
          "没有找到可分析的照片",
      },
      {
        status: 404,
      },
    );
  }

  const object =
    await bucket.get(
      photo.objectKey,
    );

  if (!object) {
    return Response.json(
      {
        error:
          "R2 中没有找到原图",
      },
      {
        status: 404,
      },
    );
  }

  const bytes =
    await object.arrayBuffer();

  const mimeType =
    object
      .httpMetadata
      ?.contentType ??
    photo.mimeType;

  const [
    moondreamResult,
    qwenResult,
  ] =
    await Promise.allSettled([
      analyzePhotoVision(
        ai,
        {
          bytes,
          mimeType,

          caption:
            photo.caption,
        },
      ),

      analyzePhotoVisionQwen(
        ai,
        {
          bytes,
          mimeType,

          caption:
            photo.caption,
        },
      ),
    ]);

  const serialize =
    (
      result:
        PromiseSettledResult<
          unknown
        >,
    ) => {
      if (
        result.status ===
        "fulfilled"
      ) {
        return {
          ok: true,
          result:
            result.value,
        };
      }

      return {
        ok: false,

        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(
                result.reason,
              ),
      };
    };

  return Response.json({
    photoId:
      photo.id,

    bytes:
      bytes.byteLength,

    moondream:
      serialize(
        moondreamResult,
      ),

    qwen:
      serialize(
        qwenResult,
      ),
  });
}
