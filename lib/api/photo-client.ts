import type {
  AlbumData,
  AlbumPhoto,
  UploadPhotoInput,
} from "../../features/album/types/album";

type ErrorPayload = {
  error?: string;
};

export type PhotoPage = {
  photos: AlbumPhoto[];
  nextCursor: string | null;
};

type FetchPhotoPageOptions = {
  limit: number;
  cursor?: string | null;
};

async function readError(response: Response) {
  try {
    const payload =
      (await response.json()) as ErrorPayload;

    return (
      payload.error ??
      "请求失败，请稍后再试"
    );
  } catch {
    return "请求失败，请稍后再试";
  }
}

export async function fetchPhotos(
  memberToken: string,
): Promise<AlbumPhoto[]> {
  const response = await fetch(
    "/api/photos",
    {
      headers: {
        "x-member-token": memberToken,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload =
    (await response.json()) as AlbumData;

  return payload.photos;
}

export async function fetchPhotoPage(
  memberToken: string,
  {
    limit,
    cursor = null,
  }: FetchPhotoPageOptions,
): Promise<PhotoPage> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(
    `/api/photos?${searchParams.toString()}`,
    {
      headers: {
        "x-member-token": memberToken,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload =
    (await response.json()) as Partial<PhotoPage>;

  if (!Array.isArray(payload.photos)) {
    throw new Error("照片列表响应格式无效");
  }

  return {
    photos: payload.photos,
    nextCursor:
      typeof payload.nextCursor === "string"
        ? payload.nextCursor
        : null,
  };
}

export async function fetchPhotoObjectUrl(
  photoId: string,
  memberToken: string,
  variant: "thumbnail" | "original",
) {
  const response = await fetch(
    `/api/photos/${encodeURIComponent(
      photoId,
    )}?variant=${variant}`,
    {
      headers: {
        "x-member-token": memberToken,
      },
      cache:
        variant === "original"
          ? "force-cache"
          : "default",
    },
  );

  if (!response.ok) {
    throw new Error(
      variant === "original"
        ? "原图暂时无法读取"
        : "缩略图暂时无法读取",
    );
  }

  const blob = await response.blob();

  return URL.createObjectURL(blob);
}

export async function uploadPhoto(
  memberToken: string,
  input: UploadPhotoInput,
): Promise<AlbumPhoto> {
  const formData = new FormData();

  formData.set(
    "original",
    input.originalFile,
  );

  formData.set(
    "thumbnail",
    input.thumbnailFile,
  );

  formData.set("caption", input.caption);
  formData.set("takenAt", input.takenAt);

  if (input.width) {
    formData.set(
      "width",
      String(input.width),
    );
  }

  if (input.height) {
    formData.set(
      "height",
      String(input.height),
    );
  }

  const response = await fetch(
    "/api/photos",
    {
      method: "POST",
      headers: {
        "x-member-token": memberToken,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload =
    (await response.json()) as {
      photo: AlbumPhoto;
    };

  return payload.photo;
}
