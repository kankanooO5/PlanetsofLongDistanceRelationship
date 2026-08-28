export type AlbumPeriodBounds = {
  relationshipId: string;
  timezone: string;

  // 照片 taken_at 使用的自然日边界
  startDate: string;
  endDateExclusive: string;

  // comment.created_at 使用的时间边界
  startAt: string;
  endAtExclusive: string;
};

type CountRow = {
  total: number;
};

type MemberCountRow = {
  memberId: string;
  role: "first" | "second";
  displayName: string;
  total: number;
};

type PhotoStatsRow = {
  totalPhotos: number;
  activeDays: number;
  sharedDays: number;
  commentedPhotos: number;
};

type CommentStatsRow = {
  totalComments: number;
  partnerComments: number;
};

type ActivityRow = {
  localDate: string;
  photos: number;
  comments: number;
};

export type AlbumMemberStats = {
  memberId: string;
  role: "first" | "second";
  displayName: string;

  uploadedPhotos: number;
  commentsWritten: number;
};

export type AlbumPeriodStats = {
  relationshipId: string;
  startDate: string;
  endDateExclusive: string;

  photos: {
    total: number;
    activeDays: number;
    sharedDays: number;

    commentedPhotos: number;
    commentCoverageRate: number;
  };

  comments: {
    total: number;

    partnerComments: number;
    partnerCommentRate: number;

    averagePerPhoto: number;
  };

  members: AlbumMemberStats[];

  mostActiveDate: {
    date: string;
    photos: number;
    comments: number;
  } | null;
};

function ratio(
  numerator: number,
  denominator: number,
) {
  if (!denominator) {
    return 0;
  }

  return Number(
    (
      numerator /
      denominator
    ).toFixed(4),
  );
}

