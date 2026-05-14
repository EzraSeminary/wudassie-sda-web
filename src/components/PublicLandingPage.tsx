import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Headphones,
  Home,
  LogIn,
  Music,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  Youtube,
} from 'lucide-react';
import { hymnalService } from '../services/hymnalService';
import { Category, HagerignaHymn, HymnalType, SDAHymn, YouTubeLink } from '../types/Song';
import HymnFilters, { HymnFilterState } from './HymnFilters';
import HymnDetailModal from './HymnDetailModal';

const defaultFilters: HymnFilterState = {
  category: '',
  hasAudio: 'all',
  hasSheetMusic: 'all',
};

type PublicSection = 'home' | 'sda' | 'hagerigna' | 'youtube';
type SortOption = 'default' | 'title-asc' | 'title-desc' | 'number-asc' | 'number-desc';

interface PublicLandingPageProps {
  onAdminLogin: () => void;
}

const getHymnNumber = (id: string) => {
  const match = String(id || '').match(/(\d+)$/);
  return match ? match[1] : '';
};

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ onAdminLogin }) => {
  const [activeSection, setActiveSection] = useState<PublicSection>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [hagerignaHymns, setHagerignaHymns] = useState<HagerignaHymn[]>([]);
  const [sdaHymns, setSdaHymns] = useState<SDAHymn[]>([]);
  const [youtubeLinks, setYoutubeLinks] = useState<YouTubeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<HymnFilterState>(defaultFilters);
  const [selectedHagerignaHymn, setSelectedHagerignaHymn] = useState<HagerignaHymn | null>(null);
  const [selectedSDAHymn, setSelectedSDAHymn] = useState<SDAHymn | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailType, setDetailType] = useState<HymnalType>('sda');
  const [sortOption, setSortOption] = useState<SortOption>('default');

  const loadPublicData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoryData, hagerignaData, sdaData, youtubeData] = await Promise.all([
        hymnalService.getCategories(),
        hymnalService.getHagerignaHymns(),
        hymnalService.getSDAHymns(),
        hymnalService.getYouTubeLinks(),
      ]);

      setCategories(categoryData);
      setHagerignaHymns(hagerignaData);
      setSdaHymns(sdaData);
      setYoutubeLinks(youtubeData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData().catch((error) => {
      console.error('Failed to load public website data:', error);
    });
  }, [loadPublicData]);

  const applyHymnFilters = <T extends HagerignaHymn | SDAHymn>(
    hymns: T[],
    matcher: (hymn: T, query: string, digits: string) => boolean
  ) => {
    const query = normalizeSearch(searchQuery);
    const digits = query.replace(/\D/g, '');

    return hymns.filter((hymn) => {
      const matchesSearch = query.length === 0 || matcher(hymn, query, digits);
      if (!matchesSearch) return false;

      if (filters.category && (hymn.category || '') !== filters.category) return false;
      if (filters.hasAudio === 'yes' && !hymn.audio) return false;
      if (filters.hasAudio === 'no' && !!hymn.audio) return false;

      const hasSheetMusic = Boolean(hymn.sheet_music && hymn.sheet_music.length > 0);
      if (filters.hasSheetMusic === 'yes' && !hasSheetMusic) return false;
      if (filters.hasSheetMusic === 'no' && hasSheetMusic) return false;

      return true;
    });
  };

  const filteredSda = applyHymnFilters(sdaHymns, (hymn, query, digits) => {
    const hymnNumber = getHymnNumber(hymn.id);
    return (
      hymn.newHymnalTitle.toLowerCase().includes(query) ||
      hymn.oldHymnalTitle.toLowerCase().includes(query) ||
      hymn.englishTitleOld.toLowerCase().includes(query) ||
      hymn.newHymnalLyrics.toLowerCase().includes(query) ||
      hymn.oldHymnalLyrics.toLowerCase().includes(query) ||
      hymn.id.toLowerCase().includes(query) ||
      (digits.length > 0 && hymnNumber.includes(digits))
    );
  });

  const filteredHagerigna = applyHymnFilters(hagerignaHymns, (hymn, query, digits) => {
    const hymnNumber = getHymnNumber(hymn.id);
    return (
      hymn.title.toLowerCase().includes(query) ||
      hymn.artist.toLowerCase().includes(query) ||
      hymn.song.toLowerCase().includes(query) ||
      hymn.id.toLowerCase().includes(query) ||
      (digits.length > 0 && hymnNumber.includes(digits))
    );
  });

  const filteredVideos = youtubeLinks.filter((link) => {
    const query = normalizeSearch(searchQuery);
    const digits = query.replace(/\D/g, '');
    if (!query) return true;
    return (
      (link.title || '').toLowerCase().includes(query) ||
      (link.channelTitle || '').toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query) ||
      (link.videoId || '').toLowerCase().includes(query) ||
      (digits.length > 0 && (link.videoId || '').includes(digits))
    );
  });

  const sortHymns = <T extends HagerignaHymn | SDAHymn>(
    hymns: T[],
    getTitle: (hymn: T) => string
  ) => {
    const sorted = [...hymns];

    if (sortOption === 'title-asc') {
      sorted.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
    } else if (sortOption === 'title-desc') {
      sorted.sort((a, b) => getTitle(b).localeCompare(getTitle(a)));
    } else if (sortOption === 'number-asc') {
      sorted.sort((a, b) => Number(getHymnNumber(a.id) || '999999') - Number(getHymnNumber(b.id) || '999999'));
    } else if (sortOption === 'number-desc') {
      sorted.sort((a, b) => Number(getHymnNumber(b.id) || '0') - Number(getHymnNumber(a.id) || '0'));
    }

    return sorted;
  };

  const sortedSda = sortHymns(filteredSda, (hymn) => hymn.newHymnalTitle);
  const sortedHagerigna = sortHymns(filteredHagerigna, (hymn) => hymn.title);

  const openDetail = (hymn: HagerignaHymn | SDAHymn, type: HymnalType) => {
    setDetailType(type);
    if (type === 'hagerigna') {
      setSelectedHagerignaHymn(hymn as HagerignaHymn);
      setSelectedSDAHymn(null);
    } else {
      setSelectedSDAHymn(hymn as SDAHymn);
      setSelectedHagerignaHymn(null);
    }
    setShowDetailModal(true);
  };

  const navButtonClass = (section: PublicSection) =>
    `inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 ${
      activeSection === section
        ? 'bg-white text-[#1a1712] shadow-[0_12px_40px_rgba(255,173,65,0.18)]'
        : 'bg-white/10 text-white hover:bg-white/20'
    }`;

  const PublicHymnCard = ({ hymn, type }: { hymn: HagerignaHymn | SDAHymn; type: HymnalType }) => {
    const title = type === 'hagerigna' ? (hymn as HagerignaHymn).title : (hymn as SDAHymn).newHymnalTitle;
    const subtitle = type === 'hagerigna' ? (hymn as HagerignaHymn).artist : (hymn as SDAHymn).englishTitleOld;
    const body = type === 'hagerigna' ? (hymn as HagerignaHymn).song : (hymn as SDAHymn).newHymnalLyrics;
    const hymnNumber = getHymnNumber(hymn.id);

    return (
      <article
        className="public-card group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ffb347] focus:ring-offset-2 focus:ring-offset-[#0b0908]"
        tabIndex={0}
        role="button"
        aria-label={`Open hymn ${title}`}
        onClick={() => openDetail(hymn, type)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail(hymn, type);
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {hymnNumber && (
                <span className="rounded-full bg-[#201713] px-3 py-1 text-xs font-semibold text-[#ffbf58]">
                  No. {hymnNumber}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f6ede1] px-3 py-1 text-xs font-semibold text-[#8d5d18]">
                <Star className="w-3.5 h-3.5" />
                {hymn.category || 'Sacred Collection'}
              </span>
            </div>
            <h3 className="text-3xl font-semibold tracking-tight text-[#fff4dd]">{title}</h3>
            {subtitle && <p className="text-lg text-[#d5c2b1]">{subtitle}</p>}
          </div>
          <div className="rounded-2xl bg-[#fff4dd] p-3 text-[#8d5d18]">
            <Music className="w-5 h-5" />
          </div>
        </div>

        <p className="mt-6 text-base leading-8 text-[#efe4d7]">
          {body.replace(/\\n/g, ' ').slice(0, 220)}
          {body.length > 220 ? '…' : ''}
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm font-medium text-[#2e2218]">
          <span className="rounded-full bg-[#f8f2e9] px-3 py-1.5">
            {hymn.audio ? 'Audio available' : 'Lyrics only'}
          </span>
          <span className="rounded-full bg-[#f8f2e9] px-3 py-1.5">
            {hymn.sheet_music?.length ? `${hymn.sheet_music.length} sheet pages` : 'No sheet music yet'}
          </span>
          <span className="rounded-full bg-[#f8f2e9] px-3 py-1.5">
            ID: {hymn.id}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openDetail(hymn, type);
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1c1712] px-5 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:translate-x-1"
        >
          Open Hymn
          <ArrowRight className="w-4 h-4" />
        </button>
      </article>
    );
  };

  const renderCollection = () => {
    if (activeSection === 'youtube') {
      return (
        <>
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search videos by title, channel, YouTube id, or link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#2f2622] bg-[#15110f] px-12 py-4 text-white placeholder:text-[#7e756d] focus:outline-none focus:ring-2 focus:ring-[#ffb347]"
            />
          </div>

          {loading ? (
            <div className="py-20 text-center text-[#b9aca0]">Loading worship videos…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVideos.map((link) => (
                <article
                  key={link.id}
                  className="overflow-hidden rounded-[24px] bg-[#120f0d] border border-[#2b231f] shadow-[0_16px_42px_rgba(0,0,0,0.24)] hover:-translate-y-1 transition-transform duration-300 focus-within:ring-2 focus-within:ring-[#ffb347]"
                >
                  {link.thumbnailUrl && (
                    <img src={link.thumbnailUrl} alt={link.title || 'YouTube thumbnail'} className="h-52 w-full object-cover" />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#ffb347]">
                      <Youtube className="w-4 h-4" />
                      Worship Video
                    </div>
                    <h4 className="mt-4 text-xl font-semibold text-white">
                      {link.title || `YouTube video ${link.videoId || ''}`}
                    </h4>
                    <p className="mt-2 text-sm text-[#b9aca0]">
                      {[link.channelTitle, link.duration].filter(Boolean).join(' · ') || `ID: ${link.videoId || 'N/A'}`}
                    </p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ffb347] px-4 py-3 text-sm font-semibold text-[#1a1712] transition hover:bg-[#ffc264]"
                    >
                      Watch on YouTube
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#b9aca0]">
            {activeSection === 'sda' ? `${sortedSda.length} hymns` : `${sortedHagerigna.length} hymns`}
          </div>
          <label className="relative inline-flex items-center">
            <span className="sr-only">Sort hymns</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="appearance-none rounded-2xl border border-[#2f2622] bg-[#15110f] px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ffb347]"
            >
              <option value="default">Default order</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="number-asc">Number low-high</option>
              <option value="number-desc">Number high-low</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 w-4 h-4 text-[#cdbfb4]" />
          </label>
        </div>

        <HymnFilters
          hymnLabel={activeSection === 'sda' ? 'SDA hymns' : 'Hagerigna hymns'}
          categories={categories}
          searchQuery={searchQuery}
          filters={filters}
          onSearchChange={setSearchQuery}
          onFilterChange={setFilters}
          onClear={() => {
            setSearchQuery('');
            setFilters(defaultFilters);
          }}
        />

        {loading ? (
          <div className="py-20 text-center text-[#b9aca0]">Loading hymns…</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {(activeSection === 'sda' ? sortedSda : sortedHagerigna).map((hymn) => (
              <PublicHymnCard
                key={hymn.id}
                hymn={hymn}
                type={activeSection === 'sda' ? 'sda' : 'hagerigna'}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b0908] text-white overflow-x-hidden">
      <div className="public-aurora" />
      <div className="public-grain" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0d0c]/72 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <button onClick={() => setActiveSection('home')} className="flex items-center gap-4 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffcf70] to-[#ffb347] text-[#1d150f] shadow-lg shadow-[#ffb347]/25">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#c4b7a8]">Wudassie Hymnal</p>
              <h1 className="text-lg md:text-xl font-semibold text-white">Seventh-day Adventist Worship Archive</h1>
            </div>
          </button>

          <nav className="flex flex-wrap items-center gap-2">
            <button onClick={() => setActiveSection('home')} className={navButtonClass('home')}>
              <Home className="w-4 h-4" />
              Home
            </button>
            <button onClick={() => setActiveSection('sda')} className={navButtonClass('sda')}>
              <BookOpen className="w-4 h-4" />
              SDA Hymnal
            </button>
            <button onClick={() => setActiveSection('hagerigna')} className={navButtonClass('hagerigna')}>
              <Music className="w-4 h-4" />
              Hagerigna
            </button>
            <button onClick={() => setActiveSection('youtube')} className={navButtonClass('youtube')}>
              <Youtube className="w-4 h-4" />
              Videos
            </button>
            <button
              onClick={onAdminLogin}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffb347] px-5 py-3 text-sm font-semibold text-[#1a1712] shadow-lg shadow-[#ffb347]/20 transition hover:-translate-y-0.5"
            >
              <LogIn className="w-4 h-4" />
              Admin Login
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {activeSection === 'home' ? (
          <>
            <section className="max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-12">
              <div className="home-shell">
                <div className="home-shell__outline" />
                <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center relative z-10">
                  <div className="reveal-up">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#ffb347]/35 bg-[#ffb347]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#ffd895]">
                      Sabbath Morning Atmosphere
                    </div>
                    <h2 className="mt-8 text-5xl md:text-7xl font-semibold leading-[0.94] text-white">
                      A living home for
                      <span className="block text-[#ffb347]"> hymns, praise,</span>
                      and worship memory.
                    </h2>
                    <p className="mt-7 max-w-2xl text-lg md:text-xl leading-8 text-[#d4c6bb]">
                      A public archive shaped around Seventh-day Adventist worship culture: sacred song, reverent design,
                      full hymn reading, audio, sheet music, and devotional video.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <button
                        onClick={() => setActiveSection('sda')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#ffb347] px-6 py-4 text-sm font-semibold text-[#1a1712] shadow-[0_16px_40px_rgba(255,179,71,0.3)] transition hover:-translate-y-1"
                      >
                        Explore Hymns
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveSection('youtube')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Watch Worship Videos
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="glass-stat glass-stat--dark">
                        <span className="text-3xl font-semibold text-white">{sdaHymns.length}</span>
                        <span className="text-sm text-[#cdbfb4]">SDA hymns</span>
                      </div>
                      <div className="glass-stat glass-stat--dark">
                        <span className="text-3xl font-semibold text-white">{hagerignaHymns.length}</span>
                        <span className="text-sm text-[#cdbfb4]">Hagerigna songs</span>
                      </div>
                      <div className="glass-stat glass-stat--dark">
                        <span className="text-3xl font-semibold text-white">{youtubeLinks.length}</span>
                        <span className="text-sm text-[#cdbfb4]">YouTube links</span>
                      </div>
                    </div>
                  </div>

                  <div className="reveal-up relative">
                    <div className="instrument-stage">
                      <div className="instrument-glow instrument-glow--amber" />
                      <div className="instrument-glow instrument-glow--plum" />
                      <div className="instrument-orbit instrument-orbit--one" />
                      <div className="instrument-orbit instrument-orbit--two" />
                      <div className="hero-note hero-note--one">♪</div>
                      <div className="hero-note hero-note--two">♫</div>
                      <div className="hero-note hero-note--three">♩</div>
                      <div className="guitar-illustration">
                        <div className="guitar-head" />
                        <div className="guitar-neck" />
                        <div className="guitar-body">
                          <div className="guitar-ring" />
                          <div className="guitar-bridge" />
                          <div className="guitar-pickguard" />
                        </div>
                        <div className="guitar-string guitar-string--1" />
                        <div className="guitar-string guitar-string--2" />
                        <div className="guitar-string guitar-string--3" />
                        <div className="guitar-string guitar-string--4" />
                        <div className="guitar-string guitar-string--5" />
                        <div className="guitar-string guitar-string--6" />
                      </div>

                      <div className="piano-panel">
                        <div className="piano-label">
                          <Sparkles className="w-4 h-4 text-[#ffb347]" />
                          Curated Worship Experience
                        </div>
                        <div className="piano-keys">
                          {Array.from({ length: 10 }).map((_, index) => (
                            <div key={index} className="piano-key">
                              {index !== 0 && index !== 3 && index !== 7 && index !== 9 && (
                                <span className="piano-key__black" />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-4 mt-6">
                          <div className="hero-feature-card">
                            <BookOpen className="w-5 h-5 text-[#ffb347]" />
                            <div>
                              <h4 className="font-semibold text-white">Full hymn reading</h4>
                              <p className="text-sm text-[#d0c3b8]">Open full lyrics, scan sheet music, and move through the archive with clarity.</p>
                            </div>
                          </div>
                          <div className="hero-feature-card">
                            <Headphones className="w-5 h-5 text-[#ff9bd2]" />
                            <div>
                              <h4 className="font-semibold text-white">Audio and praise resources</h4>
                              <p className="text-sm text-[#d0c3b8]">See instantly which hymns include audio and worship material.</p>
                            </div>
                          </div>
                          <div className="hero-feature-card">
                            <Youtube className="w-5 h-5 text-[#8dd5c0]" />
                            <div>
                              <h4 className="font-semibold text-white">Video devotion archive</h4>
                              <p className="text-sm text-[#d0c3b8]">Open worship videos directly, with thumbnails and metadata already prepared.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
              <div className="grid md:grid-cols-3 gap-6">
                <article className="offer-card">
                  <BookOpen className="w-6 h-6 text-[#ffb347]" />
                  <h3>Browse sacred hymn collections</h3>
                  <p>Move between SDA hymns and Hagerigna songs with fast search, filters, and full reading mode.</p>
                </article>
                <article className="offer-card">
                  <Headphones className="w-6 h-6 text-[#ff9bd2]" />
                  <h3>Open lyrics, audio, and sheet music</h3>
                  <p>Each hymn can present its words, attached audio, and available music pages in one focused detail view.</p>
                </article>
                <article className="offer-card">
                  <Youtube className="w-6 h-6 text-[#8dd5c0]" />
                  <h3>Follow worship videos and devotionals</h3>
                  <p>See saved YouTube worship resources as direct cards with thumbnails, channels, and quick open actions.</p>
                </article>
              </div>
            </section>
          </>
        ) : (
          <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-14">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.28em] text-[#c2b2a2]">
                {activeSection === 'youtube' ? 'Worship Video Archive' : 'Public Hymn Library'}
              </p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-4xl md:text-5xl font-semibold text-white">
                    {activeSection === 'sda'
                      ? 'SDA Hymnal'
                      : activeSection === 'hagerigna'
                        ? 'Hagerigna'
                        : 'YouTube Worship Links'}
                  </h2>
                  <p className="mt-3 text-[#cdbfb4]">
                    {activeSection === 'youtube'
                      ? 'Search by title, channel, video id, or direct YouTube link.'
                      : 'Search by title, artist, lyrics, hymn number, or record id.'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection('home')}
                  className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Back Home
                </button>
              </div>
            </div>

            {renderCollection()}
          </section>
        )}
      </main>

      <HymnDetailModal
        isOpen={showDetailModal}
        hymn={detailType === 'hagerigna' ? selectedHagerignaHymn : selectedSDAHymn}
        type={detailType}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedHagerignaHymn(null);
          setSelectedSDAHymn(null);
        }}
      />
    </div>
  );
};

export default PublicLandingPage;
