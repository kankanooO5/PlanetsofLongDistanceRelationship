import {
  analyzePhotoVisionQwen,
  PHOTO_VISION_PIPELINE_VERSION,
} from "./photo-vision-analysis";

export type PhotoVisionInsightInput = {
  photoId: string;
  objectKey: string;
  thumbnailObjectKey:
    | string
    | null;

  mimeType: string;

  caption:
    | string
    | null;
};

async function sha256(
  value: string,
) {
  const bytes =
    new TextEncoder().encode(
      value,
    );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes,
    );

  return Array.from(
    new Uint8Array(digest),
    (byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
  ).join("");
}

export async function buildPhotoVisionSourceVersion(
  input: PhotoVisionInsightInput,
) {
  return sha256(
    JSON.stringify({
      pipeline:
        PHOTO_VISION_PIPELINE_VERSION,

      photoId:
        input.photoId,

      objectKey:
        input.objectKey,

      caption:
        input.caption?.trim() ?? "",
    }),
  );
}

async function loadImage(
  bucket: R2Bucket,
  objectKey: string,
  fallbackMimeType: string,
) {
  const object =
    await bucket.get(
      objectKey,
    );

  if (!object) {
    throw new Error(
      "R2 中没有找到照片",
    );
  }

  return {
    bytes:
      await object.arrayBuffer(),

    mimeType:
      object
        .httpMetadata
        ?.contentType ??
      fallbackMimeType,
  };
}

export async function analyzeAndStorePhotoVision(
  database: D1Database,
  bucket: R2Bucket,
  ai: Ai,
  input: PhotoVisionInsightInput,
) {
  const sourceVersion =
    await buildPhotoVisionSourceVersion(
      input,
    );

  const existing =
    await database
      .prepare(
        `SELECT
          id,
          status,
          source_version AS sourceVersion
        FROM photo_ai_insights
        WHERE photo_id = ?
        LIMIT 1`,
      )
      .bind(
        input.photoId,
      )
      .first<{
        id: string;
        status: string;
        sourceVersion:
          | string
          | null;
      }>();

  if (
    existing?.status === "ready" &&
    existing.sourceVersion ===
      sourceVersion
  ) {
    return {
      status:
        "skipped" as const,

      sourceVersion,
    };
  }

  const insightId =
    existing?.id ??
    crypto.randomUUID();

  await database
    .prepare(
      `INSERT INTO photo_ai_insights (
        id,
        photo_id,
        status,
        source_version,
        updated_at
      ) VALUES (?, ?, 'pending', ?, CURRENT_TIMESTAMP)

      ON CONFLICT(photo_id)
      DO UPDATE SET
        status = 'pending',
        source_version = excluded.source_version,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      insightId,
      input.photoId,
      sourceVersion,
    )
    .run();

  try {
    let image =
      await loadImage(
        bucket,
        input.objectKey,
        input.mimeType,
      );

    let result;

    try {
      result =
        await analyzePhotoVisionQwen(
          ai,
          {
            bytes:
              image.bytes,

            mimeType:
              image.mimeType,

            caption:
              input.caption,
          },
        );
    } catch (originalError) {
      const canFallback =
        Boolean(
          input.thumbnailObjectKey,
        ) &&
        (
          input.mimeType ===
            "image/heic" ||
          input.mimeType ===
            "image/heif"
        );

      if (!canFallback) {
        throw originalError;
      }

      console.warn(
        "Original photo vision failed, retry thumbnail",
        input.photoId,
      );

      image =
        await loadImage(
          bucket,
          input.thumbnailObjectKey!,
          "image/jpeg",
        );

      result =
        await analyzePhotoVisionQwen(
          ai,
          {
            bytes:
              image.bytes,

            mimeType:
              image.mimeType,

            caption:
              input.caption,
          },
        );
    }

    await database
      .prepare(
        `UPDATE photo_ai_insights
         SET
           status = 'ready',
           caption = ?,
           scene = ?,
           activities_json = ?,
           objects_json = ?,
           semantic_tags_json = ?,
           visual_mood_json = ?,
           confidence_json = '{}',
           source_version = ?,
           model = ?,
           error_message = NULL,
           analyzed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE photo_id = ?`,
      )
      .bind(
        result.analysis.caption,
        result.analysis.scene,

        JSON.stringify(
          result.analysis.activities,
        ),

        JSON.stringify(
          result.analysis.objects,
        ),

        JSON.stringify(
          result.analysis.semanticTags,
        ),

        JSON.stringify(
          result.analysis.visualMood,
        ),

        sourceVersion,
        result.model,
        input.photoId,
      )
      .run();

    return {
      status:
        "ready" as const,

      sourceVersion,
    };
  } catch (reason) {
    console.error(
      "Analyze photo vision failed",
      input.photoId,
      reason,
    );

    const message =
      reason instanceof Error
        ? reason.message.slice(
            0,
            1000,
          )
        : "照片视觉分析失败";

    try {
      await database
        .prepare(
          `UPDATE photo_ai_insights
           SET
             status = 'failed',
             error_message = ?,
             updated_at = CURRENT_TIMESTAMP
           WHERE photo_id = ?`,
        )
        .bind(
          message,
          input.photoId,
        )
        .run();
    } catch (databaseError) {
      console.error(
        "Store photo vision failure failed",
        databaseError,
      );
    }

    return {
      status:
        "failed" as const,

      sourceVersion,
    };
  }
}
