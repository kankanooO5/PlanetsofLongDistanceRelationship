import {
  env,
} from "cloudflare:workers";

import {
  NextRequest,
} from "next/server";

import {
  authenticateMember,
} from "../../../../../../lib/server/member-auth";

import type {
  PhotoVisionJob,
} from "../../../../../../lib/server/ai-jobs";

export const runtime = "edge";

type PhotoRow = {
  id: string;
};

export async function POST(
  request: NextRequest,
) {
  const database =
    env.DB as
      | D1Database
      | undefined;

  const queue =
    (
      env as unknown as {
        AI_JOBS?:
          Queue<
            PhotoVisionJob
          >;
      }
    ).AI_JOBS;

  if (
    !database ||
    !queue
  ) {
    return Response.json(
      {
        error:
          "当前环境缺少 DB / AI_JOBS binding",
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

  const photos =
    await database
      .prepare(
        `SELECT id
         FROM photos
         WHERE relationship_id = ?
         ORDER BY
           created_at ASC,
           rowid ASC
         LIMIT 100`,
      )
      .bind(
        member.relationshipId,
      )
      .all<PhotoRow>();

  const results =
    await Promise.allSettled(
      photos.results.map(
        (photo) =>
          queue.send({
            type:
              "photo_vision",

            photoId:
              photo.id,
          }),
      ),
    );

  const queued =
    results.filter(
      (result) =>
        result.status ===
        "fulfilled",
    ).length;

  const failed =
    results.length -
    queued;

  return Response.json({
    scanned:
      photos.results.length,

    queued,
    failed,
  });
}
