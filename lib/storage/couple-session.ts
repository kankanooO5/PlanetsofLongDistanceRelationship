import type { Role } from "../../features/shared/types";

export const COUPLE_SESSION_KEYS = {
  code: "two-planets-code",
  role: "two-planets-role",
  boundRole: "two-planets-bound-role",
} as const;

function parseRole(value: string | null): Role | null {
  return value === "first" || value === "second" ? value : null;
}

export function readSavedCoupleSession() {
  const code = window.localStorage.getItem(COUPLE_SESSION_KEYS.code) ?? "";
  const role = parseRole(
    window.localStorage.getItem(COUPLE_SESSION_KEYS.role),
  );
  const boundRole = parseRole(
    window.localStorage.getItem(COUPLE_SESSION_KEYS.boundRole),
  );

  return {
    code,
    role,
    boundRole,
  };
}

export function saveCoupleSession(code: string, role: Role) {
  window.localStorage.setItem(COUPLE_SESSION_KEYS.code, code.trim());
  window.localStorage.setItem(COUPLE_SESSION_KEYS.role, role);

  const existingBinding = parseRole(
    window.localStorage.getItem(COUPLE_SESSION_KEYS.boundRole),
  );

  if (!existingBinding) {
    window.localStorage.setItem(
      COUPLE_SESSION_KEYS.boundRole,
      role,
    );
  }
}

export function clearCoupleLoginSession() {
  window.localStorage.removeItem(COUPLE_SESSION_KEYS.code);
  window.localStorage.removeItem(COUPLE_SESSION_KEYS.role);

  // 不清除 boundRole，当前设备仍保持原身份绑定。
}
