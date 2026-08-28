/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

import type { AiJob } from "../lib/server/ai-jobs";
import { analyzeAndStorePhotoVision } from "../lib/server/photo-vision-insight-service";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PHOTOS: R2Bucket;
  AI: Ai;
  AI_JOBS: Queue<AiJob>;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },

  async queue(
    batch: MessageBatch<AiJob>,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    for (const message of batch.messages) {
      const job = message.body;

      if (
        !job ||
        job.type !== "photo_vision"
      ) {
        console.error(
          "Unknown AI job",
          job,
        );

        message.ack();
        continue;
      }

      const photo =
        await env.DB
          .prepare(
            `SELECT
              id,
              object_key AS objectKey,
              thumbnail_object_key AS thumbnailObjectKey,
              mime_type AS mimeType,
              caption
             FROM photos
             WHERE id = ?
             LIMIT 1`,
          )
          .bind(
            job.photoId,
          )
          .first<{
            id: string;
            objectKey: string;
            thumbnailObjectKey:
              | string
              | null;
            mimeType: string;
            caption:
              | string
              | null;
          }>();

      if (!photo) {
        console.warn(
          "Photo vision job skipped: photo missing",
          job.photoId,
        );

        message.ack();
        continue;
      }

      try {
        const result =
          await analyzeAndStorePhotoVision(
            env.DB,
            env.PHOTOS,
            env.AI,
            {
              photoId:
                photo.id,

              objectKey:
                photo.objectKey,

              thumbnailObjectKey:
                photo.thumbnailObjectKey,

              mimeType:
                photo.mimeType,

              caption:
                photo.caption,
            },
          );

        if (
          result.status ===
          "failed"
        ) {
          console.error(
            "Photo vision queue job failed",
            job.photoId,
          );

          message.retry();
          continue;
        }

        console.log(
          "Photo vision queue job complete",
          job.photoId,
          result.status,
        );

        message.ack();
      } catch (reason) {
        console.error(
          "Photo vision queue consumer error",
          job.photoId,
          reason,
        );

        message.retry();
      }
    }
  },
};

export default worker;
