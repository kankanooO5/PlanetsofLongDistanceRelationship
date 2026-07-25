"use client";

import { useEffect, useState } from "react";

import { WelcomeScreen } from "../../auth/components/WelcomeScreen";
import { useCoupleSession } from "../../auth/hooks/useCoupleSession";
import { HomeTab } from "../../home/components/HomeTab";
import { useServiceWorkerRegistration } from "../../pwa/hooks/useServiceWorkerRegistration";
import { AppShell } from "../../../components/layout/AppShell";
import { LaunchScreen } from "./LaunchScreen";

export function AppRoot() {
  const {
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
  } = useCoupleSession();

  useServiceWorkerRegistration();

  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [launchScreenLeaving, setLaunchScreenLeaving] = useState(false);

  useEffect(() => {
    if (restoringSession || !showLaunchScreen) return;

    setLaunchScreenLeaving(true);

    const timer = window.setTimeout(() => {
      setShowLaunchScreen(false);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [restoringSession, showLaunchScreen]);

  if (restoringSession || showLaunchScreen) {
    return <LaunchScreen leaving={launchScreenLeaving} />;
  }

  if (!entered || !data) {
    return (
      <WelcomeScreen
        code={code}
        role={role}
        hasChosenRole={hasChosenRole}
        loading={loading}
        error={error}
        firstNameInput=""
        secondNameInput=""
        onCodeChange={setCode}
        onRoleChange={(nextRole) => {
          setRole(nextRole);
          setHasChosenRole(true);
        }}
        onSubmit={enter}
      />
    );
  }

  return (
    <AppShell>
      <HomeTab settings={data.settings} role={role} now={new Date()} />
    </AppShell>
  );
}
