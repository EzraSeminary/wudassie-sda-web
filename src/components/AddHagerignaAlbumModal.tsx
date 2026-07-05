import React, { useMemo, useState } from 'react';
import { Disc3, Music2, Trash2, Upload, X } from 'lucide-react';
import Modal from './ui/Modal';
import { HagerignaAlbumTrack, HagerignaHymn } from '../types/Song';
import { hymnalService } from '../services/hymnalService';

interface AddHagerignaAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (albumData: Omit<HagerignaHymn, 'id'>) => void;
}

const createTrack = (trackNumber: number): HagerignaAlbumTrack => ({
  id: `track-${Date.now()}-${trackNumber}`,
  trackNumber,
  title: '',
  song: '',
  audio: '',
});

const AddHagerignaAlbumModal: React.FC<AddHagerignaAlbumModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [albumName, setAlbumName] = useState('');
  const [choirName, setChoirName] = useState('');
  const [trackCount, setTrackCount] = useState(1);
  const [tracks, setTracks] = useState<HagerignaAlbumTrack[]>([createTrack(1)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingTrackId, setUploadingTrackId] = useState<string | null>(null);

  const completedTracks = useMemo(
    () => tracks.filter((track) => track.title.trim() && track.song.trim()).length,
    [tracks]
  );

  const resetForm = () => {
    setAlbumName('');
    setChoirName('');
    setTrackCount(1);
    setTracks([createTrack(1)]);
    setErrors({});
    setUploadingTrackId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTrackCountChange = (value: number) => {
    const nextCount = Math.min(50, Math.max(1, value || 1));
    setTrackCount(nextCount);
    setTracks((prev) => {
      if (nextCount > prev.length) {
        const additions = Array.from({ length: nextCount - prev.length }, (_, index) =>
          createTrack(prev.length + index + 1)
        );
        return [...prev, ...additions];
      }
      return prev.slice(0, nextCount).map((track, index) => ({
        ...track,
        trackNumber: index + 1,
      }));
    });
  };

  const updateTrack = (trackId: string, field: keyof HagerignaAlbumTrack, value: string) => {
    setTracks((prev) =>
      prev.map((track) => (track.id === trackId ? { ...track, [field]: value } : track))
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next.tracks;
      return next;
    });
  };

  const removeTrack = (trackId: string) => {
    setTracks((prev) => {
      const nextTracks = prev
        .filter((track) => track.id !== trackId)
        .map((track, index) => ({ ...track, trackNumber: index + 1 }));
      setTrackCount(Math.max(1, nextTracks.length));
      return nextTracks.length ? nextTracks : [createTrack(1)];
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

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!albumName.trim()) nextErrors.albumName = 'Album name is required';
    if (!choirName.trim()) nextErrors.choirName = 'Singer/Choir name is required';
    if (tracks.length === 0) nextErrors.tracks = 'At least one track is required';
    if (tracks.some((track) => !track.title.trim() || !track.song.trim())) {
      nextErrors.tracks = 'Each track needs a title and song content';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const cleanTracks = tracks.map((track, index) => ({
      ...track,
      trackNumber: index + 1,
      title: track.title.trim(),
      song: track.song.trim(),
      audio: track.audio || '',
    }));

    onSubmit({
      isAlbum: true,
      albumName: albumName.trim(),
      choirName: choirName.trim(),
      trackCount: cleanTracks.length,
      tracks: cleanTracks,
      artist: choirName.trim(),
      title: albumName.trim(),
      song: cleanTracks.map((track) => `${track.trackNumber}. ${track.title}`).join('\n'),
      category: 'Other',
      sheet_music: [],
      audio: '',
    });
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="admin-panel rounded-2xl max-w-7xl w-full max-h-[92vh] overflow-y-auto">
        <div className="bg-slate-950 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Disc3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Create Hagerigna Album</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close album form"
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
                value={albumName}
                onChange={(event) => setAlbumName(event.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.albumName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter album name"
              />
              {errors.albumName && <p className="mt-1 text-sm text-red-600">{errors.albumName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Singer/Choir Name *</label>
              <input
                type="text"
                value={choirName}
                onChange={(event) => setChoirName(event.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.choirName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter singer or choir"
              />
              {errors.choirName && <p className="mt-1 text-sm text-red-600">{errors.choirName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Tracks</label>
              <input
                type="number"
                min={1}
                max={50}
                value={trackCount}
                onChange={(event) => handleTrackCountChange(Number(event.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-gray-500">{completedTracks} of {tracks.length} tracks complete</p>
            </div>
          </div>

          <div className="space-y-4">
            {tracks.map((track) => (
              <section key={track.id} className="admin-form-card">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">Track {track.trackNumber}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTrack(track.id)}
                    disabled={tracks.length === 1}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                        placeholder="Enter track title"
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
                      placeholder="Enter lyrics or track content"
                    />
                  </div>
                </div>
              </section>
            ))}
            {errors.tracks && <p className="text-sm text-red-600">{errors.tracks}</p>}
          </div>

          <div className="flex gap-3 pt-5 border-t border-slate-200">
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
              Create Album
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddHagerignaAlbumModal;
