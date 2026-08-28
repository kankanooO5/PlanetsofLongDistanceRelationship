import {
  analyzePhotoComment,
  buildPhotoCommentSourceVersion,
} from "./photo-comment-analysis";

export type PhotoCommentInsightInput = {
  commentId: string;
  body: string;
  authorDisplayName: string;
  photoOwnerDisplayName: string;
};

export async function analyzeAndStorePhotoComment(
  database: D1Database,
  apiKey: string,
  input: PhotoCommentInsightInput,
) {
  const sourceVersion =
    await buildPhotoCommentSourceVersion({
      commentId:
        input.commentId,

      body:
        input.body,

      authorDisplayName:
        input.authorDisplayName,

      photoOwnerDisplayName:
        input.photoOwnerDisplayName,
    });

  const existing =
    await database
      .prepare(
        `SELECT
          id,
          status,
          source_version AS sourceVersion
        FROM photo_comment_insights
        WHERE comment_id = ?
        LIMIT 1`,
      )
      .bind(
        input.commentId,
      )
      .first<{
        id: string;
        status: string;
        sourceVersion: string | null;
      }>();

  if (
    existing?.status === "ready" &&
    existing.sourceVersion ===
      sourceVersion
  ) {
    return {
      status: "skipped" as const,
      sourceVersion,
    };
  }

  const insightId =
    existing?.id ??
    crypto.randomUUID();

  await database
    .prepare(
      `INSERT INTO photo_comment_insights (
        id,
        comment_id,
        status,
        source_version,
        updated_at
      ) VALUES (?, ?, 'pending', ?, CURRENT_TIMESTAMP)

      ON CONFLICT(comment_id)
      DO UPDATE SET
        status = 'pending',
        source_version = excluded.source_version,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      insightId,
      input.commentId,
      sourceVersion,
    )
    .run();

  if (!apiKey.trim()) {
    await database
      .prepare(
        `UPDATE photo_comment_insights
         SET
           status = 'failed',
           error_message = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE comment_id = ?`,
      )
      .bind(
        "DEEPSEEK_API_KEY 未配置",
        input.commentId,
      )
      .run();

    return {
      status: "failed" as const,
      sourceVersion,
    };
  }

  try {
    const result =
      await analyzePhotoComment(
        apiKey,
        {
          commentId:
            input.commentId,

          body:
            input.body,

          authorDisplayName:
            input.authorDisplayName,

          photoOwnerDisplayName:
            input.photoOwnerDisplayName,
        },
      );

    await database
      .prepare(
        `UPDATE photo_comment_insights
         SET
           status = 'ready',
           keywords_json = ?,
           themes_json = ?,
           interaction_signals_json = ?,
           sentiment_json = ?,
           source_version = ?,
           model = ?,
           error_message = NULL,
           analyzed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE comment_id = ?`,
      )
      .bind(
        JSON.stringify(
          result.analysis.keywords,
        ),
        JSON.stringify(
          result.analysis.themes,
        ),
        JSON.stringify(
          result.analysis
            .interactionSignals,
        ),
        JSON.stringify(
          result.analysis.sentiment,
        ),
        result.sourceVersion,
        result.model,
        input.commentId,
      )
      .run();

    return {
      status: "ready" as const,
      sourceVersion:
        result.sourceVersion,
    };
  } catch (reason) {
    console.error(
      "Analyze photo comment failed",
      reason,
    );

    const message =
      reason instanceof Error
        ? reason.message.slice(0, 1000)
        : "留言分析失败";

    try {
      await database
        .prepare(
          `UPDATE photo_comment_insights
           SET
             status = 'failed',
             error_message = ?,
             updated_at = CURRENT_TIMESTAMP
           WHERE comment_id = ?`,
        )
        .bind(
          message,
          input.commentId,
        )
        .run();
    } catch (databaseError) {
      console.error(
        "Store photo comment analysis failure failed",
        databaseError,
      );
    }

    return {
      status: "failed" as const,
      sourceVersion,
    };
  }
}
