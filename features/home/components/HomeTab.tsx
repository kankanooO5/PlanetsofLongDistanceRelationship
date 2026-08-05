"use client";

import { TodayPhotosCard } from "../../album/components/TodayPhotosCard";
import type {
  AlbumPhoto,
  UploadPhotoInput,
} from "../../album/types/album";
import type {
  CoupleSettings,
  Role,
} from "../../shared/types";
import {
  daysBetween,
  daysUntil,
  greetingFor,
} from "../utils/dates";
import { HomeHeader } from "./HomeHeader";
import { RelationshipHero } from "./RelationshipHero";

type HomeTabProps = {
  settings: CoupleSettings;
  role: Role;
  now: Date;
  photos: AlbumPhoto[];
  uploadingPhoto: boolean;
  photoError?: string;
  onUploadPhoto: (
    input: UploadPhotoInput,
  ) => Promise<unknown>;
  onOpenPhoto: (
    photo: AlbumPhoto,
  ) => void;
  loadThumbnail: (
    photoId: string,
  ) => Promise<void>;
};

export function HomeTab({
  settings,
  role,
  now,
  photos,
  uploadingPhoto,
  photoError,
  onUploadPhoto,
  onOpenPhoto,
  loadThumbnail,
}: HomeTabProps) {
  const name =
    role === "first"
      ? settings.firstName
      : settings.secondName;

  const relationshipDays = daysBetween(
    settings.startDate,
    now,
  );

  const meetingDays = daysUntil(
    settings.nextMeeting,
    now,
  );

  return (
    <>
      <HomeHeader
        greeting={greetingFor(now)}
        name={name}
        role={role}
      />

      <section className="content">
        <TodayPhotosCard
          photos={photos}
          uploading={uploadingPhoto}
          error={photoError}
          onUpload={onUploadPhoto}
          onOpenPhoto={onOpenPhoto}
          loadThumbnail={loadThumbnail}
        />

        <RelationshipHero
          relationshipDays={
            relationshipDays
          }
          meetingDays={meetingDays}
        />
      </section>
    </>
  );
}
