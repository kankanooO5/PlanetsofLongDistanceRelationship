export type AlbumPhoto = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption: string;
  takenAt: string;
  createdAt: string;
  width?: number;
  height?: number;
};

export type AlbumData = {
  photos: AlbumPhoto[];
};
