import type { IdeaAnswer } from "./idea-client";

export type IdeaHistoryDay = {
  timezone: string;
  currentDate: string;
  localDate: string;
  exists: boolean;

  dailyQuestion?: {
    id: string;
    question: {
      id: string;
      text: string;
      category: string;
      form: string;
      intimacyLevel: number;
    };
  };

  myAnswer?: IdeaAnswer | null;

  partner?: {
    memberId: string;
    displayName: string;
    answered: boolean;
    answer: IdeaAnswer | null;
  } | null;

  canRevealPartner?: boolean;
  bothAnswered?: boolean;
};

type ErrorPayload = {
  error?: string;
};

async function readError(response: Response) {
  try {
    const payload =
      (await response.json()) as ErrorPayload;

    return payload.error ?? "请求失败，请稍后再试";
  } catch {
    return "请求失败，请稍后再试";
  }
}

export async function fetchIdeaHistoryDay(
  memberToken: string,
  date: string,
) {
  const response = await fetch(
    `/api/ideas/${encodeURIComponent(date)}`,
    {
      headers: {
        "x-member-token": memberToken,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<IdeaHistoryDay>;
}
