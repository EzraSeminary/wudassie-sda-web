import React from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Category } from '../types/Song';

export interface HymnFilterState {
  category: string;
  hasAudio: 'all' | 'yes' | 'no';
  hasSheetMusic: 'all' | 'yes' | 'no';
}

interface HymnFiltersProps {
  hymnLabel: string;
  categories: Category[];
  searchQuery: string;
  filters: HymnFilterState;
  onSearchChange: (value: string) => void;
  onFilterChange: (filters: HymnFilterState) => void;
  onClear: () => void;
}

const HymnFilters: React.FC<HymnFiltersProps> = ({
  hymnLabel,
  categories,
  searchQuery,
  filters,
  onSearchChange,
  onFilterChange,
  onClear,
}) => {
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    filters.category !== '' ||
    filters.hasAudio !== 'all' ||
    filters.hasSheetMusic !== 'all';

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
      <div className="flex flex-col gap-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${hymnLabel} by title, lyrics, artist, number, or id...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">Category</span>
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">Audio</span>
            <select
              value={filters.hasAudio}
              onChange={(e) => onFilterChange({ ...filters, hasAudio: e.target.value as HymnFilterState['hasAudio'] })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All hymns</option>
              <option value="yes">Has audio</option>
              <option value="no">No audio</option>
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">Sheet Music</span>
            <select
              value={filters.hasSheetMusic}
              onChange={(e) =>
                onFilterChange({ ...filters, hasSheetMusic: e.target.value as HymnFilterState['hasSheetMusic'] })
              }
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All hymns</option>
              <option value="yes">Has sheet music</option>
              <option value="no">No sheet music</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
};

export default HymnFilters;
