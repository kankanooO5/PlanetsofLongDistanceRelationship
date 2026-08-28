type PhotoMomentRow = {
  photoId: string;
  takenAt: string;

  memberId: string;
  role:
    | "first"
    | "second";
  displayName: string;

  userCaption:
    | string
    | null;

  aiCaption:
    | string
    | null;

  scene:
    | string
    | null;

  semanticTagsJson:
    | string
    | null;

  activitiesJson:
    | string
    | null;

  objectsJson:
    | string
    | null;
};

type CommentMomentRow = {
  commentId: string;
  photoId: string;
  createdAt: string;

  memberId: string;
  role:
    | "first"
    | "second";
  displayName: string;

  body: string;
};

export type AlbumPeriodSourceMoments = {
  photos: Array<{
    photoId: string;
    takenAt: string;

    uploader: {
      memberId: string;
      role:
        | "first"
        | "second";
      displayName: string;
    };

    userCaption:
      | string
      | null;

    aiCaption:
      | string
      | null;

    scene:
      | string
      | null;

    semanticTags:
      string[];

    activities:
      string[];

    objects:
      string[];
  }>;

  comments: Array<{
    commentId: string;
    photoId: string;
    createdAt: string;

    author: {
      memberId: string;
      role:
        | "first"
        | "second";
      displayName: string;
    };

    body: string;
  }>;
};

function parseStringArray(
  value:
    | string
    | null,
) {
  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item):
          item is string =>
            typeof item === "string",
      )
      .map(
        (item) =>
          item.trim(),
      )
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export async function getAlbumPeriodSourceMoments(
  database: D1Database,
  input: {
    relationshipId: string;

    startDate: string;
    endDateExclusive: string;

    startAt: string;
    endAtExclusive: string;
  },
): Promise<AlbumPeriodSourceMoments> {
  const [
    photos,
    comments,
  ] =
    await Promise.all([
      database
        .prepare(
          `
          SELECT
            p.id AS photoId,
            p.taken_at AS takenAt,

            rm.id AS memberId,
            rm.role AS role,
            rm.display_name AS displayName,

            p.caption AS userCaption,

            pai.caption AS aiCaption,
            pai.scene AS scene,
            pai.semantic_tags_json AS semanticTagsJson,
            pai.activities_json AS activitiesJson,
            pai.objects_json AS objectsJson

          FROM photos p

          INNER JOIN relationship_members rm
            ON rm.id =
               p.uploaded_by_member_id

          LEFT JOIN photo_ai_insights pai
            ON pai.photo_id = p.id
            AND pai.status = 'ready'

          WHERE
            p.relationship_id = ?
            AND p.taken_at >= ?
            AND p.taken_at < ?

          ORDER BY
            p.taken_at ASC,
            p.created_at ASC,
            p.rowid ASC

          LIMIT 100
          `,
        )
        .bind(
          input.relationshipId,
          input.startDate,
          input.endDateExclusive,
        )
        .all<PhotoMomentRow>(),

      database
        .prepare(
          `
          SELECT
            pc.id AS commentId,
            pc.photo_id AS photoId,
            pc.created_at AS createdAt,

            rm.id AS memberId,
            rm.role AS role,
            rm.display_name AS displayName,

            pc.body AS body

          FROM photo_comments pc

          INNER JOIN relationship_members rm
            ON rm.id =
               pc.member_id

          WHERE
            pc.relationship_id = ?
            AND pc.created_at >= ?
            AND pc.created_at < ?

          ORDER BY
            pc.created_at ASC,
            pc.rowid ASC

          LIMIT 200
          `,
        )
        .bind(
          input.relationshipId,
          input.startAt,
          input.endAtExclusive,
        )
        .all<CommentMomentRow>(),
    ]);

  return {
    photos:
      photos.results.map(
        (row) => ({
          photoId:
            row.photoId,

          takenAt:
            row.takenAt,

          uploader: {
            memberId:
              row.memberId,

            role:
              row.role,

            displayName:
              row.displayName,
          },

          userCaption:
            row.userCaption?.trim() ||
            null,

          aiCaption:
            row.aiCaption?.trim() ||
            null,

          scene:
            row.scene?.trim() ||
            null,

          semanticTags:
            parseStringArray(
              row.semanticTagsJson,
            ),

          activities:
            parseStringArray(
              row.activitiesJson,
            ),

          objects:
            parseStringArray(
              row.objectsJson,
            ),
        }),
      ),

    comments:
      comments.results.map(
        (row) => ({
          commentId:
            row.commentId,

          photoId:
            row.photoId,

          createdAt:
            row.createdAt,

          author: {
            memberId:
              row.memberId,

            role:
              row.role,

            displayName:
              row.displayName,
          },

          body:
            row.body,
        }),
      ),
  };
}
