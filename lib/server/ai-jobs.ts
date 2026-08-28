export type PhotoVisionJob = {
  type: "photo_vision";
  photoId: string;
};

export type AiJob =
  | PhotoVisionJob;
