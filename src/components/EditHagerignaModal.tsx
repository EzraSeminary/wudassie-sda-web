import React, { useState, useEffect } from 'react';
import { Edit, X } from 'lucide-react';
import Modal from './ui/Modal';
import { HagerignaHymn, HYMN_CATEGORIES } from '../types/Song';
import { hymnalService } from '../services/hymnalService';

interface EditHagerignaModalProps {
  isOpen: boolean;
  hymn: HagerignaHymn | null;
  onClose: () => void;
  onSubmit: (hymnData: Partial<HagerignaHymn>) => void;
}

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
    category: '',
    sheet_music: [] as string[],
    audio: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  useEffect(() => {
    if (hymn) {
      setFormData({
        artist: hymn.artist || '',
        song: hymn.song || '',
        title: hymn.title || '',
        category: hymn.category || '',
        sheet_music: hymn.sheet_music || [],
        audio: hymn.audio || '',
      });
    }
  }, [hymn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.artist.trim()) newErrors.artist = 'Artist is required';
    if (!formData.song.trim()) newErrors.song = 'Song is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({ artist: '', song: '', title: '', category: '', sheet_music: [], audio: '' });
    setErrors({});
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

  if (!hymn) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl">
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
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Artist */}
            <div>
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
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium"
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
