"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { CoupleData, Role } from "../../shared/types";
import { requestCoupleData } from "../../../lib/api/couple-client";
import {
  clearCoupleLoginSession,
  readSavedCoupleSession,
  saveCoupleSession,
} from "../../../lib/storage/couple-session";

export function useCoupleSession() {
  const [code, setCode] = useState("");
  const [role, setRole] = useState<Role>("first");
  const [boundRole, setBoundRole] = useState<Role | null>(null);
  const [hasChosenRole, setHasChosenRole] = useState(false);
  const [entered, setEntered] = useState(false);
  const [data, setData] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (sessionCode = code) => {
      const result = await requestCoupleData<CoupleData>(sessionCode);
      setData(result);
      return result;
    },
    [code],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const launchStartedAt = Date.now();
      const minimumLaunchDuration = 2000;
      const savedSession = readSavedCoupleSession();

      const restoredRole =
        savedSession.boundRole ?? savedSession.role;

      if (savedSession.code) {
        setCode(savedSession.code);
      }

      if (savedSession.boundRole) {
        setBoundRole(savedSession.boundRole);
      }

      if (restoredRole) {
        setRole(restoredRole);
        setHasChosenRole(true);
      }

      if (!savedSession.code || !restoredRole) {
        const elapsed = Date.now() - launchStartedAt;
        const remaining = Math.max(
          0,
          minimumLaunchDuration - elapsed,
        );

        await new Promise((resolve) => {
          window.setTimeout(resolve, remaining);
        });

        if (!cancelled) {
          setRestoringSession(false);
        }

        return;
      }

      try {
        const result = await requestCoupleData<CoupleData>(
          savedSession.code,
        );

        if (cancelled) return;

        setData(result);
        setEntered(true);
        setError("");
      } catch {
        if (cancelled) return;

        setEntered(false);
        setData(null);
        setError("登录状态已失效，请重新输入暗号");
      } finally {
        const elapsed = Date.now() - launchStartedAt;
        const remaining = Math.max(
          0,
          minimumLaunchDuration - elapsed,
        );

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
    if (!entered) return;

    const timer = window.setInterval(() => {
      loadData().catch(() => undefined);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [entered, loadData]);

  const chooseRole = (nextRole: Role) => {
    if (boundRole) return;

    setRole(nextRole);
    setHasChosenRole(true);
  };

  const enter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasChosenRole) {
      setError("请先确认你是哪颗星球");
      return;
    }

    const effectiveRole = boundRole ?? role;

    setLoading(true);
    setError("");

    try {
      const result = await requestCoupleData<CoupleData>(code);

      setData(result);
      setRole(effectiveRole);
      setBoundRole(effectiveRole);
      setHasChosenRole(true);
      saveCoupleSession(code, effectiveRole);
      setEntered(true);
    } catch (reason) {
      setEntered(false);
      setData(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "进入失败，请再试一次",
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearCoupleLoginSession();

    setCode("");
    setEntered(false);
    setData(null);
    setError("");

    if (boundRole) {
      setRole(boundRole);
      setHasChosenRole(true);
    }
  };

  return {
    code,
    setCode,
    role,
    boundRole,
    roleLocked: Boolean(boundRole),
    hasChosenRole,
    entered,
    data,
    loading,
    restoringSession,
    error,
    chooseRole,
    logout,
    enter,
  };
}
