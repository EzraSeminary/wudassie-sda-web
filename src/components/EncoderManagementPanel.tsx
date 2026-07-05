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
      <section className="admin-panel rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20">
            <ShieldPlus className="w-6 h-6" />
          </div>
          <div>
            <p className="admin-kicker">Access Control</p>
            <h2 className="text-xl font-semibold text-slate-950">Encoder Accounts</h2>
            <p className="text-sm text-slate-500">Only admins can create or remove encoder accounts.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional display name"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="encoder@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-slate-500">Encoder accounts can add, edit, and delete hymns, but they cannot manage other users.</div>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
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

      <section className="admin-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
          <UserCog className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Existing Encoders</h3>
            <p className="text-sm text-slate-500">{encoders.length} encoder account{encoders.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading encoder accounts…</div>
        ) : encoders.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">No encoder accounts have been created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {encoders.map((user) => (
                  <tr key={user.id}>
                    <td className="text-sm text-slate-950">{user.name || 'Not set'}</td>
                    <td className="text-sm text-slate-700">{user.email}</td>
                    <td className="text-sm text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="text-right">
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
