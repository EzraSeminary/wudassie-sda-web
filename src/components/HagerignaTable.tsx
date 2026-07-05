import React from 'react';
import { Disc3, Edit, Eye, Music2, Trash2 } from 'lucide-react';
import { HagerignaHymn } from '../types/Song';

interface HagerignaTableProps {
  hymns: HagerignaHymn[];
  showAudit?: boolean;
  onView: (hymn: HagerignaHymn) => void;
  onEdit: (hymn: HagerignaHymn) => void;
  onDelete: (hymn: HagerignaHymn) => void;
}

const HagerignaTable: React.FC<HagerignaTableProps> = ({ hymns, showAudit = false, onView, onEdit, onDelete }) => {
  // console.log('HagerignaTable received hymns:', hymns.length, hymns.slice(0, 2));
  
  return (
    <div className="overflow-x-auto">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>
              Artist
            </th>
            <th>
              Song
            </th>
            <th>
              Title
            </th>
            {showAudit && (
              <th>
                Added By
              </th>
            )}
            <th className="text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {hymns.map((hymn) => (
            <tr key={hymn.id}>
              <td className="whitespace-nowrap">
                <button onClick={() => onView(hymn)} className="text-sm font-semibold text-slate-950 hover:text-teal-700 text-left">
                  {hymn.isAlbum ? (
                    <span className="inline-flex items-center gap-2">
                      <Disc3 className="w-4 h-4 text-teal-600" />
                      {hymn.choirName || hymn.artist}
                    </span>
                  ) : (
                    hymn.artist
                  )}
                </button>
              </td>
              <td>
                <button onClick={() => onView(hymn)} className="text-sm text-slate-700 max-w-xs truncate text-left hover:text-teal-700">
                  {hymn.isAlbum ? (
                    <span className="inline-flex items-center gap-2">
                      <Music2 className="w-4 h-4 text-slate-500" />
                      {hymn.tracks?.length || hymn.trackCount || 0} tracks
                    </span>
                  ) : (
                    hymn.song
                  )}
                </button>
              </td>
              <td>
                <button onClick={() => onView(hymn)} className="text-sm text-slate-900 max-w-xs truncate text-left hover:text-teal-700">
                  {hymn.isAlbum ? hymn.albumName || hymn.title : hymn.title}
                </button>
              </td>
              {showAudit && (
                <td>
                  <div className="text-sm text-slate-900">{hymn.createdBy?.email || 'Legacy entry'}</div>
                  <div className="text-xs text-slate-500">
                    Updated by {hymn.updatedBy?.email || hymn.createdBy?.email || 'Unknown'}
                  </div>
                </td>
              )}
              <td className="whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onView(hymn)}
                    className="admin-action-button"
                    title="View hymn details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(hymn)}
                    className="admin-action-button"
                    title="Edit hymn"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(hymn)}
                    className="admin-action-button admin-danger-button"
                    title="Delete hymn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HagerignaTable; 
