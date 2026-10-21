import { API_BASE_URL } from '../config/api';
import { MusicCollection, MusicStatus, MusicTrack } from '../types/Music';

let token: string | null = null;
const headers = () => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}/music${path}`, { credentials: 'include', ...options, headers: { ...headers(), ...(options?.headers || {}) } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Music service is unavailable');
  return data as T;
};

export const musicService = {
  setToken: (next: string | null) => { token = next; },
  status: () => request<MusicStatus>('/status'),
  tracks: (params = new URLSearchParams()) => request<{ items: MusicTrack[]; total: number; hasMore: boolean }>(`/tracks?${params}`),
  recent: () => request<{ items: MusicTrack[] }>('/recent'),
  featured: () => request<{ tracks: MusicTrack[]; collections: MusicCollection[] }>('/featured'),
  collections: (parent?: string) => request<{ items: MusicCollection[]; root: string }>(`/collections${parent ? `?parent=${encodeURIComponent(parent)}` : ''}`),
  collection: (id: string) => request<MusicCollection & { tracks: MusicTrack[]; children: MusicCollection[] }>(`/collections/${id}`),
  favorites: () => request<{ items: MusicTrack[] }>('/favorites'),
  favorite: (trackId: string) => request('/favorites', { method: 'POST', body: JSON.stringify({ trackId }) }),
  unfavorite: (trackId: string) => request(`/favorites/${trackId}`, { method: 'DELETE' }),
  playlists: () => request<{ items: Array<{ id: string; name: string; tracks: MusicTrack[] }> }>('/playlists'),
  createPlaylist: (name: string) => request('/playlists', { method: 'POST', body: JSON.stringify({ name }) }),
  updatePlaylist: (id: string, data: { name?: string; trackIds?: string[] }) => request(`/playlists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlaylist: (id: string) => request(`/playlists/${id}`, { method: 'DELETE' }),
  history: () => request<{ items: MusicTrack[] }>('/history'),
  logHistory: (trackId: string, position: number) => request('/history', { method: 'POST', body: JSON.stringify({ trackId, position }) }),
  sync: () => request<{ status: MusicStatus['status'] }>('/admin/sync', { method: 'POST' }),
  adminTracks: (missing = false) => request<{ items: MusicTrack[] }>(`/admin/tracks${missing ? '?missing=true' : ''}`),
  updateTrack: (id: string, data: Partial<MusicTrack>) => request<MusicTrack>(`/admin/tracks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
