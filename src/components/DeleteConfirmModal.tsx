import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Modal from './ui/Modal';
import { HagerignaHymn, SDAHymn } from '../types/Song';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: HagerignaHymn | SDAHymn | null;
  itemType: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  itemType,
  onClose,
  onConfirm,
}) => {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="admin-panel rounded-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete {itemType}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this {itemType.toLowerCase()}? This action cannot be undone.
            </p>
            
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              {'title' in item ? (
                <>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.isAlbum ? item.albumName || item.title : item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    by {item.isAlbum ? item.choirName || item.artist : item.artist}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {item.isAlbum ? `${item.tracks?.length || item.trackCount || 0} tracks` : item.song}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.newHymnalTitle}</h3>
                  <p className="text-gray-600 text-sm">{item.oldHymnalTitle}</p>
                  <p className="text-gray-500 text-sm">{item.englishTitleOld}</p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
            >
              Delete {itemType}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
