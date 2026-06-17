import { Category, HagerignaHymn, ManagedUser, SDAHymn, HymnalType, YouTubeLink } from '../types/Song';
import { API_BASE_URL } from '../config/api';

interface AddYouTubeLinkResponse extends YouTubeLink {
  duplicates?: string[];
}

interface AddYouTubeLinksResult {
  created: YouTubeLink[];
  duplicates: string[];
}

class HymnalService {
  private baseUrl = API_BASE_URL;
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private get fetchOptions() {
    return {
      credentials: 'include' as const,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    };
  }

  async getHagerignaHymns(): Promise<HagerignaHymn[]> {
    try {
      const response = await fetch(`${this.baseUrl}/hagerigna`, this.fetchOptions);
      if (!response.ok) {
        throw new Error('Failed to fetch Hagerigna hymns');
      }
      const data = await response.json();
      // console.log('Raw Hagerigna API response:', data.slice(0, 2));
      return data; // API already returns the correct format
    } catch (error) {
      console.error('Error fetching Hagerigna hymns:', error);
      throw error;
    }
  }

  async getSDAHymns(): Promise<SDAHymn[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sda`, this.fetchOptions);
      if (!response.ok) {
        throw new Error('Failed to fetch SDA hymns');
      }
      const data = await response.json();
      // console.log('Raw SDA API response:', data.slice(0, 2));
      return data; // API already returns the correct format
    } catch (error) {
      console.error('Error fetching SDA hymns:', error);
      throw error;
    }
  }

  async updateHagerignaHymn(id: string, hymnData: Partial<HagerignaHymn>): Promise<HagerignaHymn> {
    try {
      const response = await fetch(`${this.baseUrl}/hagerigna/${id}`, {
        ...this.fetchOptions,
        method: 'PUT',
        body: JSON.stringify(hymnData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update Hagerigna hymn');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating Hagerigna hymn:', error);
      throw error;
    }
  }

  async updateSDAHymn(id: string, hymnData: Partial<SDAHymn>): Promise<SDAHymn> {
    try {
      const response = await fetch(`${this.baseUrl}/sda/${id}`, {
        ...this.fetchOptions,
        method: 'PUT',
        body: JSON.stringify(hymnData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update SDA hymn');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating SDA hymn:', error);
      throw error;
    }
  }

  async addHagerignaHymn(hymnData: Omit<HagerignaHymn, 'id'>): Promise<HagerignaHymn> {
    try {
      const response = await fetch(`${this.baseUrl}/hagerigna`, {
        ...this.fetchOptions,
        method: 'POST',
        body: JSON.stringify(hymnData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add Hagerigna hymn');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding Hagerigna hymn:', error);
      throw error;
    }
  }

  async addSDAHymn(hymnData: Omit<SDAHymn, 'id'>): Promise<SDAHymn> {
    try {
      const response = await fetch(`${this.baseUrl}/sda`, {
        ...this.fetchOptions,
        method: 'POST',
        body: JSON.stringify(hymnData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add SDA hymn');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding SDA hymn:', error);
      throw error;
    }
  }

  async deleteHagerignaHymn(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/hagerigna/${id}`, {
        ...this.fetchOptions,
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete Hagerigna hymn');
      }
    } catch (error) {
      console.error('Error deleting Hagerigna hymn:', error);
      throw error;
    }
  }

  async deleteSDAHymn(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sda/${id}`, {
        ...this.fetchOptions,
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete SDA hymn');
      }
    } catch (error) {
      console.error('Error deleting SDA hymn:', error);
      throw error;
    }
  }

  async searchHymns(query: string, type: HymnalType): Promise<HagerignaHymn[] | SDAHymn[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${type}/search?q=${encodeURIComponent(query)}`, this.fetchOptions);
      if (!response.ok) {
        throw new Error(`Failed to search ${type} hymns`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error searching ${type} hymns:`, error);
      throw error;
    }
  }

  async uploadImages(formData: FormData): Promise<{ urls: string[]; fileIds: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/upload/images`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload images');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  }

  async uploadAudio(formData: FormData): Promise<{ url: string; fileId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/upload/audio`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload audio');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  }

  async getYouTubeLinks(): Promise<YouTubeLink[]> {
    try {
      const response = await fetch(`${this.baseUrl}/youtube-links`, this.fetchOptions);
      if (!response.ok) {
        throw new Error('Failed to fetch YouTube links');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching YouTube links:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`, this.fetchOptions);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getUsers(): Promise<ManagedUser[]> {
    const response = await fetch(`${this.baseUrl}/auth/users`, this.fetchOptions);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return await response.json();
  }

  async createEncoder(payload: { name?: string; email: string; password: string }): Promise<ManagedUser> {
    const response = await fetch(`${this.baseUrl}/auth/users`, {
      ...this.fetchOptions,
      method: 'POST',
      body: JSON.stringify({ ...payload, role: 'encoder' }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to create encoder');
    }
    return data;
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/users/${id}`, {
      ...this.fetchOptions,
      method: 'DELETE',
    });
    if (!response.ok) {
      let message = 'Failed to delete user';
      try {
        const data = await response.json();
        if (data?.error) {
          message = data.error;
        }
      } catch {
        // no-op
      }
      throw new Error(message);
    }
  }

  async addYouTubeLink(payload: { url: string }): Promise<AddYouTubeLinkResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/youtube-links`, {
        ...this.fetchOptions,
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = 'Failed to add YouTube link';
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch {
          // Ignore JSON parse failures and use the generic message.
        }
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding YouTube link:', error);
      throw error;
    }
  }

  async addYouTubeLinks(urls: string[]): Promise<AddYouTubeLinksResult> {
    const created: YouTubeLink[] = [];
    const duplicates: string[] = [];
    for (const url of urls) {
      try {
        const link = await this.addYouTubeLink({ url });
        created.push(link);
        if (Array.isArray(link.duplicates) && link.duplicates.length > 0) {
          duplicates.push(...link.duplicates);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add YouTube links';
        const failedAfter = created.length;
        throw new Error(
          failedAfter > 0
            ? `${message}. Added ${failedAfter} link${failedAfter === 1 ? '' : 's'} before it failed.`
            : message
        );
      }
    }

    return { created, duplicates };
  }

  async deleteYouTubeLink(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/youtube-links/${id}`, {
        ...this.fetchOptions,
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete YouTube link');
      }
    } catch (error) {
      console.error('Error deleting YouTube link:', error);
      throw error;
    }
  }
}

export const hymnalService = new HymnalService(); 
