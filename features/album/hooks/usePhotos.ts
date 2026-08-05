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
  fetchPhotoPage,
  uploadPhoto,
} from "../../../lib/api/photo-client";
import { readMemberSession } from "../../../lib/storage/member-session";
import type {
  AlbumPhoto,
  UploadPhotoInput,
} from "../types/album";

const INITIAL_PHOTO_PAGE_SIZE = 24;
const NEXT_PHOTO_PAGE_SIZE = 20;

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
  const [nextCursor, setNextCursor] =
    useState<string | null>(null);
  const [loadingMorePhotos, setLoadingMorePhotos] =
    useState(false);

  const objectUrlsRef = useRef(new Set<string>());
  const photosRef = useRef<AlbumPhoto[]>([]);
  const thumbnailRequestsRef = useRef(
    new Set<string>(),
  );
  const loadMoreRequestRef = useRef(false);


  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    objectUrlsRef.current.clear();
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      revokeObjectUrls();
      photosRef.current = [];
      setPhotos([]);
      setNextCursor(null);
      setLoadingMorePhotos(false);
      loadMoreRequestRef.current = false;
      setLoading(false);
      return;
    }

    const session = readMemberSession();

    if (!session) {
      revokeObjectUrls();
      photosRef.current = [];
      setPhotos([]);
      setNextCursor(null);
      setLoadingMorePhotos(false);
      loadMoreRequestRef.current = false;
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const page = await fetchPhotoPage(
        session.token,
        {
          limit: INITIAL_PHOTO_PAGE_SIZE,
        },
      );

      revokeObjectUrls();

      photosRef.current = page.photos;
      setPhotos(page.photos);
      setNextCursor(page.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "暂时无法读取相簿",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, revokeObjectUrls]);

  const loadMorePhotos = useCallback(async () => {
    if (
      !enabled ||
      !nextCursor ||
      loadMoreRequestRef.current
    ) {
      return;
    }

    const session = readMemberSession();

    if (!session) {
      return;
    }

    loadMoreRequestRef.current = true;
    setLoadingMorePhotos(true);
    setError("");

    try {
      const page = await fetchPhotoPage(
        session.token,
        {
          limit: NEXT_PHOTO_PAGE_SIZE,
          cursor: nextCursor,
        },
      );

      setPhotos((current) => {
        const existingIds = new Set(
          current.map((photo) => photo.id),
        );

        const newPhotos = page.photos.filter(
          (photo) => !existingIds.has(photo.id),
        );

        const nextPhotos = [
          ...current,
          ...newPhotos,
        ];

        photosRef.current = nextPhotos;

        return nextPhotos;
      });

      setNextCursor(page.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "暂时无法继续读取相簿",
      );
    } finally {
      loadMoreRequestRef.current = false;
      setLoadingMorePhotos(false);
    }
  }, [enabled, nextCursor]);

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

        const hydratedPhoto = createdPhoto;

        photosRef.current = [
          hydratedPhoto,
          ...photosRef.current,
        ];

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
    [],
  );


  const loadThumbnail = useCallback(
    async (photoId: string) => {
      const session = readMemberSession();

      if (!session) {
        return;
      }

      const currentPhoto =
        photosRef.current.find(
          (photo) => photo.id === photoId,
        );

      if (
        !currentPhoto ||
        currentPhoto.thumbnailUrl?.startsWith(
          "blob:",
        ) ||
        thumbnailRequestsRef.current.has(photoId)
      ) {
        return;
      }

      thumbnailRequestsRef.current.add(photoId);

      try {
        const thumbnailUrl =
          await fetchPhotoObjectUrl(
            photoId,
            session.token,
            "thumbnail",
          );

        objectUrlsRef.current.add(
          thumbnailUrl,
        );

        setPhotos((current) => {
          const nextPhotos = current.map((photo) =>
            photo.id === photoId
              ? {
                  ...photo,
                  thumbnailUrl,
                }
              : photo,
          );

          photosRef.current = nextPhotos;

          return nextPhotos;
        });
      } catch {
        return;
      } finally {
        thumbnailRequestsRef.current.delete(
          photoId,
        );
      }
    },
    [],
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
    loadThumbnail,
    loadMorePhotos,
    hasMorePhotos: nextCursor !== null,
    loadingMorePhotos,
  };
}
