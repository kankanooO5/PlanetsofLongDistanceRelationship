"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchPhotoObjectUrl,
  fetchPhotos,
  uploadPhoto,
} from "../../../lib/api/photo-client";
import { readMemberSession } from "../../../lib/storage/member-session";
import type {
  AlbumPhoto,
  UploadPhotoInput,
} from "../types/album";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function usePhotos(enabled: boolean) {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const objectUrlsRef = useRef(new Set<string>());

  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    objectUrlsRef.current.clear();
  }, []);

  const hydrateThumbnails = useCallback(
    async (
      sourcePhotos: AlbumPhoto[],
      memberToken: string,
    ) => {
      const createdUrls: string[] = [];

      const hydratedPhotos = await Promise.all(
        sourcePhotos.map(async (photo) => {
          try {
            const thumbnailObjectUrl =
              await fetchPhotoObjectUrl(
                photo.id,
                memberToken,
                "thumbnail",
              );

            createdUrls.push(thumbnailObjectUrl);

            return {
              ...photo,
              thumbnailUrl: thumbnailObjectUrl,
            };
          } catch {
            return photo;
          }
        }),
      );

      return {
        hydratedPhotos,
        createdUrls,
      };
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!enabled) {
      revokeObjectUrls();
      setPhotos([]);
      setLoading(false);
      return;
    }

    const session = readMemberSession();

    if (!session) {
      revokeObjectUrls();
      setPhotos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const remotePhotos = await fetchPhotos(
        session.token,
      );

      const {
        hydratedPhotos,
        createdUrls,
      } = await hydrateThumbnails(
        remotePhotos,
        session.token,
      );

      revokeObjectUrls();

      createdUrls.forEach((url) => {
        objectUrlsRef.current.add(url);
      });

      setPhotos(hydratedPhotos);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "暂时无法读取相簿",
      );
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    hydrateThumbnails,
    revokeObjectUrls,
  ]);

  useEffect(() => {
    void refresh();

    return () => {
      revokeObjectUrls();
    };
  }, [refresh, revokeObjectUrls]);

  const addPhoto = useCallback(
    async (input: UploadPhotoInput) => {
      const session = readMemberSession();

      if (!session) {
        throw new Error(
          "当前设备尚未绑定成员身份",
        );
      }

      setUploading(true);
      setError("");

      try {
        const createdPhoto = await uploadPhoto(
          session.token,
          input,
        );

        const {
          hydratedPhotos,
          createdUrls,
        } = await hydrateThumbnails(
          [createdPhoto],
          session.token,
        );

        createdUrls.forEach((url) => {
          objectUrlsRef.current.add(url);
        });

        const hydratedPhoto =
          hydratedPhotos[0];

        setPhotos((currentPhotos) => [
          hydratedPhoto,
          ...currentPhotos,
        ]);

        return hydratedPhoto;
      } catch (reason) {
        const message =
          reason instanceof Error
            ? reason.message
            : "照片上传失败";

        setError(message);
        throw new Error(message);
      } finally {
        setUploading(false);
      }
    },
    [hydrateThumbnails],
  );

  const today = localDateString();

  const todayPhotos = useMemo(
    () =>
      photos.filter(
        (photo) => photo.takenAt === today,
      ),
    [photos, today],
  );

  const historicalPhotos = useMemo(
    () =>
      photos.filter(
        (photo) => photo.takenAt !== today,
      ),
    [photos, today],
  );

  return {
    photos,
    todayPhotos,
    historicalPhotos,
    loading,
    uploading,
    error,
    refresh,
    addPhoto,
  };
}
