import type { Role } from "../../features/shared/types";

export const MEMBER_SESSION_KEYS = {
  token: "two-planets-member-token",
  memberId: "two-planets-member-id",
  relationshipId: "two-planets-relationship-id",
  role: "two-planets-member-role",
} as const;

type MemberSession = {
  token: string;
  memberId: string;
  relationshipId: string;
  role: Role;
};

export function saveMemberSession(session: MemberSession) {
  window.localStorage.setItem(MEMBER_SESSION_KEYS.token, session.token);
  window.localStorage.setItem(MEMBER_SESSION_KEYS.memberId, session.memberId);
  window.localStorage.setItem(
    MEMBER_SESSION_KEYS.relationshipId,
    session.relationshipId,
  );
  window.localStorage.setItem(MEMBER_SESSION_KEYS.role, session.role);
}

export function readMemberSession(): MemberSession | null {
  const token =
    window.localStorage.getItem(MEMBER_SESSION_KEYS.token) ?? "";
  const memberId =
    window.localStorage.getItem(MEMBER_SESSION_KEYS.memberId) ?? "";
  const relationshipId =
    window.localStorage.getItem(MEMBER_SESSION_KEYS.relationshipId) ?? "";
  const rawRole =
    window.localStorage.getItem(MEMBER_SESSION_KEYS.role);

  const role: Role | null =
    rawRole === "first" || rawRole === "second"
      ? rawRole
      : null;

  if (!token || !memberId || !relationshipId || !role) {
    return null;
  }

  return {
    token,
    memberId,
    relationshipId,
    role,
  };
}

export function clearMemberSession() {
  Object.values(MEMBER_SESSION_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });
}
