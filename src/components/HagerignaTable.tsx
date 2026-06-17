import React from 'react';
import { Edit, Eye, Trash2 } from 'lucide-react';
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
      <table className="w-full">
        <thead className="bg-gray-50/80 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Artist
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Song
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            {showAudit && (
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Added By
              </th>
            )}
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white/50 divide-y divide-gray-200">
          {hymns.map((hymn) => (
            <tr key={hymn.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <button onClick={() => onView(hymn)} className="text-sm font-medium text-gray-900 hover:text-green-700 text-left">
                  {hymn.artist}
                </button>
              </td>
              <td className="px-6 py-4">
                <button onClick={() => onView(hymn)} className="text-sm text-gray-900 max-w-xs truncate text-left hover:text-green-700">
                  {hymn.song}
                </button>
              </td>
              <td className="px-6 py-4">
                <button onClick={() => onView(hymn)} className="text-sm text-gray-900 max-w-xs truncate text-left hover:text-green-700">
                  {hymn.title}
                </button>
              </td>
              {showAudit && (
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{hymn.createdBy?.email || 'Legacy entry'}</div>
                  <div className="text-xs text-gray-500">
                    Updated by {hymn.updatedBy?.email || hymn.createdBy?.email || 'Unknown'}
                  </div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onView(hymn)}
                    className="text-emerald-600 hover:text-emerald-900 p-2 rounded-lg hover:bg-emerald-50 transition-colors"
                    title="View hymn details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(hymn)}
                    className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit hymn"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(hymn)}
                    className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
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
