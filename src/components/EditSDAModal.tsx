import React, { useState, useEffect } from 'react';
import { Edit, X } from 'lucide-react';
import Modal from './ui/Modal';
import { SDAHymn, HYMN_CATEGORIES } from '../types/Song';
import { hymnalService } from '../services/hymnalService';

interface EditSDAModalProps {
  isOpen: boolean;
  hymn: SDAHymn | null;
  onClose: () => void;
  onSubmit: (hymnData: Partial<SDAHymn>) => void;
}

const EditSDAModal: React.FC<EditSDAModalProps> = ({
  isOpen,
  hymn,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    newHymnalTitle: '',
    newHymnalLyrics: '',
    englishTitleOld: '',
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
        newHymnalTitle: hymn.newHymnalTitle || '',
        newHymnalLyrics: hymn.newHymnalLyrics || '',
        englishTitleOld: hymn.englishTitleOld || '',
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
    if (!formData.newHymnalTitle.trim()) newErrors.newHymnalTitle = 'Hymnal title is required';
    if (!formData.newHymnalLyrics.trim()) newErrors.newHymnalLyrics = 'Hymnal lyrics are required';
    if (!formData.englishTitleOld.trim()) newErrors.englishTitleOld = 'English title is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      oldHymnalTitle: '', // Keep for backend compatibility
      oldHymnalLyrics: '', // Keep for backend compatibility
      category: formData.category || undefined,
      sheet_music: formData.sheet_music.length > 0 ? formData.sheet_music : undefined,
      audio: formData.audio || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      newHymnalTitle: '',
      newHymnalLyrics: '',
      englishTitleOld: '',
      category: '',
      sheet_music: [],
      audio: '',
    });
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Edit SDA Hymn</h2>
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
          <div className="grid grid-cols-1 gap-6">
            {/* Hymnal Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hymnal Title *
              </label>
              <input
                type="text"
                value={formData.newHymnalTitle}
                onChange={(e) => handleChange('newHymnalTitle', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.newHymnalTitle ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter hymnal title"
              />
              {errors.newHymnalTitle && (
                <p className="mt-1 text-sm text-red-600">{errors.newHymnalTitle}</p>
              )}
            </div>

            {/* English Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                English Title *
              </label>
              <input
                type="text"
                value={formData.englishTitleOld}
                onChange={(e) => handleChange('englishTitleOld', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.englishTitleOld ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter English title"
              />
              {errors.englishTitleOld && (
                <p className="mt-1 text-sm text-red-600">{errors.englishTitleOld}</p>
              )}
            </div>

            {/* Hymnal Lyrics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hymnal Lyrics *
              </label>
              <textarea
                value={formData.newHymnalLyrics}
                onChange={(e) => handleChange('newHymnalLyrics', e.target.value)}
                rows={10}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
                  errors.newHymnalLyrics ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter hymnal lyrics (use \n for line breaks)"
              />
              {errors.newHymnalLyrics && (
                <p className="mt-1 text-sm text-red-600">{errors.newHymnalLyrics}</p>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium"
            >
              Update Hymn
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditSDAModal; 
