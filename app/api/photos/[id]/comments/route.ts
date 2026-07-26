import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { authenticateMember } from "../../../../../lib/server/member-auth";

export const runtime = "edge";

type CommentRow = {
  id: string;
  photoId: string;
  memberId: string;
  body: string;
  createdAt: string;
  displayName: string;
};

function getDatabase() {
  return env.DB as D1Database | undefined;
}

function jsonError(
  error: string,
  status: number,
) {
  return Response.json(
    { error },
    { status },
  );
}

async function findAccessiblePhoto(
  database: D1Database,
  photoId: string,
  relationshipId: string,
) {
  return database
    .prepare(
      `SELECT id
       FROM photos
       WHERE id = ?
         AND relationship_id = ?
       LIMIT 1`,
    )
    .bind(
      photoId,
      relationshipId,
    )
    .first<{ id: string }>();
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

  if (!database) {
    return jsonError(
      "当前环境尚未连接关系数据库",
      503,
    );
  }

  try {
    const member = await authenticateMember(
      request,
      database,
    );

    if (!member) {
      return jsonError(
        "成员身份已经失效",
        401,
      );
    }

    const { id: photoId } =
      await context.params;

    const photo =
      await findAccessiblePhoto(
        database,
        photoId,
        member.relationshipId,
      );

    if (!photo) {
      return jsonError(
        "照片不存在",
        404,
      );
    }

    const result = await database
      .prepare(
        `SELECT
          photo_comments.id,
          photo_comments.photo_id AS photoId,
          photo_comments.member_id AS memberId,
          photo_comments.body,
          photo_comments.created_at AS createdAt,
          relationship_members.display_name AS displayName

        FROM photo_comments

        INNER JOIN relationship_members
          ON relationship_members.id =
             photo_comments.member_id

        WHERE photo_comments.photo_id = ?
          AND photo_comments.relationship_id = ?

        ORDER BY
          photo_comments.created_at ASC,
          photo_comments.rowid ASC`,
      )
      .bind(
        photoId,
        member.relationshipId,
      )
      .all<CommentRow>();

    return Response.json({
      comments: result.results,
    });
  } catch (reason) {
    console.error(
      "Load photo comments failed",
      reason,
    );

    return jsonError(
      "暂时无法读取留言",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const database = getDatabase();

  if (!database) {
    return jsonError(
      "当前环境尚未连接关系数据库",
      503,
    );
  }

  try {
    const member = await authenticateMember(
      request,
      database,
    );

    if (!member) {
      return jsonError(
        "成员身份已经失效",
        401,
      );
    }

    const { id: photoId } =
      await context.params;

    const photo =
      await findAccessiblePhoto(
        database,
        photoId,
        member.relationshipId,
      );

    if (!photo) {
      return jsonError(
        "照片不存在",
        404,
      );
    }

    const payload = (await request.json()) as {
      body?: unknown;
    };

    const body =
      typeof payload.body === "string"
        ? payload.body.trim()
        : "";

    if (!body) {
      return jsonError(
        "留言不能为空",
        400,
      );
    }

    if (body.length > 1000) {
      return jsonError(
        "单条留言最多 1000 个字符",
        400,
      );
    }

    const commentId =
      crypto.randomUUID();

    await database
      .prepare(
        `INSERT INTO photo_comments (
          id,
          photo_id,
          relationship_id,
          member_id,
          body
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        commentId,
        photoId,
        member.relationshipId,
        member.memberId,
        body,
      )
      .run();

    return Response.json(
      {
        comment: {
          id: commentId,
          photoId,
          memberId:
            member.memberId,
          displayName:
            member.displayName,
          body,
          createdAt:
            new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (reason) {
    console.error(
      "Create photo comment failed",
      reason,
    );

    return jsonError(
      "留言发送失败，请稍后再试",
      500,
    );
  }
}
