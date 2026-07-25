"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { CoupleData, Role } from "../../shared/types";
import { requestCoupleData } from "../../../lib/api/couple-client";
import {
  readSavedCoupleSession,
  saveCoupleSession,
} from "../../../lib/storage/couple-session";

export function useCoupleSession() {
  const [code, setCode] = useState("");
  const [role, setRole] = useState<Role>("first");
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

  // 首次启动时尝试恢复已验证的本地会话。
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const savedSession = readSavedCoupleSession();

      if (savedSession.code) {
        setCode(savedSession.code);
      }

      if (savedSession.role) {
        setRole(savedSession.role);
        setHasChosenRole(true);
      }

      if (!savedSession.code || !savedSession.role) {
        if (!cancelled) setRestoringSession(false);
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
        if (!cancelled) setRestoringSession(false);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // 已进入后定时刷新服务端数据。
  useEffect(() => {
    if (!entered) return;

    const timer = window.setInterval(() => {
      loadData().catch(() => undefined);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [entered, loadData]);

  const enter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await requestCoupleData<CoupleData>(code);

      setData(result);
      saveCoupleSession(code, role);
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

  return {
    code,
    setCode,
    role,
    setRole,
    hasChosenRole,
    setHasChosenRole,
    entered,
    data,
    loading,
    restoringSession,
    error,
    enter,
  };
}
