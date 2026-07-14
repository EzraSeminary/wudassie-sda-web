import React, { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import Modal from './ui/Modal';
import { CreateSuggestionPayload, HagerignaHymn, HymnalType, SDAHymn } from '../types/Song';

type SuggestibleHymn = HagerignaHymn | SDAHymn;
type SuggestionFormData = {
  title: string;
  artist: string;
  song: string;
  albumName: string;
  choirName: string;
  newHymnalTitle: string;
  oldHymnalTitle: string;
  newHymnalLyrics: string;
  englishTitleOld: string;
  oldHymnalLyrics: string;
  category: string;
  audio: string;
  sheetMusic: string;
  submitterName: string;
  submitterEmail: string;
  note: string;
};

interface SuggestEditModalProps {
  isOpen: boolean;
  hymn: SuggestibleHymn | null;
  type: HymnalType;
  onClose: () => void;
  onSubmit: (payload: CreateSuggestionPayload) => Promise<void>;
}

const splitUrls = (value: string) =>
  value
    .split(/\s*[\n,]+\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const getHymnTitle = (hymn: SuggestibleHymn, type: HymnalType) =>
  type === 'hagerigna' ? (hymn as HagerignaHymn).title : (hymn as SDAHymn).newHymnalTitle;

const showRealLineBreaks = (value?: string) => (value || '').replace(/\\n/g, '\n');

const emptyFormData: SuggestionFormData = {
  title: '',
  artist: '',
  song: '',
  albumName: '',
  choirName: '',
  newHymnalTitle: '',
  oldHymnalTitle: '',
  newHymnalLyrics: '',
  englishTitleOld: '',
  oldHymnalLyrics: '',
  category: '',
  audio: '',
  sheetMusic: '',
  submitterName: '',
  submitterEmail: '',
  note: '',
};

const buildInitialFormData = (hymn: SuggestibleHymn, type: HymnalType): SuggestionFormData => {
  if (type === 'hagerigna') {
    const hagerigna = hymn as HagerignaHymn;
    return {
      ...emptyFormData,
      title: hagerigna.title || '',
      artist: hagerigna.artist || '',
      song: showRealLineBreaks(hagerigna.song),
      albumName: hagerigna.albumName || hagerigna.title || '',
      choirName: hagerigna.choirName || hagerigna.artist || '',
      category: hagerigna.category || '',
      audio: hagerigna.audio || '',
      sheetMusic: (hagerigna.sheet_music || []).join('\n'),
    };
  }

  const sda = hymn as SDAHymn;
  return {
    ...emptyFormData,
    newHymnalTitle: sda.newHymnalTitle || '',
    oldHymnalTitle: sda.oldHymnalTitle || '',
    newHymnalLyrics: showRealLineBreaks(sda.newHymnalLyrics),
    englishTitleOld: sda.englishTitleOld || '',
    oldHymnalLyrics: showRealLineBreaks(sda.oldHymnalLyrics),
    category: sda.category || '',
    audio: sda.audio || '',
    sheetMusic: (sda.sheet_music || []).join('\n'),
  };
};

const fieldClassName =
  'w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';
const textareaClassName = `${fieldClassName} resize-y`;

const buildOriginalData = (hymn: SuggestibleHymn, type: HymnalType) => {
  if (type === 'hagerigna') {
    const hagerigna = hymn as HagerignaHymn;
    return {
      ...hagerigna,
      song: showRealLineBreaks(hagerigna.song),
    };
  }

  const sda = hymn as SDAHymn;
  return {
    ...sda,
    newHymnalLyrics: showRealLineBreaks(sda.newHymnalLyrics),
    oldHymnalLyrics: showRealLineBreaks(sda.oldHymnalLyrics),
  };
};

const SuggestEditModal: React.FC<SuggestEditModalProps> = ({
  isOpen,
  hymn,
  type,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<SuggestionFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hymn && isOpen) {
      setFormData(buildInitialFormData(hymn, type));
    } else if (!isOpen) {
      setFormData(emptyFormData);
    }
    setError('');
  }, [hymn, type, isOpen]);

  const handleClose = () => {
    setSubmitting(false);
    setError('');
    onClose();
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hymn) return;

    const requestedData =
      type === 'hagerigna'
        ? {
            title: formData.title.trim(),
            artist: formData.artist.trim(),
            song: formData.song.trim(),
            albumName: formData.albumName.trim(),
            choirName: formData.choirName.trim(),
            category: formData.category.trim(),
            audio: formData.audio.trim(),
            sheet_music: splitUrls(formData.sheetMusic),
          }
        : {
            newHymnalTitle: formData.newHymnalTitle.trim(),
            oldHymnalTitle: formData.oldHymnalTitle.trim(),
            newHymnalLyrics: formData.newHymnalLyrics.trim(),
            englishTitleOld: formData.englishTitleOld.trim(),
            oldHymnalLyrics: formData.oldHymnalLyrics.trim(),
            category: formData.category.trim(),
            audio: formData.audio.trim(),
            sheet_music: splitUrls(formData.sheetMusic),
          };

    const title = getHymnTitle(hymn, type);
    setSubmitting(true);
    try {
      await onSubmit({
        hymnalType: type,
        hymnId: hymn.id,
        hymnTitle: title,
        originalData: buildOriginalData(hymn, type),
        requestedData,
        submitterName: formData.submitterName.trim(),
        submitterEmail: formData.submitterEmail.trim(),
        note: formData.note.trim(),
      });
      handleClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hymn) return null;
  const isHagerigna = type === 'hagerigna';
  const isAlbum = isHagerigna && Boolean((hymn as HagerignaHymn).isAlbum);
  const initialData = buildInitialFormData(hymn, type);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} contentClassName="max-w-5xl">
      <div className="bg-white rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="bg-slate-950 p-6 rounded-t-2xl text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Suggest Edit</h2>
                <p className="text-sm text-white/75 mt-1">{getHymnTitle(hymn, type)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              aria-label="Close suggestion form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {isHagerigna ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isAlbum ? 'Album Name' : 'Title'}
                </label>
                <input
                  value={isAlbum ? formData.albumName : formData.title}
                  placeholder={isAlbum ? initialData.albumName : initialData.title}
                  onChange={(event) => handleChange(isAlbum ? 'albumName' : 'title', event.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isAlbum ? 'Singer/Choir Name' : 'Artist'}
                </label>
                <input
                  value={isAlbum ? formData.choirName : formData.artist}
                  placeholder={isAlbum ? initialData.choirName : initialData.artist}
                  onChange={(event) => handleChange(isAlbum ? 'choirName' : 'artist', event.target.value)}
                  className={fieldClassName}
                />
              </div>
              {!isAlbum && (
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Song Text</label>
                  <textarea
                    value={formData.song}
                    placeholder={initialData.song}
                    onChange={(event) => handleChange('song', event.target.value)}
                    rows={10}
                    className={textareaClassName}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hymnal Title</label>
                <input
                  value={formData.newHymnalTitle}
                  placeholder={initialData.newHymnalTitle}
                  onChange={(event) => handleChange('newHymnalTitle', event.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">English Title</label>
                <input
                  value={formData.englishTitleOld}
                  placeholder={initialData.englishTitleOld}
                  onChange={(event) => handleChange('englishTitleOld', event.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Hymnal Lyrics</label>
                <textarea
                  value={formData.newHymnalLyrics}
                  placeholder={initialData.newHymnalLyrics}
                  onChange={(event) => handleChange('newHymnalLyrics', event.target.value)}
                  rows={10}
                  className={textareaClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Old Hymnal Title</label>
                <input
                  value={formData.oldHymnalTitle}
                  placeholder={initialData.oldHymnalTitle}
                  onChange={(event) => handleChange('oldHymnalTitle', event.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Old Hymnal Lyrics</label>
                <textarea
                  value={formData.oldHymnalLyrics}
                  placeholder={initialData.oldHymnalLyrics}
                  onChange={(event) => handleChange('oldHymnalLyrics', event.target.value)}
                  rows={4}
                  className={textareaClassName}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <input
                value={formData.category}
                placeholder={initialData.category}
                onChange={(event) => handleChange('category', event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Audio URL</label>
              <input
                value={formData.audio}
                placeholder={initialData.audio}
                onChange={(event) => handleChange('audio', event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sheet Music URLs</label>
              <textarea
                value={formData.sheetMusic}
                onChange={(event) => handleChange('sheetMusic', event.target.value)}
                rows={3}
                placeholder={initialData.sheetMusic || 'One URL per line'}
                className={textareaClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-200 pt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
              <input
                value={formData.submitterName}
                onChange={(event) => handleChange('submitterName', event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Your Email</label>
              <input
                type="email"
                value={formData.submitterEmail}
                onChange={(event) => handleChange('submitterEmail', event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Note</label>
              <textarea
                value={formData.note}
                onChange={(event) => handleChange('note', event.target.value)}
                rows={3}
                className={textareaClassName}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send Suggestion'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SuggestEditModal;
