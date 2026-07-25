"use client";

import { useEffect, useState } from "react";

import { AppShell } from "../../../components/layout/AppShell";
import { WelcomeScreen } from "../../auth/components/WelcomeScreen";
import { useCoupleSession } from "../../auth/hooks/useCoupleSession";
import { HomeTab } from "../../home/components/HomeTab";
import { MemoriesTab } from "../../memories/components/MemoriesTab";
import {
  BottomNavigation,
  type AppTab,
} from "../../navigation/components/BottomNavigation";
import { ProfileTab } from "../../profile/components/ProfileTab";
import { useServiceWorkerRegistration } from "../../pwa/hooks/useServiceWorkerRegistration";
import { WishesTab } from "../../wishes/components/WishesTab";
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

  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [launchScreenLeaving, setLaunchScreenLeaving] = useState(false);

  useServiceWorkerRegistration();

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
      <div className="app-content">
        {activeTab === "home" && (
          <HomeTab
            settings={data.settings}
            role={role}
            now={new Date()}
          />
        )}

        {activeTab === "memories" && <MemoriesTab />}

        {activeTab === "wishes" && <WishesTab />}

        {activeTab === "profile" && (
          <ProfileTab
            settings={data.settings}
            role={role}
          />
        )}
      </div>

      <BottomNavigation
        activeTab={activeTab}
        onChange={setActiveTab}
      />
    </AppShell>
  );
}
