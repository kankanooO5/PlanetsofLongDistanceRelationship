"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { AppShell } from "../../../components/layout/AppShell";
import { PhotoLightbox } from "../../album/components/PhotoLightbox";
import { usePhotos } from "../../album/hooks/usePhotos";
import type { AlbumPhoto } from "../../album/types/album";
import { useCoupleSession } from "../../auth/hooks/useCoupleSession";
import { HomeTab } from "../../home/components/HomeTab";
import { MemoriesTab } from "../../memories/components/MemoriesTab";
import {
  BottomNavigation,
  type AppTab,
} from "../../navigation/components/BottomNavigation";
import { RelationshipEntry } from "../../onboarding/components/RelationshipEntry";
import { ProfileTab } from "../../profile/components/ProfileTab";
import { useServiceWorkerRegistration } from "../../pwa/hooks/useServiceWorkerRegistration";
import { WishesTab } from "../../wishes/components/WishesTab";
import { LaunchScreen } from "./LaunchScreen";

export function AppRoot() {
  const {
    role,
    entered,
    data,
    restoringSession,
    error,
    logout,
  } = useCoupleSession();

  const photosEnabled =
    entered && Boolean(data);

  const {
    photos,
    todayPhotos,
    loading: photosLoading,
    uploading: uploadingPhoto,
    error: photoError,
    addPhoto,
  } = usePhotos(photosEnabled);

  const [activeTab, setActiveTab] =
    useState<AppTab>("home");

  const [
    selectedPhoto,
    setSelectedPhoto,
  ] = useState<AlbumPhoto | null>(
    null,
  );

  const [
    showLaunchScreen,
    setShowLaunchScreen,
  ] = useState(true);

  const [
    launchScreenLeaving,
    setLaunchScreenLeaving,
  ] = useState(false);

  useServiceWorkerRegistration();

  useEffect(() => {
    if (
      restoringSession ||
      !showLaunchScreen
    ) {
      return;
    }

    setLaunchScreenLeaving(true);

    const timer = window.setTimeout(() => {
      setShowLaunchScreen(false);
    }, 320);

    return () =>
      window.clearTimeout(timer);
  }, [
    restoringSession,
    showLaunchScreen,
  ]);

  const closePhoto = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  if (
    restoringSession ||
    showLaunchScreen
  ) {
    return (
      <LaunchScreen
        leaving={
          launchScreenLeaving
        }
      />
    );
  }

  if (!entered || !data) {
    return (
      <RelationshipEntry
        error={error}
      />
    );
  }

  return (
    <>
      <AppShell>
        <div className="app-content">
          {activeTab === "home" && (
            <HomeTab
              settings={data.settings}
              role={role}
              now={new Date()}
              photos={todayPhotos}
              uploadingPhoto={
                uploadingPhoto
              }
              photoError={photoError}
              onUploadPhoto={addPhoto}
              onOpenPhoto={
                setSelectedPhoto
              }
            />
          )}

          {activeTab ===
            "memories" && (
            <MemoriesTab
              photos={photos}
              loading={photosLoading}
              onOpenPhoto={
                setSelectedPhoto
              }
            />
          )}

          {activeTab ===
            "wishes" && (
            <WishesTab />
          )}

          {activeTab ===
            "profile" && (
            <ProfileTab
              settings={
                data.settings
              }
              role={role}
              onLogout={logout}
            />
          )}
        </div>

        <BottomNavigation
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </AppShell>

      <PhotoLightbox
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </>
  );
}
