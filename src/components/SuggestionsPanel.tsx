import React from 'react';
import { CheckCircle2, Inbox } from 'lucide-react';
import { HymnEditSuggestion } from '../types/Song';

interface SuggestionsPanelProps {
  suggestions: HymnEditSuggestion[];
  loading: boolean;
  applyingId: string | null;
  onApply: (suggestion: HymnEditSuggestion) => void;
}

const labels: Record<string, string> = {
  title: 'Title',
  artist: 'Artist',
  song: 'Song Text',
  albumName: 'Album Name',
  choirName: 'Singer/Choir Name',
  newHymnalTitle: 'Hymnal Title',
  oldHymnalTitle: 'Old Hymnal Title',
  newHymnalLyrics: 'Hymnal Lyrics',
  englishTitleOld: 'English Title',
  oldHymnalLyrics: 'Old Hymnal Lyrics',
  category: 'Category',
  audio: 'Audio URL',
  sheet_music: 'Sheet Music URLs',
};

const formatValue = (value: unknown) => {
  if (Array.isArray(value)) return value.join('\n');
  if (value === undefined || value === null || value === '') return 'Empty';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value).replace(/\\n/g, '\n');
};

const getChangedFields = (suggestion: HymnEditSuggestion) =>
  Object.keys(suggestion.requestedData || {}).filter((field) => {
    const before = formatValue(suggestion.originalData?.[field as keyof typeof suggestion.originalData]);
    const after = formatValue(suggestion.requestedData?.[field as keyof typeof suggestion.requestedData]);
    return before !== after;
  });

const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  suggestions,
  loading,
  applyingId,
  onApply,
}) => {
  if (loading) {
    return (
      <div className="admin-panel rounded-2xl p-8 text-center text-slate-600">
        Loading suggestions...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="admin-panel rounded-2xl p-10 text-center">
        <Inbox className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-slate-950">No suggestions yet</h2>
        <p className="text-slate-500 mt-2">User edit suggestions will appear here after they are submitted.</p>
      </div>
    );
  }

  return (
    <div className="admin-panel rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Suggestions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Review requested changes before applying them to the live hymnal record.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
          {suggestions.filter((suggestion) => suggestion.status === 'pending').length} pending
        </span>
      </div>

      {suggestions.map((suggestion) => {
        const changedFields = getChangedFields(suggestion);
        const isApplied = suggestion.status === 'applied';

        return (
          <article key={suggestion.id} className="border border-slate-200 rounded-xl bg-white p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {suggestion.hymnalType}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isApplied
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {suggestion.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-950 mt-3">{suggestion.hymnTitle || suggestion.hymnId}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {suggestion.submitterName || suggestion.submitterEmail
                    ? `From ${[suggestion.submitterName, suggestion.submitterEmail].filter(Boolean).join(' - ')}`
                    : 'Anonymous suggestion'}
                  {suggestion.createdAt ? ` - ${new Date(suggestion.createdAt).toLocaleString()}` : ''}
                </p>
                {suggestion.note && <p className="text-sm text-slate-700 mt-3">{suggestion.note}</p>}
              </div>

              <button
                type="button"
                onClick={() => onApply(suggestion)}
                disabled={isApplied || applyingId === suggestion.id}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" />
                {applyingId === suggestion.id ? 'Applying...' : isApplied ? 'Applied' : 'Apply Update'}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {changedFields.length === 0 ? (
                <p className="text-sm text-slate-500">No field differences were detected.</p>
              ) : (
                changedFields.map((field) => (
                  <div key={field} className="grid grid-cols-1 lg:grid-cols-[180px_1fr_1fr] gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="text-sm font-semibold text-slate-700">{labels[field] || field}</div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-700 font-semibold mb-1">Current</p>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700 bg-white border border-red-100 rounded-lg p-3 max-h-56 overflow-auto">
                        {formatValue(suggestion.originalData?.[field as keyof typeof suggestion.originalData])}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">Requested</p>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-900 bg-white border border-emerald-100 rounded-lg p-3 max-h-56 overflow-auto">
                        {formatValue(suggestion.requestedData?.[field as keyof typeof suggestion.requestedData])}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default SuggestionsPanel;
