"use client";

import { useCallback, useEffect, useState } from "react";

import type { CoupleData, Role } from "../../shared/types";
import { requestMemberSession } from "../../../lib/api/member-client";
import {
  clearMemberSession,
  readMemberSession,
} from "../../../lib/storage/member-session";

export function useCoupleSession() {
  const [role, setRole] = useState<Role>("first");
  const [entered, setEntered] = useState(false);
  const [data, setData] = useState<CoupleData | null>(null);
  const [memberToken, setMemberToken] = useState("");
  const [restoringSession, setRestoringSession] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (token = memberToken) => {
      if (!token) {
        throw new Error("当前设备尚未绑定星球");
      }

      const result = await requestMemberSession(token);

      setData({
        settings: result.settings,
      });
      setRole(result.member.role);

      return result;
    },
    [memberToken],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const launchStartedAt = Date.now();
      const minimumLaunchDuration = 2000;

      try {
        const savedSession = readMemberSession();

        if (!savedSession) {
          if (!cancelled) {
            setEntered(false);
            setData(null);
            setError("");
          }

          return;
        }

        const result = await requestMemberSession(savedSession.token);

        if (cancelled) return;

        setMemberToken(savedSession.token);
        setRole(result.member.role);
        setData({
          settings: result.settings,
        });
        setEntered(true);
        setError("");
      } catch (reason) {
        if (cancelled) return;

        const savedSession = readMemberSession();

        if (savedSession) {
          setMemberToken(savedSession.token);
          setRole(savedSession.role);
        }

        setEntered(false);
        setData(null);
        setError(
          reason instanceof Error
            ? `${reason.message}。本机身份仍已保留，请稍后重试或使用设备恢复。`
            : "暂时无法恢复成员身份。本机身份仍已保留，请稍后重试或使用设备恢复。",
        );
      } finally {
        const elapsed = Date.now() - launchStartedAt;
        const remaining = Math.max(0, minimumLaunchDuration - elapsed);

        await new Promise((resolve) => {
          window.setTimeout(resolve, remaining);
        });

        if (!cancelled) {
          setRestoringSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!entered || !memberToken) return;

    const timer = window.setInterval(() => {
      loadData(memberToken).catch(() => undefined);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [entered, memberToken, loadData]);

  const logout = () => {
    clearMemberSession();

    setMemberToken("");
    setEntered(false);
    setData(null);
    setError("");
  };

  return {
    role,
    entered,
    data,
    restoringSession,
    error,
    logout,
  };
}
