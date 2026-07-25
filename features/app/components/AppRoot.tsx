"use client";

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

  if (restoringSession) {
    return <LaunchScreen />;
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
