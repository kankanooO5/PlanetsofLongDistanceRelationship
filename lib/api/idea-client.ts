import { ideaRequestHeaders } from "./idea-request-context";
export type TodayIdea = {
  timezone: string;
  dailyQuestion: {
    id: string;
    localDate: string;
    question: {
      id: string;
      text: string;
      category: string;
      form: string;
      intimacyLevel: number;
    };
  };
};

export type IdeaAnswer = {
  id: string;
  body: string;
  submittedAt: string;
  updatedAt: string;
};

export type TodayIdeaExchange = {
  localDate: string;

  myAnswer: IdeaAnswer | null;

  partner: {
    memberId: string;
    displayName: string;
    answered: boolean;
    answer: IdeaAnswer | null;
  } | null;

  canRevealPartner?: boolean;
  bothAnswered: boolean;
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

export async function fetchTodayIdea(
  memberToken: string,
) {
  const response = await fetch(
    "/api/ideas/today",
    {
      headers:
        ideaRequestHeaders(
          memberToken,
        ),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  return response.json() as Promise<TodayIdea>;
}

export async function fetchMyTodayIdeaAnswer(
  memberToken: string,
) {
  const response = await fetch(
    "/api/ideas/today/answer",
    {
      headers:
        ideaRequestHeaders(
          memberToken,
        ),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  const payload =
    (await response.json()) as {
      answer: IdeaAnswer | null;
    };

  return payload.answer;
}

export async function saveMyTodayIdeaAnswer(
  memberToken: string,
  body: string,
) {
  const response = await fetch(
    "/api/ideas/today/answer",
    {
      method: "POST",
      headers:
        ideaRequestHeaders(
          memberToken,
          {
            "content-type":
              "application/json",
          },
        ),
      body: JSON.stringify({
        body,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  const payload =
    (await response.json()) as {
      answer: IdeaAnswer;
    };

  return payload.answer;
}

export async function fetchTodayIdeaExchange(
  memberToken: string,
) {
  const response = await fetch(
    "/api/ideas/today/exchange",
    {
      headers:
        ideaRequestHeaders(
          memberToken,
        ),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  return response.json() as Promise<TodayIdeaExchange>;
}
