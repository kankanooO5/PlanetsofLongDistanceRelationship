import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { authenticateMember } from "../../../lib/server/member-auth";

export const runtime = "edge";

const MAX_ORIGINAL_SIZE = 50 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024;

const ALLOWED_ORIGINAL_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_THUMBNAIL_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type PhotoRow = {
  id: string;
  caption: string;
  takenAt: string;
  createdAt: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  sizeBytes: number;
  uploadedByMemberId: string;
  uploaderName: string;
  hasThumbnail: number;
};

function getDatabase() {
  return env.DB as D1Database | undefined;
}

function getPhotoBucket() {
  return env.PHOTOS as R2Bucket | undefined;
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "bin";
  }
}

function localDateString() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeTakenAt(
  value: FormDataEntryValue | null,
) {
  if (typeof value !== "string") {
    return localDateString();
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return localDateString();
  }

  return normalized;
}

function normalizeDimension(
  value: FormDataEntryValue | null,
) {
  if (typeof value !== "string") return null;

  const parsed = Number.parseInt(value, 10);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0 ||
    parsed > 30000
  ) {
    return null;
  }

  return parsed;
}

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status },
  );
}

export async function GET(request: NextRequest) {
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
      return jsonError("成员身份已经失效", 401);
    }

    const searchParams = new URL(
      request.url,
    ).searchParams;

    /*
     * 为了保证旧客户端暂时不受影响：
     *
     * /api/photos
     *   仍返回全部照片。
     *
     * /api/photos?limit=24
     *   才启用分页。
     */
    const paginationEnabled =
      searchParams.has("limit") ||
      searchParams.has("cursor");

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") ?? "24",
      10,
    );

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(
          Math.max(requestedLimit, 1),
          50,
        )
      : 24;

    type PhotoCursor = {
      takenAt: string;
      createdAt: string;
      id: string;
    };

    let cursor: PhotoCursor | null = null;

    const rawCursor =
      searchParams.get("cursor");

    if (rawCursor) {
      try {
        const parsed = JSON.parse(
          rawCursor,
        ) as Partial<PhotoCursor>;

        if (
          typeof parsed.takenAt !== "string" ||
          typeof parsed.createdAt !== "string" ||
          typeof parsed.id !== "string"
        ) {
          return jsonError(
            "分页游标格式无效",
            400,
          );
        }

        cursor = {
          takenAt: parsed.takenAt,
          createdAt: parsed.createdAt,
          id: parsed.id,
        };
      } catch {
        return jsonError(
          "分页游标格式无效",
          400,
        );
      }
    }

    const baseSelect = `
      SELECT
        photos.id,
        photos.caption,
        photos.taken_at AS takenAt,
        photos.created_at AS createdAt,
        photos.width,
        photos.height,
        photos.mime_type AS mimeType,
        photos.size_bytes AS sizeBytes,
        photos.uploaded_by_member_id AS uploadedByMemberId,
        relationship_members.display_name AS uploaderName,
        CASE
          WHEN photos.thumbnail_object_key IS NOT NULL
          THEN 1
          ELSE 0
        END AS hasThumbnail

      FROM photos

      INNER JOIN relationship_members
        ON relationship_members.id =
           photos.uploaded_by_member_id

      WHERE photos.relationship_id = ?
    `;

    let rows: PhotoRow[];

    if (!paginationEnabled) {
      const result = await database
        .prepare(
          `${baseSelect}
          ORDER BY
            photos.taken_at DESC,
            photos.created_at DESC,
            photos.id DESC`,
        )
        .bind(member.relationshipId)
        .all<PhotoRow>();

      rows = result.results;
    } else if (cursor) {
      const result = await database
        .prepare(
          `${baseSelect}

          AND (
            photos.taken_at < ?

            OR (
              photos.taken_at = ?
              AND photos.created_at < ?
            )

            OR (
              photos.taken_at = ?
              AND photos.created_at = ?
              AND photos.id < ?
            )
          )

          ORDER BY
            photos.taken_at DESC,
            photos.created_at DESC,
            photos.id DESC

          LIMIT ?`,
        )
        .bind(
          member.relationshipId,
          cursor.takenAt,
          cursor.takenAt,
          cursor.createdAt,
          cursor.takenAt,
          cursor.createdAt,
          cursor.id,
          limit + 1,
        )
        .all<PhotoRow>();

      rows = result.results;
    } else {
      const result = await database
        .prepare(
          `${baseSelect}

          ORDER BY
            photos.taken_at DESC,
            photos.created_at DESC,
            photos.id DESC

          LIMIT ?`,
        )
        .bind(
          member.relationshipId,
          limit + 1,
        )
        .all<PhotoRow>();

      rows = result.results;
    }

    const pageRows = paginationEnabled
      ? rows.slice(0, limit)
      : rows;

    const hasMore =
      paginationEnabled &&
      rows.length > limit;

    const lastPhoto =
      pageRows.at(-1);

    const nextCursor =
      hasMore && lastPhoto
        ? JSON.stringify({
            takenAt: lastPhoto.takenAt,
            createdAt: lastPhoto.createdAt,
            id: lastPhoto.id,
          })
        : null;

    return Response.json({
      photos: pageRows.map((photo) => ({
        id: photo.id,

        imageUrl:
          `/api/photos/${photo.id}?variant=original`,

        thumbnailUrl: undefined,

        caption: photo.caption,
        takenAt: photo.takenAt,
        createdAt: photo.createdAt,
        width: photo.width ?? undefined,
        height: photo.height ?? undefined,
        mimeType: photo.mimeType,
        sizeBytes: photo.sizeBytes,

        uploadedByMemberId:
          photo.uploadedByMemberId,

        uploaderName:
          photo.uploaderName,
      })),

      nextCursor,
    });
  } catch (reason) {
    console.error(
      "Load photos failed",
      reason,
    );

    return jsonError(
      "暂时无法读取相簿",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  const database = getDatabase();
  const photoBucket = getPhotoBucket();

  if (!database) {
    return jsonError(
      "当前环境尚未连接关系数据库",
      503,
    );
  }

  if (!photoBucket) {
    return jsonError(
      "当前环境尚未连接照片存储",
      503,
    );
  }

  let originalObjectKey = "";
  let thumbnailObjectKey = "";

  try {
    const member = await authenticateMember(
      request,
      database,
    );

    if (!member) {
      return jsonError("成员身份已经失效", 401);
    }

    const formData = await request.formData();

    const original = formData.get("original");
    const thumbnail = formData.get("thumbnail");

    if (!(original instanceof File)) {
      return jsonError("请选择需要上传的照片", 400);
    }

    if (!(thumbnail instanceof File)) {
      return jsonError("无法生成照片缩略图", 400);
    }

    if (!ALLOWED_ORIGINAL_TYPES.has(original.type)) {
      return jsonError(
        "原图仅支持 JPG、PNG、WebP 或 HEIC",
        415,
      );
    }

    if (!ALLOWED_THUMBNAIL_TYPES.has(thumbnail.type)) {
      return jsonError(
        "缩略图格式不受支持",
        415,
      );
    }

    if (
      original.size <= 0 ||
      original.size > MAX_ORIGINAL_SIZE
    ) {
      return jsonError(
        "原图大小需要控制在 20MB 以内",
        413,
      );
    }

    if (
      thumbnail.size <= 0 ||
      thumbnail.size > MAX_THUMBNAIL_SIZE
    ) {
      return jsonError(
        "缩略图大小异常，请重新选择照片",
        413,
      );
    }

    const captionValue = formData.get("caption");

    const caption =
      typeof captionValue === "string"
        ? captionValue.trim().slice(0, 200)
        : "";

    const takenAt = normalizeTakenAt(
      formData.get("takenAt"),
    );

    const width = normalizeDimension(
      formData.get("width"),
    );

    const height = normalizeDimension(
      formData.get("height"),
    );

    const photoId = crypto.randomUUID();
    const [year, month] = takenAt.split("-");

    const baseKey = [
      member.relationshipId,
      year,
      month,
      photoId,
    ].join("/");

    originalObjectKey =
      `${baseKey}/original.` +
      extensionForMimeType(original.type);

    thumbnailObjectKey =
      `${baseKey}/thumbnail.` +
      extensionForMimeType(thumbnail.type);

    await Promise.all([
      photoBucket.put(
        originalObjectKey,
        original.stream(),
        {
          httpMetadata: {
            contentType: original.type,
            cacheControl:
              "private, max-age=31536000, immutable",
          },
          customMetadata: {
            variant: "original",
            relationshipId: member.relationshipId,
            uploadedByMemberId: member.memberId,
            photoId,
          },
        },
      ),

      photoBucket.put(
        thumbnailObjectKey,
        thumbnail.stream(),
        {
          httpMetadata: {
            contentType: thumbnail.type,
            cacheControl:
              "private, max-age=31536000, immutable",
          },
          customMetadata: {
            variant: "thumbnail",
            relationshipId: member.relationshipId,
            uploadedByMemberId: member.memberId,
            photoId,
          },
        },
      ),
    ]);

    await database
      .prepare(
        `INSERT INTO photos (
          id,
          relationship_id,
          uploaded_by_member_id,
          object_key,
          thumbnail_object_key,
          mime_type,
          size_bytes,
          width,
          height,
          caption,
          taken_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        photoId,
        member.relationshipId,
        member.memberId,
        originalObjectKey,
        thumbnailObjectKey,
        original.type,
        original.size,
        width,
        height,
        caption,
        takenAt,
      )
      .run();

    return Response.json(
      {
        photo: {
          id: photoId,

          imageUrl:
            `/api/photos/${photoId}?variant=original`,

          thumbnailUrl:
            `/api/photos/${photoId}?variant=thumbnail`,

          caption,
          takenAt,
          createdAt: new Date().toISOString(),
          width: width ?? undefined,
          height: height ?? undefined,
          mimeType: original.type,
          sizeBytes: original.size,
          uploadedByMemberId: member.memberId,
          uploaderName: member.displayName,
        },
      },
      { status: 201 },
    );
  } catch (reason) {
    await Promise.allSettled([
      originalObjectKey
        ? photoBucket.delete(originalObjectKey)
        : Promise.resolve(),

      thumbnailObjectKey
        ? photoBucket.delete(thumbnailObjectKey)
        : Promise.resolve(),
    ]);

    console.error("Upload photo failed", reason);

    return jsonError(
      "照片上传失败，请稍后再试",
      500,
    );
  }
}
