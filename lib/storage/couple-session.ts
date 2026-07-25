import type { Role } from "../../features/shared/types";

export const COUPLE_SESSION_KEYS = {
  code: "two-planets-code",
  role: "two-planets-role",
} as const;

export function readSavedCoupleSession() {
  const code = window.localStorage.getItem(COUPLE_SESSION_KEYS.code) ?? "";
  const rawRole = window.localStorage.getItem(COUPLE_SESSION_KEYS.role);

  const role: Role | null =
    rawRole === "first" || rawRole === "second" ? rawRole : null;

  return {
    code,
    role,
  };
}

export function saveCoupleSession(code: string, role: Role) {
  window.localStorage.setItem(COUPLE_SESSION_KEYS.code, code.trim());
  window.localStorage.setItem(COUPLE_SESSION_KEYS.role, role);
}
