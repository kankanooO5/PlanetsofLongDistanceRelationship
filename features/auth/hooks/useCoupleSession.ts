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
  const [error, setError] = useState("");

  const request = useCallback(
    (body?: Record<string, unknown>) =>
      requestCoupleData<CoupleData>(code, body),
    [code],
  );

  const loadData = useCallback(async () => {
    const result = await request();
    setData(result);
  }, [request]);

  useEffect(() => {
    const savedSession = readSavedCoupleSession();

    if (savedSession.code) setCode(savedSession.code);

    if (savedSession.role) {
      setRole(savedSession.role);
      setHasChosenRole(true);
    }
  }, []);

  useEffect(() => {
    if (!entered) return;

    const timer = window.setInterval(
      () => loadData().catch(() => undefined),
      30000,
    );

    return () => window.clearInterval(timer);
  }, [entered, loadData]);

  const enter = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await request();

      setData(result);
      saveCoupleSession(code, role);
      setEntered(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "进入失败");
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
    error,
    enter,
  };
}
