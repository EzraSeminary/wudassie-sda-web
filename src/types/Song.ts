export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  year?: number;
  duration?: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditUser {
  id: string;
  email: string;
  role: string;
}

export interface ManagedUser {
  id: string;
  name?: string;
  email: string;
  role: 'admin' | 'encoder';
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface HagerignaHymn {
  id: string;
  artist: string;
  song: string;
  title: string;
  isAlbum?: boolean;
  albumName?: string;
  choirName?: string;
  trackCount?: number;
  tracks?: HagerignaAlbumTrack[];
  category?: string;
  sheet_music?: string[];
  audio?: string;
  createdBy?: AuditUser | null;
  updatedBy?: AuditUser | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HagerignaAlbumTrack {
  id: string;
  trackNumber: number;
  title: string;
  song: string;
  audio?: string;
}

export interface SDAHymn {
  id: string;
  newHymnalTitle: string;
  oldHymnalTitle: string;
  newHymnalLyrics: string;
  englishTitleOld: string;
  oldHymnalLyrics: string;
  category?: string;
  sheet_music?: string[];
  audio?: string;
  createdBy?: AuditUser | null;
  updatedBy?: AuditUser | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface YouTubeLink {
  id: string;
  url: string;
  videoId?: string;
  title?: string;
  channelTitle?: string;
  duration?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export const HYMN_CATEGORIES = [
  'Worship',
  'Praise',
  'Adoration',
  'Thanksgiving',
  'Prayer',
  'Repentance',
  'Salvation',
  'Faith',
  'Hope',
  'Love',
  'Peace',
  'Joy',
  'Testimony',
  'Dedication',
  'Communion',
  'Baptism',
  'Wedding',
  'Funeral',
  'Christmas',
  'Easter',
  'Other'
] as const;

export type HymnalType = 'hagerigna' | 'sda';

export type Hymn = HagerignaHymn | SDAHymn;

export type SuggestionStatus = 'pending' | 'applied';

export interface HymnEditSuggestion {
  id: string;
  hymnalType: HymnalType;
  hymnId: string;
  hymnTitle: string;
  originalData: Partial<HagerignaHymn & SDAHymn>;
  requestedData: Partial<HagerignaHymn & SDAHymn>;
  submitterName?: string;
  submitterEmail?: string;
  note?: string;
  status: SuggestionStatus;
  createdAt?: string;
  updatedAt?: string;
  appliedAt?: string;
  appliedBy?: AuditUser | null;
}

export interface CreateSuggestionPayload {
  hymnalType: HymnalType;
  hymnId: string;
  hymnTitle: string;
  originalData: Partial<HagerignaHymn & SDAHymn>;
  requestedData: Partial<HagerignaHymn & SDAHymn>;
  submitterName?: string;
  submitterEmail?: string;
  note?: string;
}
