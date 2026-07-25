"use client";

import { WelcomeScreen } from "../../auth/components/WelcomeScreen";
import { useCoupleSession } from "../../auth/hooks/useCoupleSession";
import { HomeTab } from "../../home/components/HomeTab";
import { useServiceWorkerRegistration } from "../../pwa/hooks/useServiceWorkerRegistration";
import { AppShell } from "../../../components/layout/AppShell";

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
    return (
      <main className="launch-screen" aria-label="正在进入两颗星球">
        <div className="launch-orbit" aria-hidden="true">
          <span className="launch-planet launch-planet-a" />
          <span className="launch-planet launch-planet-b" />
        </div>

        <p>TWO PLANETS · ONE HOME</p>
      </main>
    );
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
