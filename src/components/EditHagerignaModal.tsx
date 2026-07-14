import React, { useState, useEffect } from 'react';
import { Disc3, Edit, Music2, Trash2, Upload, X } from 'lucide-react';
import Modal from './ui/Modal';
import { HagerignaAlbumTrack, HagerignaHymn, HYMN_CATEGORIES } from '../types/Song';
import { hymnalService } from '../services/hymnalService';

interface EditHagerignaModalProps {
  isOpen: boolean;
  hymn: HagerignaHymn | null;
  onClose: () => void;
  onSubmit: (hymnData: Partial<HagerignaHymn>) => void;
}

const showRealLineBreaks = (value?: string) => (value || '').replace(/\\n/g, '\n');

const EditHagerignaModal: React.FC<EditHagerignaModalProps> = ({
  isOpen,
  hymn,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    artist: '',
    song: '',
    title: '',
    isAlbum: false,
    albumName: '',
    choirName: '',
    trackCount: 0,
    tracks: [] as HagerignaAlbumTrack[],
    category: '',
    sheet_music: [] as string[],
    audio: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingTrackId, setUploadingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (hymn) {
      setFormData({
        artist: hymn.artist || '',
        song: showRealLineBreaks(hymn.song),
        title: hymn.title || '',
        isAlbum: Boolean(hymn.isAlbum),
        albumName: hymn.albumName || hymn.title || '',
        choirName: hymn.choirName || hymn.artist || '',
        trackCount: hymn.tracks?.length || hymn.trackCount || 0,
        tracks: (hymn.tracks || []).map((track) => ({
          ...track,
          song: showRealLineBreaks(track.song),
        })),
        category: hymn.category || '',
        sheet_music: hymn.sheet_music || [],
        audio: hymn.audio || '',
      });
    }
  }, [hymn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (formData.isAlbum) {
      if (!formData.albumName.trim()) newErrors.albumName = 'Album name is required';
      if (!formData.choirName.trim()) newErrors.choirName = 'Singer/Choir name is required';
      if (formData.tracks.length === 0) newErrors.tracks = 'At least one track is required';
      if (formData.tracks.some((track) => !track.title.trim() || !track.song.trim())) {
        newErrors.tracks = 'Each track needs a title and song content';
      }
    } else {
      if (!formData.artist.trim()) newErrors.artist = 'Artist is required';
      if (!formData.song.trim()) newErrors.song = 'Song is required';
      if (!formData.title.trim()) newErrors.title = 'Title is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (formData.isAlbum) {
      const cleanTracks = formData.tracks.map((track, index) => ({
        ...track,
        trackNumber: index + 1,
        title: track.title.trim(),
        song: track.song.trim(),
        audio: track.audio || '',
      }));
      onSubmit({
        ...formData,
        albumName: formData.albumName.trim(),
        choirName: formData.choirName.trim(),
        trackCount: cleanTracks.length,
        tracks: cleanTracks,
        artist: formData.choirName.trim(),
        title: formData.albumName.trim(),
        song: cleanTracks.map((track) => `${track.trackNumber}. ${track.title}`).join('\n'),
        sheet_music: [],
        audio: '',
      });
    } else {
      onSubmit(formData);
    }
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      artist: '',
      song: '',
      title: '',
      isAlbum: false,
      albumName: '',
      choirName: '',
      trackCount: 0,
      tracks: [],
      category: '',
      sheet_music: [],
      audio: '',
    });
    setErrors({});
    setUploadingTrackId(null);
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await hymnalService.uploadImages(formData);
      setFormData(prev => ({
        ...prev,
        sheet_music: [...prev.sheet_music, ...response.urls].slice(0, 3)
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      setErrors(prev => ({ ...prev, sheet_music: 'Failed to upload images' }));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sheet_music: prev.sheet_music.filter((_, i) => i !== index)
    }));
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await hymnalService.uploadAudio(formData);
      setFormData(prev => ({ ...prev, audio: response.url }));
    } catch (error) {
      console.error('Error uploading audio:', error);
      setErrors(prev => ({ ...prev, audio: 'Failed to upload audio' }));
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleRemoveAudio = () => {
    setFormData(prev => ({ ...prev, audio: '' }));
    if (errors.audio) {
      setErrors(prev => ({ ...prev, audio: '' }));
    }
  };

  const updateTrack = (trackId: string, field: keyof HagerignaAlbumTrack, value: string) => {
    setFormData((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.id === trackId ? { ...track, [field]: value } : track
      ),
    }));
    if (errors.tracks) {
      setErrors((prev) => ({ ...prev, tracks: '' }));
    }
  };

  const removeTrack = (trackId: string) => {
    setFormData((prev) => {
      const nextTracks = prev.tracks
        .filter((track) => track.id !== trackId)
        .map((track, index) => ({ ...track, trackNumber: index + 1 }));
      return {
        ...prev,
        tracks: nextTracks,
        trackCount: nextTracks.length,
      };
    });
  };

  const handleTrackAudioUpload = async (
    trackId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingTrackId(trackId);
    try {
      const uploadData = new FormData();
      uploadData.append('audio', file);
      const response = await hymnalService.uploadAudio(uploadData);
      updateTrack(trackId, 'audio', response.url);
    } catch (error) {
      console.error('Error uploading track audio:', error);
      setErrors((prev) => ({ ...prev, tracks: 'Failed to upload track audio' }));
    } finally {
      setUploadingTrackId(null);
      event.target.value = '';
    }
  };

  if (!hymn) return null;

  if (formData.isAlbum) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="admin-panel rounded-2xl max-w-7xl w-full max-h-[92vh] overflow-y-auto">
          <div className="bg-slate-950 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Disc3 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Edit Hagerigna Album</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close album editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Album Name *</label>
                <input
                  type="text"
                  value={formData.albumName}
                  onChange={(event) => handleChange('albumName', event.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.albumName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.albumName && <p className="mt-1 text-sm text-red-600">{errors.albumName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Singer/Choir Name *</label>
                <input
                  type="text"
                  value={formData.choirName}
                  onChange={(event) => handleChange('choirName', event.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.choirName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.choirName && <p className="mt-1 text-sm text-red-600">{errors.choirName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tracks</label>
                <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  {formData.tracks.length}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {formData.tracks.map((track) => (
                <section key={track.id} className="admin-form-card">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Music2 className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-semibold text-gray-900">Track {track.trackNumber}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTrack(track.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete track"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Track Title *</label>
                        <input
                          type="text"
                          value={track.title}
                          onChange={(event) => updateTrack(track.id, 'title', event.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Audio File</label>
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          {uploadingTrackId === track.id ? 'Uploading...' : 'Upload Audio'}
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(event) => handleTrackAudioUpload(track.id, event)}
                            disabled={uploadingTrackId === track.id}
                            className="sr-only"
                          />
                        </label>
                        {track.audio && (
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-xs text-gray-600 truncate flex-1">{track.audio}</p>
                            <button
                              type="button"
                              onClick={() => updateTrack(track.id, 'audio', '')}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Song Content *</label>
                      <textarea
                        value={track.song}
                        onChange={(event) => updateTrack(track.id, 'song', event.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                      />
                    </div>
                  </div>
                </section>
              ))}
              {errors.tracks && <p className="text-sm text-red-600">{errors.tracks}</p>}
            </div>

            <div className="flex gap-3 mt-8 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-medium"
              >
                Update Album
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="admin-panel rounded-2xl max-w-7xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-950 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Edit Hagerigna Hymn</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Artist */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artist *
              </label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => handleChange('artist', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.artist ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter artist name"
              />
              {errors.artist && (
                <p className="mt-1 text-sm text-red-600">{errors.artist}</p>
              )}
            </div>

            {/* Song */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Song *
              </label>
              <textarea
                value={formData.song}
                onChange={(e) => handleChange('song', e.target.value)}
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical ${
                  errors.song ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter song content"
              />
              {errors.song && (
                <p className="mt-1 text-sm text-red-600">{errors.song}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter hymn title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {HYMN_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sheet Music Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sheet Music (up to 3 images)
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImages || formData.sheet_music.length >= 3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {uploadingImages && (
                  <p className="text-sm text-gray-500">Uploading images...</p>
                )}
                {formData.sheet_music.length > 0 && (
                  <div className="space-y-2">
                    {formData.sheet_music.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="flex-1 text-sm text-gray-700 truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {errors.sheet_music && (
                  <p className="mt-1 text-sm text-red-600">{errors.sheet_music}</p>
                )}
              </div>
            </div>

            {/* Audio Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio File
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  disabled={uploadingAudio}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {uploadingAudio && (
                  <p className="text-sm text-gray-500">Uploading audio...</p>
                )}
                {formData.audio && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="flex-1 text-sm text-gray-700 truncate">{formData.audio}</p>
                    <button
                      type="button"
                      onClick={handleRemoveAudio}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Delete Audio
                    </button>
                  </div>
                )}
                {errors.audio && (
                  <p className="mt-1 text-sm text-red-600">{errors.audio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-medium"
            >
              Update Hymn
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditHagerignaModal; 
