import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaPlus, FaSearch, FaUser, FaUsers, FaShieldAlt, FaTrash, FaEdit, FaImage, FaIdCard } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const defaultPrivileges = {
  canViewProperties: true,
  canEditProperties: false,
  canDeleteProperties: false,
  canCreateProperties: false,
  canViewBookings: true,
  canConfirmBookings: false,
  canCancelBookings: false,
  canModifyBookings: false,
  canViewRevenue: false,
  canViewReports: false,
  canProcessPayments: false,
  canMessageGuests: true,
  canViewGuestInfo: true,
  canScheduleMaintenance: false,
  canUpdatePropertyStatus: false,
  canManageInventory: false,
  canViewAnalytics: false,
  canManageOtherWorkers: false,
};

function useWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '', status: '', department: '' });
  const [meta, setMeta] = useState({ totalPages: 0, currentPage: 1, total: 0 });

  const fetchWorkers = async (overrides = {}) => {
    try {
      setLoading(true);
      const qp = new URLSearchParams({ ...query, ...overrides });
      const res = await fetch(`${API_URL}/api/workers?${qp.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch workers');
      setWorkers(data.workers || []);
      setMeta({ totalPages: data.totalPages || 0, currentPage: Number(data.currentPage || 1), total: data.total || 0 });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); /* eslint-disable-next-line */ }, [query.page, query.limit]);

  return { workers, loading, query, setQuery, meta, fetchWorkers, setWorkers };
}

export default function WorkersManagement() {
  const { workers, loading, query, setQuery, meta, fetchWorkers, setWorkers } = useWorkers();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    position: '',
    department: 'General',
    salary: { amount: 0, currency: 'RWF', paymentFrequency: 'monthly' },
    privileges: { ...defaultPrivileges },
    assignedProperties: [],
    address: {},
    emergencyContact: {},
    avatarFile: null,
  });
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);

  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\+/g, '/');
    if (s.startsWith('http')) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  const resetForm = () => setForm({
    firstName: '', lastName: '', email: '', phone: '', nationalId: '', position: '', department: 'General',
    salary: { amount: 0, currency: 'RWF', paymentFrequency: 'monthly' }, privileges: { ...defaultPrivileges },
    assignedProperties: [], address: {}, emergencyContact: {}
  });

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('firstName', form.firstName);
      fd.append('lastName', form.lastName);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('nationalId', form.nationalId);
      fd.append('position', form.position);
      fd.append('department', form.department);
      fd.append('salary', JSON.stringify(form.salary));
      fd.append('privileges', JSON.stringify(form.privileges));
      fd.append('assignedProperties', JSON.stringify(form.assignedProperties));
      fd.append('address', JSON.stringify(form.address));
      fd.append('emergencyContact', JSON.stringify(form.emergencyContact));
      if (form.avatarFile) fd.append('avatar', form.avatarFile);

      const res = await fetch(`${API_URL}/api/workers`, {
        method: 'POST', credentials: 'include', body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create worker');
      toast.success('Worker created');
      setWorkers((prev) => [data.worker, ...prev]);
      setShowForm(false);
      resetForm();
      if (avatarPreviewUrl) { URL.revokeObjectURL(avatarPreviewUrl); setAvatarPreviewUrl(null); }
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const onAvatarUpload = async (workerId, file) => {
    if (!file) return;
    try {
      setAvatarUploading(true);
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`${API_URL}/api/workers/${workerId}/avatar`, { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload avatar');
      setWorkers((prev) => prev.map(w => w._id === workerId ? { ...w, avatar: data.avatarUrl } : w));
      toast.success('Avatar updated');
    } catch (e) { toast.error(e.message); } finally { setAvatarUploading(false); }
  };

  const onUpdatePrivileges = async (workerId, privileges) => {
    try {
      const res = await fetch(`${API_URL}/api/workers/${workerId}/privileges`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privileges })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update privileges');
      setWorkers((prev) => prev.map(w => w._id === workerId ? { ...w, privileges: data.worker.privileges } : w));
      toast.success('Privileges updated');
    } catch (e) { toast.error(e.message); }
  };

  const filtered = useMemo(() => {
    const t = (query.search || '').toLowerCase();
    if (!t) return workers;
    return workers.filter(w => (
      (w.firstName || '').toLowerCase().includes(t) ||
      (w.lastName || '').toLowerCase().includes(t) ||
      (w.email || '').toLowerCase().includes(t) ||
      (w.employeeId || '').toLowerCase().includes(t)
    ));
  }, [workers, query.search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FaUsers /> Workers</h1>
        <button onClick={() => setShowForm(s => !s)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <FaPlus /> Add Worker
        </button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="bg-white rounded-xl shadow p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setForm(f => ({ ...f, avatarFile: file }));
                if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                setAvatarPreviewUrl(file ? URL.createObjectURL(file) : null);
              }}
              className="w-full border rounded-lg px-3 py-2"
            />
            {avatarPreviewUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img src={avatarPreviewUrl} alt="preview" className="w-20 h-20 rounded-full object-cover border" />
                <button type="button" className="px-3 py-1 border rounded" onClick={() => {
                  setForm(f => ({ ...f, avatarFile: null }));
                  URL.revokeObjectURL(avatarPreviewUrl);
                  setAvatarPreviewUrl(null);
                }}>Remove</button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
            <input value={form.nationalId} onChange={e => setForm(f => ({ ...f, nationalId: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
              <input type="number" min={0} value={form.salary.amount} onChange={e => setForm(f => ({ ...f, salary: { ...f.salary, amount: Number(e.target.value) } }))} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input value={form.salary.currency} onChange={e => setForm(f => ({ ...f, salary: { ...f.salary, currency: e.target.value } }))} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select value={form.salary.paymentFrequency} onChange={e => setForm(f => ({ ...f, salary: { ...f.salary, paymentFrequency: e.target.value } }))} className="w-full border rounded-lg px-3 py-2">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2"><FaShieldAlt /> Privileges</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.keys(defaultPrivileges).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.privileges[key]} onChange={e => setForm(f => ({ ...f, privileges: { ...f.privileges, [key]: e.target.checked } }))} />
                  <span>{key}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button disabled={saving} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <FaPlus /> {saving ? 'Saving...' : 'Create Worker'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query.search} onChange={e => setQuery(q => ({ ...q, search: e.target.value }))} placeholder="Search workers..." className="w-full pl-10 pr-3 py-2 border rounded-lg" />
          </div>
          <select value={query.status} onChange={e => setQuery(q => ({ ...q, status: e.target.value, page: 1 }))} className="border rounded-lg px-2 py-2">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </select>
          <select value={query.department} onChange={e => setQuery(q => ({ ...q, department: e.target.value, page: 1 }))} className="border rounded-lg px-2 py-2">
            <option value="">All Departments</option>
            <option value="General">General</option>
            <option value="Operations">Operations</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Cleaning">Cleaning</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w) => (
            <div key={w._id} className="border rounded-xl p-4 hover:shadow">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {w.avatar ? (
                    <img src={makeAbsolute(w.avatar)} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FaUser className="text-gray-400 text-2xl" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{w.firstName} {w.lastName}</div>
                  <div className="text-sm text-gray-600">{w.position} • {w.department}</div>
                  <div className="text-xs text-gray-500">{w.email}</div>
                </div>
                <label className="px-3 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer text-xs flex items-center gap-1">
                  <FaImage /> Avatar
                  <input className="hidden" type="file" accept="image/*" onChange={e => e.target.files?.[0] && onAvatarUpload(w._id, e.target.files[0])} />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.keys(defaultPrivileges).slice(0, 6).map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={!!w.privileges?.[k]} onChange={(e) => onUpdatePrivileges(w._id, { [k]: e.target.checked })} />
                    <span>{k}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs ${w.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{w.status}</span>
                <div className="flex items-center gap-2 text-sm">
                  <button className="px-2 py-1 border rounded flex items-center gap-1"><FaEdit /> Edit</button>
                  {/* For safety, we keep delete as terminate via backend route */}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">No workers found</div>
        )}
      </div>
    </div>
  );
}
