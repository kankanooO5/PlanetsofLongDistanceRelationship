export type IdeaCalendarDay = {
  localDate: string;
  dailyQuestionId: string;
  selfAnswered: boolean;
  partnerAnswered: boolean;
  bothAnswered: boolean;
};

export type IdeaCalendarMonth = {
  timezone: string;
  month: string;
  currentDate: string;
  days: IdeaCalendarDay[];
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

export async function fetchIdeaCalendar(
  memberToken: string,
  month?: string,
) {
  const search =
    month
      ? `?month=${encodeURIComponent(month)}`
      : "";

  const response = await fetch(
    `/api/ideas/calendar${search}`,
    {
      headers: {
        "x-member-token": memberToken,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readError(response),
    );
  }

  return response.json() as Promise<IdeaCalendarMonth>;
}
