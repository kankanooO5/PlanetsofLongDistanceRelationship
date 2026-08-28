import {
  env,
  waitUntil,
} from "cloudflare:workers";

import {
  NextRequest,
} from "next/server";

import {
  authenticateMember,
} from "../../../../../../lib/server/member-auth";

import {
  analyzeAndStorePhotoComment,
} from "../../../../../../lib/server/photo-comment-insight-service";

import {
  buildPhotoCommentSourceVersion,
} from "../../../../../../lib/server/photo-comment-analysis";

export const runtime = "edge";

type CommentRow = {
  commentId: string;
  body: string;

  authorDisplayName: string;
  photoOwnerDisplayName: string;

  storedSourceVersion:
    | string
    | null;

  insightStatus:
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

  if (!database) {
    return Response.json(
      {
        error:
          "当前环境尚未连接关系数据库",
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

  const rows =
    await database
      .prepare(
        `SELECT
          pc.id AS commentId,
          pc.body AS body,

          author.display_name AS authorDisplayName,
          owner.display_name AS photoOwnerDisplayName,

          pci.source_version AS storedSourceVersion,
          pci.status AS insightStatus

        FROM photo_comments pc

        INNER JOIN relationship_members author
          ON author.id = pc.member_id

        INNER JOIN photos p
          ON p.id = pc.photo_id

        INNER JOIN relationship_members owner
          ON owner.id = p.uploaded_by_member_id

        LEFT JOIN photo_comment_insights pci
          ON pci.comment_id = pc.id

        WHERE pc.relationship_id = ?

        ORDER BY pc.created_at ASC

        LIMIT 50`,
      )
      .bind(
        member.relationshipId,
      )
      .all<CommentRow>();

  const stale:
    CommentRow[] = [];

  for (
    const row of
      rows.results
  ) {
    const currentSourceVersion =
      await buildPhotoCommentSourceVersion({
        commentId:
          row.commentId,

        body:
          row.body,

        authorDisplayName:
          row.authorDisplayName,

        photoOwnerDisplayName:
          row.photoOwnerDisplayName,
      });

    if (
      row.insightStatus !== "ready" ||
      row.storedSourceVersion !==
        currentSourceVersion
    ) {
      stale.push(row);
    }
  }

  const apiKey =
    (
      env as unknown as {
        DEEPSEEK_API_KEY?: string;
      }
    )
      .DEEPSEEK_API_KEY
      ?.trim() ?? "";

  if (stale.length) {
    waitUntil(
      Promise.allSettled(
        stale.map(
          (row) =>
            analyzeAndStorePhotoComment(
              database,
              apiKey,
              {
                commentId:
                  row.commentId,

                body:
                  row.body,

                authorDisplayName:
                  row.authorDisplayName,

                photoOwnerDisplayName:
                  row.photoOwnerDisplayName,
              },
            ),
        ),
      ),
    );
  }

  return Response.json({
    scanned:
      rows.results.length,

    queued:
      stale.length,

    upToDate:
      rows.results.length -
      stale.length,
  });
}
