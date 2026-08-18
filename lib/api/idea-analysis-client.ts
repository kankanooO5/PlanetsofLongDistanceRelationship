export type IdeaAnalysisContent = {
  commonGround: string;
  differentViews: string;
  hiddenFocus: string;
  mutualUnderstanding: string;
  conversationPrompt: string;
  generatedAt?: string | null;
  model?: string | null;
};

export type IdeaAnalysisState = {
  available: boolean;

  status:
    | "waiting"
    | "idle"
    | "pending"
    | "ready"
    | "failed"
    | "stale";

  cached?: boolean;
  stale?: boolean;
  updateAvailable?: boolean;
  reason?: string;
  message?: string;

  analysis?: IdeaAnalysisContent;
};

type ErrorPayload = {
  error?: string;
};

async function readError(
  response: Response,
) {
  try {
    const payload =
      (await response.json()) as ErrorPayload;

    return (
      payload.error ??
      "请求失败，请稍后再试"
    );
  } catch {
    return "请求失败，请稍后再试";
  }
}

function analysisUrl(
  date?: string,
  options?: {
    historical?: boolean;
    force?: boolean;
    mode?: "insights";
  },
) {
  const params =
    new URLSearchParams();

  if (date) {
    params.set(
      "date",
      date,
    );
  }

  if (options?.historical) {
    params.set(
      "historical",
      "1",
    );
  }

  if (options?.force) {
    params.set(
      "force",
      "1",
    );
  }

  if (options?.mode) {
    params.set(
      "mode",
      options.mode,
    );
  }

  const query =
    params.toString();

  return query
    ? `/api/ideas/analysis?${query}`
    : "/api/ideas/analysis";
}

export async function fetchIdeaAnalysis(
  memberToken: string,
  date?: string,
  historical = false,
) {
  const response = await fetch(
    analysisUrl(
      date,
      {
        historical,
      },
    ),
    {
      headers: {
        "x-member-token":
          memberToken,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  return response.json() as Promise<IdeaAnalysisState>;
}

export async function generateIdeaAnalysis(
  memberToken: string,
  date?: string,
  options?: {
    historical?: boolean;
    force?: boolean;
  },
) {
  const response = await fetch(
    analysisUrl(
      date,
      options,
    ),
    {
      method: "POST",
      headers: {
        "x-member-token":
          memberToken,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  return response.json() as Promise<IdeaAnalysisState>;
}


export async function generateIdeaInsights(
  memberToken: string,
  date?: string,
) {
  const response =
    await fetch(
      analysisUrl(
        date,
        {
          mode: "insights",
        },
      ),
      {
        method: "POST",
        headers: {
          "x-member-token":
            memberToken,
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  return response.json() as Promise<{
    ok: boolean;
    mode: "insights";
  }>;
}
