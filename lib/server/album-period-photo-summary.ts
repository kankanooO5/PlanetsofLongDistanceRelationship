type PhotoInsightRow = {
  memberId: string;
  role:
    | "first"
    | "second";
  displayName: string;

  status:
    | "pending"
    | "ready"
    | "failed"
    | null;

  scene:
    | string
    | null;

  activitiesJson:
    | string
    | null;

  objectsJson:
    | string
    | null;

  semanticTagsJson:
    | string
    | null;

  visualMoodJson:
    | string
    | null;
};

type CountItem = {
  text: string;
  count: number;
};

type MemberPhotoSummary = {
  memberId: string;
  role:
    | "first"
    | "second";
  displayName: string;

  totalPhotos: number;
  analyzedPhotos: number;

  scenes: CountItem[];
  activities: CountItem[];
  semanticTags: CountItem[];
  visualTones: CountItem[];
};

export type AlbumPeriodPhotoSummary = {
  analysis: {
    totalPhotos: number;
    ready: number;
    pending: number;
    failed: number;
    missing: number;
    coverageRate: number;
  };

  scenes: CountItem[];
  activities: CountItem[];
  objects: CountItem[];
  semanticTags: CountItem[];

  visualMood: {
    tones: CountItem[];
    atmospheres: string[];
  };

  members:
    MemberPhotoSummary[];
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

function parseArray(
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

    return Array.isArray(
      parsed,
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function parseObject(
  value:
    | string
    | null,
) {
  if (!value) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(value);

    return (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    )
      ? parsed as
          Record<
            string,
            unknown
          >
      : {};
  } catch {
    return {};
  }
}

function addCount(
  map:
    Map<string, number>,
  value: unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return;
  }

  const text =
    value.trim();

  if (!text) {
    return;
  }

  map.set(
    text,
    (
      map.get(text) ??
      0
    ) + 1,
  );
}

function topCounts(
  map:
    Map<string, number>,
  limit: number,
): CountItem[] {
  return [
    ...map.entries(),
  ]
    .map(
      ([text, count]) => ({
        text,
        count,
      }),
    )
    .sort(
      (a, b) =>
        b.count -
          a.count ||
        a.text.localeCompare(
          b.text,
        ),
    )
    .slice(
      0,
      limit,
    );
}

export async function getAlbumPeriodPhotoSummary(
  database: D1Database,
  input: {
    relationshipId: string;
    startDate: string;
    endDateExclusive: string;
  },
): Promise<AlbumPeriodPhotoSummary> {
  const rows =
    await database
      .prepare(
        `
        SELECT
          p.uploaded_by_member_id AS memberId,
          rm.role AS role,
          rm.display_name AS displayName,

          pai.status AS status,
          pai.scene AS scene,
          pai.activities_json AS activitiesJson,
          pai.objects_json AS objectsJson,
          pai.semantic_tags_json AS semanticTagsJson,
          pai.visual_mood_json AS visualMoodJson

        FROM photos p

        INNER JOIN relationship_members rm
          ON rm.id =
             p.uploaded_by_member_id

        LEFT JOIN photo_ai_insights pai
          ON pai.photo_id =
             p.id

        WHERE
          p.relationship_id = ?
          AND p.taken_at >= ?
          AND p.taken_at < ?

        ORDER BY
          p.taken_at ASC,
          p.created_at ASC
        `,
      )
      .bind(
        input.relationshipId,
        input.startDate,
        input.endDateExclusive,
      )
      .all<PhotoInsightRow>();

  const scenes =
    new Map<
      string,
      number
    >();

  const activities =
    new Map<
      string,
      number
    >();

  const objects =
    new Map<
      string,
      number
    >();

  const semanticTags =
    new Map<
      string,
      number
    >();

  const tones =
    new Map<
      string,
      number
    >();

  const atmospheres:
    string[] = [];

  const statusCounts = {
    ready: 0,
    pending: 0,
    failed: 0,
    missing: 0,
  };

  type MemberAccumulator = {
    memberId: string;
    role:
      | "first"
      | "second";
    displayName: string;

    totalPhotos: number;
    analyzedPhotos: number;

    scenes:
      Map<
        string,
        number
      >;

    activities:
      Map<
        string,
        number
      >;

    semanticTags:
      Map<
        string,
        number
      >;

    tones:
      Map<
        string,
        number
      >;
  };

  const memberMap =
    new Map<
      string,
      MemberAccumulator
    >();

  for (
    const row of
      rows.results
  ) {
    const member =
      memberMap.get(
        row.memberId,
      ) ?? {
        memberId:
          row.memberId,

        role:
          row.role,

        displayName:
          row.displayName,

        totalPhotos: 0,
        analyzedPhotos: 0,

        scenes:
          new Map(),

        activities:
          new Map(),

        semanticTags:
          new Map(),

        tones:
          new Map(),
      };

    member.totalPhotos += 1;

    memberMap.set(
      row.memberId,
      member,
    );

    if (!row.status) {
      statusCounts.missing += 1;
      continue;
    }

    if (
      row.status ===
      "pending"
    ) {
      statusCounts.pending += 1;
      continue;
    }

    if (
      row.status ===
      "failed"
    ) {
      statusCounts.failed += 1;
      continue;
    }

    statusCounts.ready += 1;
    member.analyzedPhotos += 1;

    addCount(
      scenes,
      row.scene,
    );

    addCount(
      member.scenes,
      row.scene,
    );

    for (
      const activity of
        parseArray(
          row.activitiesJson,
        )
    ) {
      addCount(
        activities,
        activity,
      );

      addCount(
        member.activities,
        activity,
      );
    }

    for (
      const object of
        parseArray(
          row.objectsJson,
        )
    ) {
      addCount(
        objects,
        object,
      );
    }

    for (
      const tag of
        parseArray(
          row.semanticTagsJson,
        )
    ) {
      addCount(
        semanticTags,
        tag,
      );

      addCount(
        member.semanticTags,
        tag,
      );
    }

    const mood =
      parseObject(
        row.visualMoodJson,
      );

    if (
      Array.isArray(
        mood.tones,
      )
    ) {
      for (
        const tone of
          mood.tones
      ) {
        addCount(
          tones,
          tone,
        );

        addCount(
          member.tones,
          tone,
        );
      }
    }

    if (
      typeof mood.atmosphere ===
        "string"
    ) {
      const atmosphere =
        mood.atmosphere.trim();

      if (atmosphere) {
        atmospheres.push(
          atmosphere,
        );
      }
    }
  }

  const totalPhotos =
    rows.results.length;

  return {
    analysis: {
      totalPhotos,

      ready:
        statusCounts.ready,

      pending:
        statusCounts.pending,

      failed:
        statusCounts.failed,

      missing:
        statusCounts.missing,

      coverageRate:
        ratio(
          statusCounts.ready,
          totalPhotos,
        ),
    },

    scenes:
      topCounts(
        scenes,
        12,
      ),

    activities:
      topCounts(
        activities,
        15,
      ),

    objects:
      topCounts(
        objects,
        20,
      ),

    semanticTags:
      topCounts(
        semanticTags,
        20,
      ),

    visualMood: {
      tones:
        topCounts(
          tones,
          15,
        ),

      atmospheres:
        atmospheres.slice(
          0,
          20,
        ),
    },

    members: [
      ...memberMap.values(),
    ]
      .map(
        (member) => ({
          memberId:
            member.memberId,

          role:
            member.role,

          displayName:
            member.displayName,

          totalPhotos:
            member.totalPhotos,

          analyzedPhotos:
            member.analyzedPhotos,

          scenes:
            topCounts(
              member.scenes,
              8,
            ),

          activities:
            topCounts(
              member.activities,
              10,
            ),

          semanticTags:
            topCounts(
              member.semanticTags,
              12,
            ),

          visualTones:
            topCounts(
              member.tones,
              10,
            ),
        }),
      )
      .sort(
        (a, b) =>
          a.role.localeCompare(
            b.role,
          ),
      ),
  };
}
