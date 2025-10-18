import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaPlus, FaSearch, FaUser, FaUsers, FaShieldAlt, FaTrash, FaEdit, FaImage, FaIdCard, FaKey } from 'react-icons/fa';

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
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [editing, setEditing] = useState(null); // worker object
  const [accountFor, setAccountFor] = useState(null); // worker object for account creation
  const [privFor, setPrivFor] = useState(null); // worker object for full privileges modal
  const [resetFor, setResetFor] = useState(null); // worker object for reset password
  const [properties, setProperties] = useState([]);

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

  const onUpdateWorker = async (workerId, payload) => {
    try {
      const res = await fetch(`${API_URL}/api/workers/${workerId}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update worker');
      setWorkers(prev => prev.map(w => w._id === workerId ? { ...w, ...data.worker } : w));
      toast.success('Worker updated');
      setEditing(null);
    } catch (e) { toast.error(e.message); }
  };

  const onCreateAccount = async (workerId, creds) => {
    try {
      const res = await fetch(`${API_URL}/api/workers/${workerId}/account`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create account');
      toast.success('Worker account created');
      setAccountFor(null);
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

  // fetch owner properties for assignment
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setProperties(Array.isArray(data.properties) ? data.properties : []);
      } catch (_) {}
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FaUsers /> Workers</h1>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 rounded-lg p-1">
            <button onClick={() => setViewMode('cards')} className={`px-3 py-1 rounded ${viewMode==='cards' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>Cards</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-1 rounded ${viewMode==='table' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>Table</button>
          </div>
          <button onClick={() => setShowForm(s => !s)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <FaPlus /> Add Worker
          </button>
        </div>
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

        {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filtered.map((w) => (
            <div key={w._id} className="border rounded-xl p-4 hover:shadow flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {w.avatar ? (
                    <img src={makeAbsolute(w.avatar)} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FaUser className="text-gray-400 text-2xl" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate leading-tight" title={`${w.firstName || ''} ${w.lastName || ''}`}>{w.firstName} {w.lastName}</div>
                  <div className="text-sm text-gray-600 truncate leading-tight" title={`${w.position || ''} • ${w.department || ''}`}>{w.position} • {w.department}</div>
                  <div className="text-xs text-gray-500 truncate break-all leading-tight" title={w.email || ''}>{w.email}</div>
                </div>
                <label className="px-3 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer text-xs flex items-center gap-1">
                  <FaImage /> Avatar
                  <input className="hidden" type="file" accept="image/*" onChange={e => e.target.files?.[0] && onAvatarUpload(w._id, e.target.files[0])} />
                </label>
              </div>

              <div className="mt-3 text-xs flex-1 overflow-hidden">
                {(() => {
                  const keys = Object.keys(defaultPrivileges);
                  const shown = keys.slice(0, 4);
                  const extra = keys.length - shown.length;
                  return (
                    <div className="flex flex-wrap gap-2">
                      {shown.map((k) => (
                        <label key={k} className="inline-flex items-center gap-1 px-2 py-1 border rounded">
                          <input type="checkbox" checked={!!w.privileges?.[k]} onChange={(e) => onUpdatePrivileges(w._id, { [k]: e.target.checked })} />
                          <span className="whitespace-nowrap">{k}</span>
                        </label>
                      ))}
                      {extra > 0 && (
                        <span className="px-2 py-1 text-gray-500">+{extra} more</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-auto flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs ${w.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{w.status}</span>
                <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap justify-end overflow-hidden">
                  <button onClick={()=> setEditing(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaEdit /> Edit</button>
                  <button onClick={()=> setAccountFor(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaIdCard /> Account</button>
                  <button onClick={()=> setPrivFor(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaShieldAlt /> Privileges</button>
                  <button onClick={()=> setResetFor(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaKey /> Reset</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(w => (
                  <tr key={w._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{w.firstName} {w.lastName}</div>
                      <div className="text-xs text-gray-500">{w.employeeId || ''}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      <div>{w.email}</div>
                      <div>{w.phone}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{w.position} • {w.department}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${w.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{w.status}</span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={()=> setEditing(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaEdit /> Edit</button>
                        <button onClick={()=> setAccountFor(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaIdCard /> Create Account</button>
                        <button onClick={()=> setPrivFor(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaShieldAlt /> Privileges</button>
                        <button onClick={()=> setResetFor(w)} className="px-2 py-1 border rounded flex items-center gap-1"><FaKey /> Reset Password</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Page {meta.currentPage} of {meta.totalPages || 1}</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={meta.currentPage <= 1}
              onClick={() => setQuery(q => ({ ...q, page: Math.max(1, (q.page || 1) - 1) }))}
            >Prev</button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={meta.totalPages && meta.currentPage >= meta.totalPages}
              onClick={() => setQuery(q => ({ ...q, page: (q.page || 1) + 1 }))}
            >Next</button>
            <select
              className="ml-2 border rounded px-2 py-1"
              value={query.limit}
              onChange={e => setQuery(q => ({ ...q, limit: Number(e.target.value), page: 1 }))}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>
        {editing && (
          <EditWorkerModal
            worker={editing}
            properties={properties}
            onClose={() => setEditing(null)}
            onSubmit={(payload) => onUpdateWorker(editing._id, payload)}
          />
        )}
        {accountFor && (
          <CreateAccountModal
            worker={accountFor}
            onClose={() => setAccountFor(null)}
            onSubmit={(creds) => onCreateAccount(accountFor._id, creds)}
          />
        )}
        {privFor && (
          <PrivilegesModal
            worker={privFor}
            defaultPrivileges={defaultPrivileges}
            onClose={() => setPrivFor(null)}
            onSubmit={(all) => onUpdatePrivileges(privFor._id, all)}
          />
        )}
        {resetFor && (
          <ResetPasswordModal
            worker={resetFor}
            onClose={() => setResetFor(null)}
          />
        )}
        {filtered.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">No workers found</div>
        )}
      </div>
  );
}

// Inline modal: Edit worker basic info and role/department
function EditWorkerModal({ worker, onClose, onSubmit, properties = [] }) {
  const [form, setForm] = useState({
    firstName: worker.firstName || '',
    lastName: worker.lastName || '',
    phone: worker.phone || '',
    position: worker.position || '',
    department: worker.department || 'General',
    status: worker.status || 'active',
    assignedProperties: Array.isArray(worker.assignedProperties) ? worker.assignedProperties : [],
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Edit Worker</div>
          <button className="px-2 py-1" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">First Name</label>
            <input className="w-full border rounded px-3 py-2" value={form.firstName} onChange={e=> setForm(f=>({...f, firstName: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Last Name</label>
            <input className="w-full border rounded px-3 py-2" value={form.lastName} onChange={e=> setForm(f=>({...f, lastName: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone</label>
            <input className="w-full border rounded px-3 py-2" value={form.phone} onChange={e=> setForm(f=>({...f, phone: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Position</label>
              <input className="w-full border rounded px-3 py-2" value={form.position} onChange={e=> setForm(f=>({...f, position: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Department</label>
              <input className="w-full border rounded px-3 py-2" value={form.department} onChange={e=> setForm(f=>({...f, department: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select className="w-full border rounded px-3 py-2" value={form.status} onChange={e=> setForm(f=>({...f, status: e.target.value}))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Assigned Properties</label>
            <div className="border rounded p-2 max-h-40 overflow-auto">
              {properties.map(p => {
                const id = p._id || p.id;
                const checked = form.assignedProperties?.some(ap => String(ap) === String(id));
                return (
                  <label key={id} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={checked} onChange={e => {
                      setForm(f => {
                        const cur = new Set((f.assignedProperties || []).map(String));
                        if (e.target.checked) cur.add(String(id)); else cur.delete(String(id));
                        return { ...f, assignedProperties: Array.from(cur) };
                      });
                    }} />
                    <span>{p.title || p.name || 'Property'}</span>
                  </label>
                );
              })}
              {properties.length === 0 && (
                <div className="text-xs text-gray-500">No properties found.</div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={()=> onSubmit(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// Inline modal: Owner creates worker login credentials (non-editable by worker)
function CreateAccountModal({ worker, onClose, onSubmit }) {
  const [creds, setCreds] = useState({
    username: `${(worker.firstName || 'user').toLowerCase()}.${(worker.lastName || 'staff').toLowerCase()}`,
    email: worker.email || '',
    password: Math.random().toString(36).slice(2, 10) + 'A!1',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState('');

  const validate = () => {
    const u = (creds.username || '').trim();
    const e = (creds.email || '').trim();
    const p = (creds.password || '');
    if (u.length < 3) return 'Username must be at least 3 characters.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return 'Enter a valid email address.';
    if (p.length < 8) return 'Password must be at least 8 characters.';
    return '';
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Create Worker Account</div>
          <button className="px-2 py-1" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm text-gray-600">Provide credentials the worker will use to log in. They cannot change these credentials.</div>
          {err && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">{err}</div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input className="w-full border rounded px-3 py-2" value={creds.username} onChange={e=> setCreds(c=>({...c, username: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input type="email" className="w-full border rounded px-3 py-2" value={creds.email} onChange={e=> setCreds(c=>({...c, email: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <div className="flex items-center gap-2">
              <input type={showPwd ? 'text' : 'password'} className="flex-1 border rounded px-3 py-2" value={creds.password} onChange={e=> setCreds(c=>({...c, password: e.target.value}))} />
              <button type="button" className="px-3 py-2 border rounded" onClick={()=> setShowPwd(s=>!s)}>{showPwd ? 'Hide' : 'Show'}</button>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Min 8 characters. Use a strong password.</div>
          </div>
          <div className="text-xs text-gray-500">Share these credentials securely with the worker.</div>
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={()=> { const m = validate(); if (m) { setErr(m); return; } setErr(''); onSubmit(creds); }}>Create Account</button>
        </div>
      </div>
    </div>
  );
}

// Full privileges modal (bulk edit all privileges)
function PrivilegesModal({ worker, defaultPrivileges, onClose, onSubmit }) {
  const [priv, setPriv] = useState({ ...defaultPrivileges, ...(worker.privileges || {}) });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Edit Privileges • {worker.firstName} {worker.lastName}</div>
          <button className="px-2 py-1" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.keys(defaultPrivileges).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!priv[key]} onChange={e => setPriv(p => ({ ...p, [key]: e.target.checked }))} />
              <span>{key}</span>
            </label>
          ))}
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={()=> onSubmit(priv)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// Reset password modal
function ResetPasswordModal({ worker, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { newPassword }
  const [err, setErr] = useState('');

  const onReset = async () => {
    try {
      setLoading(true);
      setErr('');
      const res = await fetch(`${API_URL}/api/workers/${worker._id}/reset-password`, { method: 'POST', credentials: 'include' });
      let data = {};
      try { data = await res.json(); } catch (_) { data = {}; }
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      setResult({ newPassword: data.newPassword || data.password || '' });
      toast.success('Password reset');
    } catch (e) {
      const msg = e?.message || 'Failed to reset password. Please try again.';
      setErr(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Reset Password • {worker.firstName} {worker.lastName}</div>
          <button className="px-2 py-1" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 space-y-3">
          {err && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">{err}</div>
          )}
          {!result ? (
            <div className="text-sm text-gray-700">This will generate a new password for the worker. Share it securely. They cannot change credentials.</div>
          ) : (
            <div>
              <div className="text-sm text-gray-700 mb-1">New password:</div>
              <div className="flex items-center gap-2">
                <input className="flex-1 border rounded px-3 py-2" readOnly value={result.newPassword} />
                <button className="px-3 py-2 border rounded" onClick={() => { try { navigator.clipboard && navigator.clipboard.writeText(result.newPassword); toast.success('Copied'); } catch (_) { /* no-op */ } }}>Copy</button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          {!result && (
            <button disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50" onClick={onReset}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          )}
          <button className="px-4 py-2 border rounded" onClick={onClose}>{result ? 'Done' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );
}
