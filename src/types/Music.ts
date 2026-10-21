export interface MusicTrack {
  id: string;
  imageKitFileId: string;
  title: string;
  artist: string;
  artworkUrl: string;
  description: string;
  genres: string[];
  language: string;
  featured: boolean;
  fileName: string;
  filePath: string;
  url: string;
  size?: number;
  fileType?: string;
  mime?: string;
  collectionPath: string;
  collectionName: string;
  createdAt?: string;
  updatedAt?: string;
  playCount: number;
  missingFromSource?: boolean;
  published?: boolean;
}

export interface MusicCollection {
  id: string;
  name: string;
  path: string;
  parentPath: string | null;
  trackCount: number;
  artworkUrl: string;
  description: string;
  featured: boolean;
  published?: boolean;
}

export interface MusicStatus {
  root: string;
  configured: boolean;
  status: { status: string; startedAt?: string; finishedAt?: string; trackCount: number; collectionCount: number; error?: string };
}
