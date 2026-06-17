import React, { useState } from 'react';
import { ShieldPlus, Trash2, UserCog } from 'lucide-react';
import { ManagedUser } from '../types/Song';

interface EncoderManagementPanelProps {
  users: ManagedUser[];
  loading: boolean;
  creating: boolean;
  deletingUserId: string | null;
  onCreate: (payload: { name?: string; email: string; password: string }) => Promise<void>;
  onDelete: (user: ManagedUser) => Promise<void>;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const EncoderManagementPanel: React.FC<EncoderManagementPanelProps> = ({
  users,
  loading,
  creating,
  deletingUserId,
  onCreate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const encoders = users.filter((user) => user.role === 'encoder');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      await onCreate({ name: name.trim(), email: email.trim(), password });
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create encoder');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
            <ShieldPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Encoder Accounts</h2>
            <p className="text-sm text-gray-500">Only admins can create or remove encoder accounts.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional display name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="encoder@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-500">Encoder accounts can add, edit, and delete hymns, but they cannot manage other users.</div>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Create Encoder'}
            </button>
          </div>
          {error && (
            <div className="md:col-span-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      </section>

      <section className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <UserCog className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Existing Encoders</h3>
            <p className="text-sm text-gray-500">{encoders.length} encoder account{encoders.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-500">Loading encoder accounts…</div>
        ) : encoders.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-500">No encoder accounts have been created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200">
                {encoders.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.name || 'Not set'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onDelete(user)}
                        disabled={deletingUserId === user.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingUserId === user.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default EncoderManagementPanel;