export async function getAlbumPeriodStats(
  database: D1Database,
  bounds: AlbumPeriodBounds,
): Promise<AlbumPeriodStats> {
  const {
    relationshipId,
    timezone,
    startDate,
    endDateExclusive,
    startAt,
    endAtExclusive,
  } = bounds;

  const photoStats =
    await database
      .prepare(
        `
        WITH period_photos AS (
          SELECT
            id,
            uploaded_by_member_id,
            date(taken_at) AS local_date
          FROM photos
          WHERE relationship_id = ?
            AND taken_at >= ?
            AND taken_at < ?
        ),

        daily_uploaders AS (
          SELECT
            local_date,
            COUNT(
              DISTINCT uploaded_by_member_id
            ) AS uploader_count
          FROM period_photos
          GROUP BY local_date
        ),

        commented AS (
          SELECT DISTINCT
            pc.photo_id
          FROM photo_comments pc
          INNER JOIN period_photos p
            ON p.id = pc.photo_id
          WHERE pc.created_at < ?
        )

        SELECT
          (
            SELECT COUNT(*)
            FROM period_photos
          ) AS totalPhotos,

          (
            SELECT COUNT(*)
            FROM daily_uploaders
          ) AS activeDays,

          (
            SELECT COUNT(*)
            FROM daily_uploaders
            WHERE uploader_count >= 2
          ) AS sharedDays,

          (
            SELECT COUNT(*)
            FROM commented
          ) AS commentedPhotos
        `,
      )
      .bind(
        relationshipId,
        startDate,
        endDateExclusive,
        endAtExclusive,
      )
      .first<PhotoStatsRow>();

  const commentStats =
    await database
      .prepare(
        `
        SELECT
          COUNT(*) AS totalComments,

          COALESCE(
            SUM(
              CASE
                WHEN
                  pc.member_id <>
                  p.uploaded_by_member_id
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS partnerComments

        FROM photo_comments pc

        INNER JOIN photos p
          ON p.id = pc.photo_id

        WHERE
          pc.relationship_id = ?
          AND pc.created_at >= ?
          AND pc.created_at < ?
        `,
      )
      .bind(
        relationshipId,
        startAt,
        endAtExclusive,
      )
      .first<CommentStatsRow>();

  const uploadCounts =
    await database
      .prepare(
        `
        SELECT
          rm.id AS memberId,
          rm.role AS role,
          rm.display_name AS displayName,
          COUNT(p.id) AS total

        FROM relationship_members rm

        LEFT JOIN photos p
          ON p.uploaded_by_member_id = rm.id
          AND p.relationship_id = rm.relationship_id
          AND p.taken_at >= ?
          AND p.taken_at < ?

        WHERE
          rm.relationship_id = ?

        GROUP BY
          rm.id,
          rm.role,
          rm.display_name

        ORDER BY rm.role ASC
        `,
      )
      .bind(
        startDate,
        endDateExclusive,
        relationshipId,
      )
      .all<MemberCountRow>();

  const commentCounts =
    await database
      .prepare(
        `
        SELECT
          rm.id AS memberId,
          rm.role AS role,
          rm.display_name AS displayName,
          COUNT(pc.id) AS total

        FROM relationship_members rm

        LEFT JOIN photo_comments pc
          ON pc.member_id = rm.id
          AND pc.relationship_id = rm.relationship_id
          AND pc.created_at >= ?
          AND pc.created_at < ?

        WHERE
          rm.relationship_id = ?

        GROUP BY
          rm.id,
          rm.role,
          rm.display_name

        ORDER BY rm.role ASC
        `,
      )
      .bind(
        startAt,
        endAtExclusive,
        relationshipId,
      )
      .all<MemberCountRow>();

  const photoActivity =
    await database
      .prepare(
        `
        SELECT
          date(taken_at) AS localDate,
          COUNT(*) AS photos
        FROM photos
        WHERE relationship_id = ?
          AND taken_at >= ?
          AND taken_at < ?
        GROUP BY date(taken_at)
        `,
      )
      .bind(
        relationshipId,
        startDate,
        endDateExclusive,
      )
      .all<{
        localDate: string;
        photos: number;
      }>();

  const commentActivity =
    await database
      .prepare(
        `
        SELECT
          strftime(
            '%Y-%m-%dT%H:%M:%SZ',
            created_at
          ) AS occurredAt
        FROM photo_comments
        WHERE relationship_id = ?
          AND created_at >= ?
          AND created_at < ?
        `,
      )
      .bind(
        relationshipId,
        startAt,
        endAtExclusive,
      )
      .all<{
        occurredAt: string;
      }>();

  const activityMap =
    new Map<
      string,
      {
        photos: number;
        comments: number;
      }
    >();

  for (
    const row of
      photoActivity.results
  ) {
    activityMap.set(
      row.localDate,
      {
        photos: row.photos,
        comments: 0,
      },
    );
  }

  const {
    dateKeyInTimezone,
  } = await import(
    "./relationship-date"
  );

  for (
    const row of
      commentActivity.results
  ) {
    const localDate =
      dateKeyInTimezone(
        new Date(
          row.occurredAt,
        ),
        timezone,
      );

    const existing =
      activityMap.get(
        localDate,
      ) ?? {
        photos: 0,
        comments: 0,
      };

    existing.comments += 1;

    activityMap.set(
      localDate,
      existing,
    );
  }

  const activity =
    [...activityMap.entries()]
      .map(
        ([
          localDate,
          value,
        ]) => ({
          localDate,
          ...value,
        }),
      )
      .sort(
        (a, b) =>
          (
            b.photos +
            b.comments
          ) -
            (
              a.photos +
              a.comments
            ) ||
          b.localDate.localeCompare(
            a.localDate,
          ),
      )[0] ?? null;

  const photos = photoStats ?? {
    totalPhotos: 0,
    activeDays: 0,
    sharedDays: 0,
    commentedPhotos: 0,
  };

  const comments = commentStats ?? {
    totalComments: 0,
    partnerComments: 0,
  };

  const commentCountMap =
    new Map(
      commentCounts.results.map(
        (row) => [
          row.memberId,
          row.total,
        ],
      ),
    );

  const members =
    uploadCounts.results.map(
      (row) => ({
        memberId:
          row.memberId,

        role:
          row.role,

        displayName:
          row.displayName,

        uploadedPhotos:
          row.total,

        commentsWritten:
          commentCountMap.get(
            row.memberId,
          ) ?? 0,
      }),
    );

  return {
    relationshipId,
    startDate,
    endDateExclusive,

    photos: {
      total:
        photos.totalPhotos,

      activeDays:
        photos.activeDays,

      sharedDays:
        photos.sharedDays,

      commentedPhotos:
        photos.commentedPhotos,

      commentCoverageRate:
        ratio(
          photos.commentedPhotos,
          photos.totalPhotos,
        ),
    },

    comments: {
      total:
        comments.totalComments,

      partnerComments:
        comments.partnerComments,

      partnerCommentRate:
        ratio(
          comments.partnerComments,
          comments.totalComments,
        ),

      averagePerPhoto:
        photos.totalPhotos
          ? Number(
              (
                comments.totalComments /
                photos.totalPhotos
              ).toFixed(2),
            )
          : 0,
    },

    members,

    mostActiveDate:
      activity
        ? {
            date:
              activity.localDate,

            photos:
              activity.photos,

            comments:
              activity.comments,
          }
        : null,
  };
}
