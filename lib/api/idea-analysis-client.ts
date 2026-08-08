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
) {
  if (!date) {
    return "/api/ideas/analysis";
  }

  return (
    "/api/ideas/analysis?date=" +
    encodeURIComponent(date)
  );
}

export async function fetchIdeaAnalysis(
  memberToken: string,
  date?: string,
) {
  const response = await fetch(
    analysisUrl(date),
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
) {
  const response = await fetch(
    analysisUrl(date),
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
