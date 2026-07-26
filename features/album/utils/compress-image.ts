export type GeneratedThumbnail = {
  thumbnailFile: File;
  originalWidth?: number;
  originalHeight?: number;
};

const THUMBNAIL_WIDTH = 720;
const THUMBNAIL_HEIGHT = 960;
const TARGET_MAX_BYTES = 1200 * 1024;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("无法读取这张照片"));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function cropSourceRectForPortrait3x4(image: HTMLImageElement) {
  const targetRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
  const sourceRatio = image.width / image.height;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (sourceRatio > targetRatio) {
    sourceWidth = Math.round(image.height * targetRatio);
    sourceX = Math.round((image.width - sourceWidth) / 2);
  } else if (sourceRatio < targetRatio) {
    sourceHeight = Math.round(image.width / targetRatio);
    sourceY = Math.round((image.height - sourceHeight) / 2);
  }

  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
  };
}

async function createCompressedBlob(canvas: HTMLCanvasElement) {
  const webpQualities = [0.88, 0.82, 0.76, 0.68];
  const jpegQualities = [0.88, 0.82, 0.76, 0.7];

  let smallestResult: {
    blob: Blob;
    mimeType: string;
    extension: string;
  } | null = null;

  for (const quality of webpQualities) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);

    if (!blob) continue;

    if (!smallestResult || blob.size < smallestResult.blob.size) {
      smallestResult = {
        blob,
        mimeType: "image/webp",
        extension: "webp",
      };
    }

    if (blob.size <= TARGET_MAX_BYTES) {
      return {
        blob,
        mimeType: "image/webp",
        extension: "webp",
      };
    }
  }

  for (const quality of jpegQualities) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);

    if (!blob) continue;

    if (!smallestResult || blob.size < smallestResult.blob.size) {
      smallestResult = {
        blob,
        mimeType: "image/jpeg",
        extension: "jpg",
      };
    }

    if (blob.size <= TARGET_MAX_BYTES) {
      return {
        blob,
        mimeType: "image/jpeg",
        extension: "jpg",
      };
    }
  }

  if (smallestResult && smallestResult.blob.size <= 2 * 1024 * 1024) {
    return smallestResult;
  }

  throw new Error("照片缩略图超过大小限制");
}

export async function createPhotoThumbnail(
  file: File,
): Promise<GeneratedThumbnail> {
  const image = await loadImage(file);

  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法处理照片");
  }

  const { sourceX, sourceY, sourceWidth, sourceHeight } =
    cropSourceRectForPortrait3x4(image);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    THUMBNAIL_WIDTH,
    THUMBNAIL_HEIGHT,
  );

  const { blob, mimeType, extension } = await createCompressedBlob(canvas);

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  const thumbnailFile = new File([blob], `${baseName}-thumbnail.${extension}`, {
    type: mimeType,
  });

  return {
    thumbnailFile,
    originalWidth: image.naturalWidth || image.width,
    originalHeight: image.naturalHeight || image.height,
  };
}
