import React, { useState, useEffect, useCallback } from 'react';
import { Music, Plus, Search, BookOpen, Heart, Youtube, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HagerignaTable from './HagerignaTable';
import SDATable from './SDATable';
import AddHagerignaModal from './AddHagerignaModal';
import AddSDAModal from './AddSDAModal';
import EditHagerignaModal from './EditHagerignaModal';
import EditSDAModal from './EditSDAModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import LoadingSpinner from './ui/LoadingSpinner';
import { useToast } from './ui/Toaster';
import { hymnalService } from '../services/hymnalService';
import { HagerignaHymn, SDAHymn, HymnalType, YouTubeLink } from '../types/Song';

const MusicDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<'sda' | 'hagerigna' | 'youtube'>('sda');
  const [activeHymnal, setActiveHymnal] = useState<HymnalType>('sda');
  const [hagerignaHymns, setHagerignaHymns] = useState<HagerignaHymn[]>([]);
  const [sdaHymns, setSdaHymns] = useState<SDAHymn[]>([]);
  const [filteredHagerignaHymns, setFilteredHagerignaHymns] = useState<HagerignaHymn[]>([]);
  const [filteredSdaHymns, setFilteredSdaHymns] = useState<SDAHymn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [youtubeLinks, setYoutubeLinks] = useState<YouTubeLink[]>([]);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeAdding, setYoutubeAdding] = useState(false);
  
  // Modal states
  const [showAddHagerignaModal, setShowAddHagerignaModal] = useState(false);
  const [showAddSDAModal, setShowAddSDAModal] = useState(false);
  const [showEditHagerignaModal, setShowEditHagerignaModal] = useState(false);
  const [showEditSDAModal, setShowEditSDAModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Selected items
  const [selectedHagerignaHymn, setSelectedHagerignaHymn] = useState<HagerignaHymn | null>(null);
  const [selectedSDAHymn, setSelectedSDAHymn] = useState<SDAHymn | null>(null);
  
  const { showToast } = useToast();

  const loadHymns = useCallback(async () => {
    try {
      setLoading(true);
      const [hagerignaData, sdaData] = await Promise.all([
        hymnalService.getHagerignaHymns(),
        hymnalService.getSDAHymns()
      ]);
    
      setHagerignaHymns(hagerignaData);
      setSdaHymns(sdaData);
      setFilteredHagerignaHymns(hagerignaData);
      setFilteredSdaHymns(sdaData);
    } catch (error) {
      console.error('Error loading hymns:', error);
      showToast('Failed to load hymns', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadYouTubeLinks = useCallback(async () => {
    try {
      const youtubeData = await hymnalService.getYouTubeLinks();
      setYoutubeLinks(youtubeData);
    } catch (error) {
      console.error('Error fetching YouTube links:', error);
      showToast('Failed to load YouTube links', 'error');
    }
  }, [showToast]);

  const handleAddYouTubeLink = async () => {
    const urls = youtubeUrlInput
      .split(/\s*[\n,]+\s*/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      showToast('At least one YouTube URL is required', 'error');
      return;
    }

    setYoutubeAdding(true);
    try {
      const newLinks = urls.length === 1
        ? [await hymnalService.addYouTubeLink({ url: urls[0] })]
        : await hymnalService.addYouTubeLinks(urls);

      setYoutubeLinks((prev) => [...newLinks, ...prev]);
      setYoutubeUrlInput('');
      showToast(
        newLinks.length === 1
          ? 'YouTube link added with details'
          : `${newLinks.length} YouTube links added with details`,
        'success'
      );
    } catch (error) {
      console.error('Failed to add YouTube link:', error);
      showToast('Failed to add YouTube link', 'error');
    } finally {
      setYoutubeAdding(false);
    }
  };

  const handleDeleteYouTubeLink = async (id: string) => {
    try {
      await hymnalService.deleteYouTubeLink(id);
      setYoutubeLinks((prev) => prev.filter((link) => link.id !== id));
      showToast('YouTube link deleted', 'success');
    } catch (error) {
      console.error('Failed to delete YouTube link:', error);
      showToast('Failed to delete YouTube link', 'error');
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredHagerignaHymns(hagerignaHymns);
      setFilteredSdaHymns(sdaHymns);
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    // Filter Hagerigna hymns
    const filteredHagerigna = hagerignaHymns.filter(hymn =>
      hymn.artist.toLowerCase().includes(lowerQuery) ||
      hymn.song.toLowerCase().includes(lowerQuery) ||
      hymn.title.toLowerCase().includes(lowerQuery)
    );
    
    // Filter SDA hymns
    const filteredSDA = sdaHymns.filter(hymn =>
      hymn.newHymnalTitle.toLowerCase().includes(lowerQuery) ||
      hymn.oldHymnalTitle.toLowerCase().includes(lowerQuery) ||
      hymn.englishTitleOld.toLowerCase().includes(lowerQuery) ||
      hymn.newHymnalLyrics.toLowerCase().includes(lowerQuery) ||
      hymn.oldHymnalLyrics.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredHagerignaHymns(filteredHagerigna);
    setFilteredSdaHymns(filteredSDA);
  }, [hagerignaHymns, sdaHymns]);

  useEffect(() => {
    loadHymns();
  }, [loadHymns]);

  useEffect(() => {
    loadYouTubeLinks();
  }, [loadYouTubeLinks]);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch, activeHymnal]);

  // Hagerigna hymn handlers
  const handleAddHagerignaHymn = async (hymnData: Omit<HagerignaHymn, 'id'>) => {
    try {
      await hymnalService.addHagerignaHymn(hymnData);
      await loadHymns();
      setShowAddHagerignaModal(false);
      showToast('Hagerigna hymn added successfully', 'success');
    } catch (error) {
      console.error('Failed to add Hagerigna hymn:', error);
      showToast('Failed to add Hagerigna hymn', 'error');
    }
  };

  const handleEditHagerignaHymn = async (hymnData: Partial<HagerignaHymn>) => {
    if (!selectedHagerignaHymn) return;
    
    try {
      await hymnalService.updateHagerignaHymn(selectedHagerignaHymn.id, hymnData);
      await loadHymns();
      setShowEditHagerignaModal(false);
      setSelectedHagerignaHymn(null);
      showToast('Hagerigna hymn updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update Hagerigna hymn:', error);
      showToast('Failed to update Hagerigna hymn', 'error');
    }
  };

  const handleDeleteHagerignaHymn = async () => {
    if (!selectedHagerignaHymn) return;
    
    try {
      await hymnalService.deleteHagerignaHymn(selectedHagerignaHymn.id);
      await loadHymns();
      setShowDeleteModal(false);
      setSelectedHagerignaHymn(null);
      showToast('Hagerigna hymn deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete Hagerigna hymn:', error);
      showToast('Failed to delete Hagerigna hymn', 'error');
    }
  };

  // SDA hymn handlers
  const handleAddSDAHymn = async (hymnData: Omit<SDAHymn, 'id'>) => {
    try {
      await hymnalService.addSDAHymn(hymnData);
      await loadHymns();
      setShowAddSDAModal(false);
      showToast('SDA hymn added successfully', 'success');
    } catch (error) {
      console.error('Failed to add SDA hymn:', error);
      showToast('Failed to add SDA hymn', 'error');
    }
  };

  const handleEditSDAHymn = async (hymnData: Partial<SDAHymn>) => {
    if (!selectedSDAHymn) return;
    
    try {
      await hymnalService.updateSDAHymn(selectedSDAHymn.id, hymnData);
      await loadHymns();
      setShowEditSDAModal(false);
      setSelectedSDAHymn(null);
      showToast('SDA hymn updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update SDA hymn:', error);
      showToast('Failed to update SDA hymn', 'error');
    }
  };

  const handleDeleteSDAHymn = async () => {
    if (!selectedSDAHymn) return;
    
    try {
      await hymnalService.deleteSDAHymn(selectedSDAHymn.id);
      await loadHymns();
      setShowDeleteModal(false);
      setSelectedSDAHymn(null);
      showToast('SDA hymn deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete SDA hymn:', error);
      showToast('Failed to delete SDA hymn', 'error');
    }
  };

  // Modal handlers
  const openEditHagerignaModal = (hymn: HagerignaHymn) => {
    setSelectedHagerignaHymn(hymn);
    setShowEditHagerignaModal(true);
  };

  const openEditSDAModal = (hymn: SDAHymn) => {
    setSelectedSDAHymn(hymn);
    setShowEditSDAModal(true);
  };

  const openDeleteModal = (hymn: HagerignaHymn | SDAHymn, type: HymnalType) => {
    if (type === 'hagerigna') {
      setSelectedHagerignaHymn(hymn as HagerignaHymn);
      setSelectedSDAHymn(null);
    } else {
      setSelectedSDAHymn(hymn as SDAHymn);
      setSelectedHagerignaHymn(null);
    }
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedHagerignaHymn) {
      await handleDeleteHagerignaHymn();
    } else if (selectedSDAHymn) {
      await handleDeleteSDAHymn();
    }
  };

  const getCurrentHymns = () => {
    return activeHymnal === 'hagerigna' ? filteredHagerignaHymns : filteredSdaHymns;
  };

  const getCurrentCount = () => {
    return getCurrentHymns().length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Hymnal Database
                </h1>
                <p className="text-gray-600 mt-1">
                  {activeSection === 'youtube'
                    ? `Manage your YouTube links • ${youtubeLinks.length} links`
                    : `Manage your hymnal collections • ${getCurrentCount()} hymns`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {activeSection !== 'youtube' && (
                <button
                  onClick={() => activeHymnal === 'hagerigna' ? setShowAddHagerignaModal(true) : setShowAddSDAModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Hymn
                </button>
              )}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hymnal Selection Buttons */}
        <div className="sticky top-4 z-30 bg-white/85 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => {
                setActiveSection('sda');
                setActiveHymnal('sda');
              }}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-200 ${
                activeSection === 'sda'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BookOpen className="w-6 h-6" />
              SDA Hymnal ({filteredSdaHymns.length})
            </button>
            
            <button
              onClick={() => {
                setActiveSection('hagerigna');
                setActiveHymnal('hagerigna');
              }}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-200 ${
                activeSection === 'hagerigna'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className="w-6 h-6" />
              Hagerigna ({filteredHagerignaHymns.length})
            </button>

            <button
              onClick={() => setActiveSection('youtube')}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-200 ${
                activeSection === 'youtube'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Youtube className="w-6 h-6" />
              YouTube Links ({youtubeLinks.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {activeSection !== 'youtube' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeHymnal === 'sda' ? 'SDA hymns' : 'Hagerigna hymns'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* YouTube Links */}
        {activeSection === 'youtube' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Youtube className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-800">YouTube Links</h2>
            <span className="text-sm text-gray-500">({youtubeLinks.length})</span>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <textarea
              rows={4}
              placeholder="Paste one or more YouTube URLs. Use a new line or comma between links."
              value={youtubeUrlInput}
              onChange={(e) => setYoutubeUrlInput(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
            />
            <button
              onClick={handleAddYouTubeLink}
              disabled={youtubeAdding || !youtubeUrlInput.trim()}
              className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {youtubeAdding ? 'Adding…' : 'Add Link(s)'}
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Add one link or paste multiple links at once. Each link will be saved separately.
          </p>

          {youtubeLinks.length === 0 ? (
            <p className="text-sm text-gray-500">No YouTube links added yet. Paste a URL and click Add Link; title, channel, and duration will be saved automatically.</p>
          ) : (
            <div className="space-y-3">
              {youtubeLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-start gap-4 p-4 bg-white/60 border border-gray-100 rounded-xl"
                >
                  {link.thumbnailUrl && (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img
                        src={link.thumbnailUrl}
                        alt=""
                        className="w-32 aspect-video object-cover rounded-lg"
                      />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-red-600 block break-words"
                    >
                      {link.title ||
                        (link.channelTitle || link.duration
                          ? [link.channelTitle, link.duration].filter(Boolean).join(' · ')
                          : link.videoId
                            ? `YouTube video ${link.videoId}`
                            : link.url)}
                    </a>
                    {(link.channelTitle || link.duration) && link.title && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {link.channelTitle && <span>{link.channelTitle}</span>}
                        {link.channelTitle && link.duration && ' · '}
                        {link.duration && <span>{link.duration}</span>}
                      </p>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate block mt-1"
                    >
                      {link.url}
                    </a>
                  </div>
                  <button
                    onClick={() => handleDeleteYouTubeLink(link.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    aria-label="Delete YouTube link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

                {/* Hymns Display */}
        {activeSection !== 'youtube' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {(() => {
            // console.log('Rendering hymns display. Active hymnal:', activeHymnal, 'Current count:', getCurrentCount(), 'Filtered hymns:', activeHymnal === 'hagerigna' ? filteredHagerignaHymns.length : filteredSdaHymns.length);
            return null;
          })()}
          {getCurrentCount() === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No hymns found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search terms' : `Add your first ${activeHymnal} hymn`}
              </p>
            </div>
          ) : activeHymnal === 'hagerigna' ? (
            <HagerignaTable
              hymns={filteredHagerignaHymns}
              onEdit={openEditHagerignaModal}
              onDelete={(hymn: HagerignaHymn) => openDeleteModal(hymn, 'hagerigna')}
            />
          ) : (
            <SDATable
              hymns={filteredSdaHymns}
              onEdit={openEditSDAModal}
              onDelete={(hymn: SDAHymn) => openDeleteModal(hymn, 'sda')}
            />
          )}
        </div>
        )}
      </div>

      {/* Modals */}
      <AddHagerignaModal
        isOpen={showAddHagerignaModal}
        onClose={() => setShowAddHagerignaModal(false)}
        onSubmit={handleAddHagerignaHymn}
      />

      <AddSDAModal
        isOpen={showAddSDAModal}
        onClose={() => setShowAddSDAModal(false)}
        onSubmit={handleAddSDAHymn}
      />

      <EditHagerignaModal
        isOpen={showEditHagerignaModal}
        hymn={selectedHagerignaHymn}
        onClose={() => {
          setShowEditHagerignaModal(false);
          setSelectedHagerignaHymn(null);
        }}
        onSubmit={handleEditHagerignaHymn}
      />

      <EditSDAModal
        isOpen={showEditSDAModal}
        hymn={selectedSDAHymn}
        onClose={() => {
          setShowEditSDAModal(false);
          setSelectedSDAHymn(null);
        }}
        onSubmit={handleEditSDAHymn}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        item={selectedHagerignaHymn || selectedSDAHymn}
        itemType={selectedHagerignaHymn ? 'Hagerigna hymn' : 'SDA hymn'}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedHagerignaHymn(null);
          setSelectedSDAHymn(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default MusicDashboard;
