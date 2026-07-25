import type { CoupleData, Role } from "../../features/shared/types";

export type MemberSessionData = CoupleData & {
  member: {
    id: string;
    role: Role;
    displayName: string;
  };
  partner: {
    id: string | null;
    displayName: string;
  };
  relationship: {
    id: string;
  };
};

export async function requestMemberSession(
  memberToken: string,
): Promise<MemberSessionData> {
  const response = await fetch("/api/member/session", {
    method: "GET",
    headers: {
      "x-member-token": memberToken,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as
    | MemberSessionData
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "成员身份验证失败",
    );
  }

  return payload as MemberSessionData;
}
