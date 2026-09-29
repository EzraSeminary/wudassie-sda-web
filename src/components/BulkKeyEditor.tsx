import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { HagerignaHymn, SDAHymn } from '../types/Song';
import { HymnKeyUpdate } from '../services/hymnalService';

const SCALE_OPTIONS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];

type KeyRow = {
  rowId: string;
  type: HymnKeyUpdate['type'];
  id: string;
  parentId?: string;
  number: string;
  collection: string;
  title: string;
  subtitle: string;
  currentKey: string;
};

interface BulkKeyEditorProps {
  sdaHymns: SDAHymn[];
  hagerignaHymns: HagerignaHymn[];
  saving: boolean;
  onSave: (updates: HymnKeyUpdate[]) => Promise<void>;
}

const getHymnNumber = (id: string) => {
  const match = String(id || '').match(/^(?:sda|hagerigna)-(\d+)/i) || String(id || '').match(/(\d+)$/);
  return match ? match[1] : '';
};

const BulkKeyEditor: React.FC<BulkKeyEditorProps> = ({ sdaHymns, hagerignaHymns, saving, onSave }) => {
  const rows = useMemo<KeyRow[]>(() => {
    const sdaRows = sdaHymns.map((hymn) => ({
      rowId: `sda:${hymn.id}`,
      type: 'sda' as const,
      id: hymn.id,
      number: getHymnNumber(hymn.id),
      collection: 'SDA',
      title: hymn.newHymnalTitle,
      subtitle: hymn.englishTitleOld,
      currentKey: hymn.key || '',
    }));

    const hagerignaRows = hagerignaHymns.flatMap((hymn) => {
      if (hymn.isAlbum && hymn.tracks?.length) {
        return hymn.tracks.map((track) => ({
          rowId: `hagerignaTrack:${hymn.id}:${track.id || track.trackNumber}`,
          type: 'hagerignaTrack' as const,
          id: String(track.id || track.trackNumber),
          parentId: hymn.id,
          number: `${getHymnNumber(hymn.id)}.${track.trackNumber}`,
          collection: 'Hagerigna',
          title: track.title,
          subtitle: hymn.albumName || hymn.title || hymn.choirName || hymn.artist,
          currentKey: track.key || '',
        }));
      }

      return [{
        rowId: `hagerigna:${hymn.id}`,
        type: 'hagerigna' as const,
        id: hymn.id,
        number: getHymnNumber(hymn.id),
        collection: 'Hagerigna',
        title: hymn.title,
        subtitle: hymn.artist,
        currentKey: hymn.key || '',
      }];
    });

    return [...sdaRows, ...hagerignaRows];
  }, [sdaHymns, hagerignaHymns]);

  const [keyByRowId, setKeyByRowId] = useState<Record<string, string>>({});

  useEffect(() => {
    setKeyByRowId(Object.fromEntries(rows.map((row) => [row.rowId, row.currentKey])));
  }, [rows]);

  const changedCount = rows.filter((row) => (keyByRowId[row.rowId] || '') !== row.currentKey).length;

  const handleSubmit = async () => {
    const updates = rows.map((row) => ({
      type: row.type,
      id: row.id,
      parentId: row.parentId,
      key: keyByRowId[row.rowId] || '',
    }));
    await onSave(updates);
  };

  const SaveButton = () => (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={saving || rows.length === 0}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save className="w-4 h-4" />
      {saving ? 'Saving...' : 'Save All Keys'}
    </button>
  );

  return (
    <div className="admin-panel rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Bulk Key Editor</h2>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} songs listed in hymn number order
            {changedCount > 0 ? ` • ${changedCount} changed` : ''}
          </p>
        </div>
        <SaveButton />
      </div>

      <div className="overflow-x-auto">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th className="w-24">No.</th>
              <th>Collection</th>
              <th>Song</th>
              <th>Reference</th>
              <th className="w-56">Key</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowId}>
                <td className="whitespace-nowrap text-sm font-semibold text-slate-600 tabular-nums">
                  {row.number || '-'}
                </td>
                <td className="whitespace-nowrap text-sm font-medium text-slate-700">{row.collection}</td>
                <td>
                  <div className="max-w-md truncate text-sm font-semibold text-slate-950">{row.title || 'Untitled'}</div>
                  {row.subtitle && <div className="max-w-md truncate text-xs text-slate-500">{row.subtitle}</div>}
                </td>
                <td className="whitespace-nowrap text-xs text-slate-500">{row.id}</td>
                <td>
                  <select
                    value={keyByRowId[row.rowId] || ''}
                    onChange={(event) =>
                      setKeyByRowId((prev) => ({ ...prev, [row.rowId]: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select a key</option>
                    {SCALE_OPTIONS.map((scale) => (
                      <option key={scale} value={scale}>{scale}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-slate-200 px-6 py-5">
        <SaveButton />
      </div>
    </div>
  );
};

export default BulkKeyEditor;
