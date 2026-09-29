import React from 'react';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { SDAHymn } from '../types/Song';

interface SDATableProps {
  hymns: SDAHymn[];
  showAudit?: boolean;
  onView: (hymn: SDAHymn) => void;
  onEdit: (hymn: SDAHymn) => void;
  onDelete: (hymn: SDAHymn) => void;
}

const SDATable: React.FC<SDATableProps> = ({ hymns, showAudit = false, onView, onEdit, onDelete }) => {
  // console.log('SDATable received hymns:', hymns.length, hymns.slice(0, 2));
  
  const formatLyrics = (lyrics: string) => {
    return lyrics.replace(/\\n/g, '\n');
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    const formatted = formatLyrics(text);
    if (formatted.length <= maxLength) return formatted;
    return formatted.substring(0, maxLength) + '...';
  };

  return (
    <div className="overflow-x-auto">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th className="w-16">
              #
            </th>
            <th>
              Hymnal Title
            </th>
            <th>
              English Title
            </th>
            <th>
              Lyrics Preview
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
          {hymns.map((hymn, index) => (
            <tr key={hymn.id}>
              <td className="whitespace-nowrap text-sm font-semibold text-slate-500 tabular-nums">
                {index + 1}
              </td>
              <td className="whitespace-nowrap">
                <button onClick={() => onView(hymn)} className="text-sm font-semibold text-slate-950 max-w-xs truncate text-left hover:text-teal-700">
                  {hymn.newHymnalTitle}
                </button>
              </td>
              <td className="whitespace-nowrap">
                <button onClick={() => onView(hymn)} className="text-sm text-slate-700 max-w-xs truncate text-left hover:text-teal-700">
                  {hymn.englishTitleOld}
                </button>
              </td>
              <td>
                <button onClick={() => onView(hymn)} className="text-sm text-slate-700 max-w-xs text-left hover:text-teal-700">
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-5">
                    {truncateText(hymn.newHymnalLyrics)}
                  </pre>
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

export default SDATable; 
