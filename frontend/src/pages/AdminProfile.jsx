import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminProfile = () => {
  const { user, updateProfile, updateAvatar, refreshUser } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [creds, setCreds] = useState({ email: '', currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      const [fn, ln] = (user.name || '').split(' ');
      setForm({ firstName: user.firstName || fn || '', lastName: user.lastName || ln || '', email: user.email || '' });
      setCreds(c => ({ ...c, email: user.email || '' }));
    }
  }, [user]);

  if (!user || user.userType !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center text-xl text-red-600">Admin access required.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Profile</h1>
          <button
            type="button"
            onClick={() => setShowCredsModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Edit Credentials
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 text-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-28 h-28 rounded-full mx-auto mb-4 object-cover" />
            ) : (
              <div className="w-28 h-28 rounded-full mx-auto mb-4 bg-blue-600 text-white flex items-center justify-center text-3xl font-bold">
                {(user?.name?.trim?.()?.[0] || user?.email?.trim?.()?.[0] || 'A').toUpperCase()}
              </div>
            )}
            <div>
              <input id="admin-avatar" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setAvatarUploading(true);
                  await updateAvatar(f, true);
                  toast.success('Avatar updated');
                } catch (err) { toast.error(err.message); }
                finally { setAvatarUploading(false); }
              }} />
              <button onClick={() => document.getElementById('admin-avatar').click()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" disabled={avatarUploading}>
                {avatarUploading ? 'Uploading...' : 'Change Avatar'}
              </button>
            </div>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input type="password" value={passwords.password} onChange={e => setPasswords({ ...passwords, password: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div className="text-right">
              <button onClick={async () => {
                try {
                  if (passwords.password && passwords.password !== passwords.confirmPassword) {
                    toast.error('Passwords do not match');
                    return;
                  }
                  await updateProfile({
                    firstName: form.firstName,
                    lastName: form.lastName,
                    email: form.email,
                    ...(passwords.password ? { currentPassword: passwords.currentPassword, password: passwords.password } : {})
                  });
                  setPasswords({ currentPassword: '', password: '', confirmPassword: '' });
                  toast.success('Profile updated');
                } catch (e) { toast.error(e.message); }
              }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials Modal */}
      {showCredsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Edit Admin Credentials</h2>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowCredsModal(false)}>×</button>
              </div>
              <p className="text-sm text-gray-600 mt-1">Change admin email and/or password. You will stay signed in.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={creds.email}
                  onChange={e => setCreds({ ...creds, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@example.com"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={creds.currentPassword}
                    onChange={e => setCreds({ ...creds, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={creds.newPassword}
                    onChange={e => setCreds({ ...creds, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="New secure password"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={creds.confirmPassword}
                    onChange={e => setCreds({ ...creds, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex items-center justify-end gap-2">
              <button className="px-4 py-2 border rounded-lg" onClick={() => setShowCredsModal(false)}>Cancel</button>
              <button
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                onClick={async () => {
                  try {
                    if (creds.newPassword && creds.newPassword !== creds.confirmPassword) {
                      toast.error('Passwords do not match');
                      return;
                    }
                    const res = await fetch(`${API_URL}/api/admin/me/credentials`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        email: creds.email,
                        currentPassword: creds.currentPassword || undefined,
                        newPassword: creds.newPassword || undefined
                      })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Failed to update credentials');
                    await refreshUser();
                    toast.success('Credentials updated');
                    setShowCredsModal(false);
                    setCreds({ email: data.user?.email || creds.email, currentPassword: '', newPassword: '', confirmPassword: '' });
                  } catch (e) {
                    toast.error(e.message);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;

