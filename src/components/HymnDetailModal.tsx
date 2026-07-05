import React from 'react';
import { Disc3, ExternalLink, FileText, Image as ImageIcon, Music2, Tag, X } from 'lucide-react';
import Modal from './ui/Modal';
import { HagerignaHymn, HymnalType, SDAHymn } from '../types/Song';

type HymnDetail = HagerignaHymn | SDAHymn;

interface HymnDetailModalProps {
  isOpen: boolean;
  hymn: HymnDetail | null;
  type: HymnalType;
  showAudit?: boolean;
  onClose: () => void;
}

const renderLyrics = (value: string) => value.replace(/\\n/g, '\n');

const formatDate = (value?: string) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const HymnDetailModal: React.FC<HymnDetailModalProps> = ({ isOpen, hymn, type, showAudit = false, onClose }) => {
  if (!hymn) return null;

  const isAlbum = type === 'hagerigna' && Boolean((hymn as HagerignaHymn).isAlbum);
  const hagerignaHymn = hymn as HagerignaHymn;
  const title = isAlbum ? hagerignaHymn.albumName || hymn.title : type === 'hagerigna' ? hymn.title : hymn.newHymnalTitle;
  const subtitle = isAlbum ? hagerignaHymn.choirName || hymn.artist : type === 'hagerigna' ? hymn.artist : hymn.englishTitleOld;
  const secondaryTitle = type === 'sda' ? (hymn as SDAHymn).oldHymnalTitle : '';
  const lyrics = type === 'hagerigna' ? hymn.song : (hymn as SDAHymn).newHymnalLyrics;
  const oldLyrics = type === 'sda' ? (hymn as SDAHymn).oldHymnalLyrics : '';
  const sheetMusic = hymn.sheet_music || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-7xl">
      <div className="admin-panel rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-6 text-white bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/75">
                {isAlbum ? 'Hagerigna Album' : type === 'hagerigna' ? 'Hagerigna Hymn' : 'SDA Hymn'}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mt-2">{title}</h2>
              {subtitle && <p className="text-white/85 mt-2">{subtitle}</p>}
              {secondaryTitle && <p className="text-sm text-white/70 mt-1">Legacy title: {secondaryTitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/15 transition-colors"
              aria-label="Close hymn details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            {isAlbum ? (
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Disc3 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Tracks</h3>
                </div>
                <div className="space-y-4">
                  {(hagerignaHymn.tracks || []).map((track) => (
                    <div key={track.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            Track {track.trackNumber}
                          </p>
                          <h4 className="text-base font-semibold text-gray-900 mt-1">{track.title}</h4>
                        </div>
                        {track.audio && (
                          <audio controls className="w-48 max-w-full">
                            <source src={track.audio} />
                          </audio>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-700">{renderLyrics(track.song)}</pre>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Lyrics</h3>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-700">{renderLyrics(lyrics)}</pre>
                {oldLyrics && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Old Hymnal Lyrics</h4>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-600">{renderLyrics(oldLyrics)}</pre>
                  </div>
                )}
              </section>
            )}

            <aside className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Details</h3>
                </div>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Category</dt>
                    <dd className="text-gray-900 mt-1">{hymn.category || 'Not assigned'}</dd>
                  </div>
                  {isAlbum && (
                    <div>
                      <dt className="text-gray-500">Tracks</dt>
                      <dd className="text-gray-900 mt-1">{hagerignaHymn.tracks?.length || hagerignaHymn.trackCount || 0}</dd>
                    </div>
                  )}
                  {type === 'hagerigna' && !isAlbum && (
                    <div>
                      <dt className="text-gray-500">Artist</dt>
                      <dd className="text-gray-900 mt-1">{(hymn as HagerignaHymn).artist || 'Unknown'}</dd>
                    </div>
                  )}
                  {type === 'sda' && (
                    <div>
                      <dt className="text-gray-500">English Title</dt>
                      <dd className="text-gray-900 mt-1">{(hymn as SDAHymn).englishTitleOld || 'Not provided'}</dd>
                    </div>
                  )}
                  {!isAlbum && (
                    <>
                      <div>
                        <dt className="text-gray-500">Sheet Music Pages</dt>
                        <dd className="text-gray-900 mt-1">{sheetMusic.length}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Audio</dt>
                        <dd className="text-gray-900 mt-1">{hymn.audio ? 'Available' : 'Not added'}</dd>
                      </div>
                    </>
                  )}
                  {showAudit && (
                    <>
                      <div>
                        <dt className="text-gray-500">Added By</dt>
                        <dd className="text-gray-900 mt-1">{hymn.createdBy?.email || 'Legacy entry'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Last Updated By</dt>
                        <dd className="text-gray-900 mt-1">{hymn.updatedBy?.email || hymn.createdBy?.email || 'Unknown'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Audit Trail</dt>
                        <dd className="text-gray-900 mt-1">
                          Created {formatDate(hymn.createdAt)} • Updated {formatDate(hymn.updatedAt)}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </section>

              {!isAlbum && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Music2 className="w-5 h-5 text-rose-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Audio</h3>
                </div>
                {hymn.audio ? (
                  <div className="space-y-3">
                    <audio controls className="w-full">
                      <source src={hymn.audio} />
                    </audio>
                    <a
                      href={hymn.audio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Open audio file
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No audio file has been attached to this hymn yet.</p>
                )}
              </section>
              )}
            </aside>
          </div>

          {!isAlbum && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-semibold text-gray-900">Sheet Music</h3>
            </div>
            {sheetMusic.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sheetMusic.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={url}
                      alt={`${title} sheet music page ${index + 1}`}
                      className="w-full h-72 object-contain bg-white transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200 bg-white">
                      Page {index + 1}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No sheet music images have been added for this hymn yet.</p>
            )}
          </section>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default HymnDetailModal;
