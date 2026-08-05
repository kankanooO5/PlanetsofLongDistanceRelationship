export type AlbumPhoto = {
  id: string;

  // 点击放大时使用的原图接口。
  imageUrl: string;

  // 首页和相簿列表使用的缩略图接口。
  thumbnailUrl?: string;

  caption: string;
  takenAt: string;
  createdAt: string;

  width?: number;
  height?: number;
  mimeType?: string;
  sizeBytes?: number;

  uploadedByMemberId?: string;
  uploaderName?: string;
};

export type AlbumData = {
  photos: AlbumPhoto[];
};

export type UploadPhotoInput = {
  originalFile: File;
  thumbnailFile: File;
  caption: string;
  takenAt: string;
  width?: number;
  height?: number;
};
