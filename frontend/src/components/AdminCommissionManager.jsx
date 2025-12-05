import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaToggleOn, FaToggleOff, FaMoneyBillWave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import SuccessModal from './SuccessModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminCommissionManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [punishment, setPunishment] = useState({ durationDays: '', durationWeeks: '', until: '' });
  const [showFineModal, setShowFineModal] = useState(false);
  const [fineForm, setFineForm] = useState({ userId: '', reason: '', amount: '', dueMode: 'none', dueAt: '', dueInDays: '', dueInWeeks: '', block: false, blockMode: 'none', blockedUntil: '', durationDays: '', durationWeeks: '' });
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Success');
  const [successMsg, setSuccessMsg] = useState('Action completed successfully.');
  const [rateSettings, setRateSettings] = useState({ baseRate: 8, premiumRate: 10, featuredRate: 12 });
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    fetchUsersWithUnpaidCommissions();
    fetchCommissionSettings();
  }, []);

  const safeParseJson = async (res) => {
    const ct = (res.headers && res.headers.get ? res.headers.get('content-type') : '') || '';
    if (ct.includes('application/json')) {
      try { return await res.json(); } catch (e) { return {}; }
    }
    // Not JSON - return raw text so callers can present a helpful message
    try {
      const text = await res.text();
      return { __raw: text };
    } catch (_) { return {}; }
  };

  const fetchCommissionSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/commission-settings`, {
        credentials: 'include'
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data?.message || 'Failed to load commission settings');
      setRateSettings({
        baseRate: Number(data.baseRate ?? 8),
        premiumRate: Number(data.premiumRate ?? 10),
        featuredRate: Number(data.featuredRate ?? 12),
      });
    } catch (e) {
      toast.error(e.message || 'Could not load commission settings');
    }
  };

  const saveCommissionSettings = async () => {
    try {
      setSavingRates(true);
      const res = await fetch(`${API_URL}/api/admin/commission-settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateSettings),
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data?.message || 'Failed to update commission settings');
      setRateSettings({
        baseRate: Number(data.baseRate ?? rateSettings.baseRate),
        premiumRate: Number(data.premiumRate ?? rateSettings.premiumRate),
        featuredRate: Number(data.featuredRate ?? rateSettings.featuredRate),
      });
      toast.success('Commission rates updated');
    } catch (e) {
      toast.error(e.message || 'Could not update commission settings');
    } finally {
      setSavingRates(false);
    }
  };

  const fetchUsersWithUnpaidCommissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/users/unpaid-commissions`, {
        credentials: 'include'
      });
      const data = await safeParseJson(res);

      if (!res.ok) {
        const msg = data?.message || (data && data.__raw ? data.__raw.slice(0, 200) : 'Failed to fetch users');
        throw new Error(msg);
      }

      setUsers(data.users || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openFineModal = (userId) => {
    setFineForm({ userId, reason: '', amount: '', dueMode: 'none', dueAt: '', dueInDays: '', dueInWeeks: '', block: false, blockMode: 'none', blockedUntil: '', durationDays: '', durationWeeks: '' });
    setShowFineModal(true);
  };

  const submitFine = async (e) => {
    e.preventDefault();
    const { userId, reason, amount, dueMode, dueAt, dueInDays, dueInWeeks, block, blockMode, blockedUntil, durationDays, durationWeeks } = fineForm;
    const amt = Number(amount || 0);
    if (!reason || !amt || amt <= 0) { toast.error('Enter reason and valid amount'); return; }
    const payload = { reason, amount: amt, block: !!block };
    if (dueMode === 'date' && dueAt) payload.dueAt = dueAt;
    if (dueMode === 'days' && Number(dueInDays)) payload.dueInDays = Number(dueInDays);
    if (dueMode === 'weeks' && Number(dueInWeeks)) payload.dueInWeeks = Number(dueInWeeks);
    if (block) {
      if (blockMode === 'date' && blockedUntil) payload.blockedUntil = blockedUntil;
      if (blockMode === 'days' && Number(durationDays)) payload.durationDays = Number(durationDays);
      if (blockMode === 'weeks' && Number(durationWeeks)) payload.durationWeeks = Number(durationWeeks);
    }
    try {
      setProcessingId(userId);
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/fines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.message || (data && data.__raw ? data.__raw.slice(0,200) : 'Failed to add fine'));
      toast.success('Fine added');
      setShowFineModal(false);
      setSuccessTitle('Fine Added');
      setSuccessMsg('The fine was added successfully.');
      setSuccessOpen(true);
      fetchUsersWithUnpaidCommissions();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivateUser = async (userId, totalCommission) => {
    if (!window.confirm(`Are you sure you want to deactivate this user? They owe RWF ${totalCommission.toLocaleString()} in commission.`)) {
      return;
    }

    try {
      setProcessingId(userId);
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: `Account deactivated due to unpaid commission of RWF ${totalCommission.toLocaleString()}`,
          durationDays: punishment.durationDays ? Number(punishment.durationDays) : undefined,
          durationWeeks: punishment.durationWeeks ? Number(punishment.durationWeeks) : undefined,
          blockedUntil: punishment.until || undefined
        })
      });

  const data = await safeParseJson(res);

  if (!res.ok) throw new Error(data.message || (data && data.__raw ? data.__raw.slice(0,200) : 'Failed to deactivate user'));

      toast.success('User account deactivated successfully');
      setSuccessTitle('User Deactivated');
      setSuccessMsg('The user was deactivated due to unpaid commissions.');
      setSuccessOpen(true);
      fetchUsersWithUnpaidCommissions();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivateUser = async (userId) => {
    if (!window.confirm('Are you sure you want to reactivate this user account?')) {
      return;
    }

    try {
      setProcessingId(userId);
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await safeParseJson(res);

      if (!res.ok) throw new Error(data.message || (data && data.__raw ? data.__raw.slice(0,200) : 'Failed to reactivate user'));

      toast.success('User account reactivated successfully');
      setSuccessTitle('User Reactivated');
      setSuccessMsg('The user account has been reactivated.');
      setSuccessOpen(true);
      fetchUsersWithUnpaidCommissions();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Commission Management</h2>
          <p className="text-gray-600 text-xs sm:text-sm">Manage users with unpaid commissions and set global commission rates</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg overflow-hidden border">
            <button className={`px-3 py-1.5 text-xs sm:text-sm ${viewMode==='cards' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`} onClick={()=>setViewMode('cards')}>Cards</button>
            <button className={`px-3 py-1.5 text-xs sm:text-sm ${viewMode==='table' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`} onClick={()=>setViewMode('table')}>Table</button>
          </div>
          <div className="bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-xs sm:text-sm">
            <FaExclamationTriangle className="inline mr-2" />
            <span className="font-semibold">{users.length} users with unpaid commissions</span>
          </div>
        </div>
      </div>

      {/* Global commission rate settings */}
      <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-semibold text-gray-900 text-sm sm:text-base">Global commission rates</div>
            <div className="text-xs sm:text-sm text-gray-600">These rates are applied per property based on its commission type (standard, premium, featured).</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Standard rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={rateSettings.baseRate}
              onChange={e => setRateSettings(prev => ({ ...prev, baseRate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Premium rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={rateSettings.premiumRate}
              onChange={e => setRateSettings(prev => ({ ...prev, premiumRate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Featured rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={rateSettings.featuredRate}
              onChange={e => setRateSettings(prev => ({ ...prev, featuredRate: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] sm:text-xs text-gray-600">
          <div>Changing these values will affect new and updated properties going forward. Existing bookings keep their stored commission amount.</div>
          <button
            type="button"
            onClick={saveCommissionSettings}
            disabled={savingRates}
            className="ml-2 px-3 py-1.5 rounded bg-[#a06b42] text-white text-xs sm:text-sm disabled:opacity-60"
          >
            {savingRates ? 'Saving…' : 'Save rates'}
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-10">
          <FaCheckCircle className="text-5xl sm:text-6xl text-green-500 mx-auto mb-3" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">All Commissions Paid!</h3>
          <p className="text-gray-600 text-sm">No users have unpaid commissions at this time</p>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Unpaid Commission</th>
                    <th className="p-3">Unpaid Count</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice((page-1)*pageSize, (page-1)*pageSize + pageSize).map(user => (
                    <tr key={user._id} className="border-t">
                      <td className="p-3 font-medium">{user.firstName} {user.lastName}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3 text-red-700 font-semibold">{formatCurrency(user.totalCommission)}</td>
                      <td className="p-3">{user.bookings?.length || 0}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{user.isBlocked ? 'Deactivated' : 'Active'}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {user.isBlocked ? (
                            <button onClick={() => handleReactivateUser(user._id)} disabled={processingId===user._id} className={`px-3 py-1 rounded text-white text-xs ${processingId===user._id?'bg-green-400':'bg-green-600 hover:bg-green-700'}`}>Reactivate</button>
                          ) : (
                            <button onClick={() => handleDeactivateUser(user._id, user.totalCommission)} disabled={processingId===user._id} className={`px-3 py-1 rounded text-white text-xs ${processingId===user._id?'bg-red-400':'bg-red-600 hover:bg-red-700'}`}>Deactivate</button>
                          )}
                          <button onClick={() => openFineModal(user._id)} className="px-3 py-1 rounded border text-xs hover:bg-gray-50">Add Fine</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {users.slice((page-1)*pageSize, (page-1)*pageSize + pageSize).map(user => (
                <div key={user._id} className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">{user.firstName} {user.lastName}</div>
                      <div className="text-xs sm:text-sm text-gray-600 break-words">{user.email}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}> {user.isBlocked ? 'Deactivated' : 'Active'} </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className="text-red-600 text-sm" />
                      <span className="font-semibold text-red-600 text-sm sm:text-base">{formatCurrency(user.totalCommission)}</span>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] sm:text-xs"> {user.bookings?.length || 0} unpaid </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.isBlocked ? (
                      <button onClick={() => handleReactivateUser(user._id)} disabled={processingId === user._id} className={`flex-1 px-3 py-2 rounded-lg text-white text-xs sm:text-sm ${processingId === user._id ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}>Reactivate</button>
                    ) : (
                      <button onClick={() => handleDeactivateUser(user._id, user.totalCommission)} disabled={processingId === user._id} className={`flex-1 px-3 py-2 rounded-lg text-white text-xs sm:text-sm ${processingId === user._id ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}>Deactivate</button>
                    )}
                    <button onClick={() => openFineModal(user._id)} className="px-3 py-2 rounded-lg border text-xs sm:text-sm hover:bg-gray-50">Add Fine</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs sm:text-sm text-gray-600">Showing <span className="font-semibold">{Math.min(page*pageSize, users.length)}</span> of <span className="font-semibold">{users.length}</span></div>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 text-sm border rounded disabled:opacity-50">Prev</button>
              {Array.from({ length: Math.max(1, Math.ceil(users.length / pageSize)) }, (_, i) => (
                <button key={i} onClick={()=>setPage(i+1)} className={`px-3 py-1.5 text-sm border rounded ${page===i+1? 'bg-[#a06b42] text-white border-[#a06b42]':'bg-white text-gray-700'}`}>{i+1}</button>
              ))}
              <button disabled={page>=Math.max(1, Math.ceil(users.length / pageSize))} onClick={()=>setPage(p=>Math.min(Math.max(1, Math.ceil(users.length / pageSize)), p+1))} className="px-3 py-1.5 text-sm border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        </>
      )}

      <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start space-x-3">
          <FaExclamationTriangle className="text-yellow-600 text-lg sm:text-xl mt-0.5" />
          <div className="text-xs sm:text-sm text-yellow-800">
            <p className="font-semibold mb-1">Commission Management Policy</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Users with unpaid commissions will be notified via email and in-app notifications</li>
              <li>Deactivated users cannot create new bookings or list new properties</li>
              <li>Reactivate users once they have paid their outstanding commissions</li>
              <li>All commission payments should be tracked and recorded</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Fine modal */}
      {showFineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFineModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-[92vw] max-w-xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Add Fine</h3>
            <form onSubmit={submitFine} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  value={fineForm.reason}
                  onChange={(e) => setFineForm({ ...fineForm, reason: e.target.value })}
                  placeholder="e.g., Unpaid commissions"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RWF)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={fineForm.amount}
                  onChange={(e) => setFineForm({ ...fineForm, amount: e.target.value })}
                  placeholder="50000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    className="border rounded-lg px-3 py-2"
                    value={fineForm.dueMode}
                    onChange={(e) => setFineForm({ ...fineForm, dueMode: e.target.value })}
                  >
                    <option value="none">No due</option>
                    <option value="date">Specific date</option>
                    <option value="days">In N days</option>
                    <option value="weeks">In N weeks</option>
                  </select>
                  {fineForm.dueMode === 'date' && (
                    <input type="datetime-local" className="border rounded-lg px-3 py-2" value={fineForm.dueAt} onChange={(e)=>setFineForm({ ...fineForm, dueAt: e.target.value })} />
                  )}
                  {fineForm.dueMode === 'days' && (
                    <input type="number" min={1} className="border rounded-lg px-3 py-2" placeholder="Days" value={fineForm.dueInDays} onChange={(e)=>setFineForm({ ...fineForm, dueInDays: e.target.value })} />
                  )}
                  {fineForm.dueMode === 'weeks' && (
                    <input type="number" min={1} className="border rounded-lg px-3 py-2" placeholder="Weeks" value={fineForm.dueInWeeks} onChange={(e)=>setFineForm({ ...fineForm, dueInWeeks: e.target.value })} />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Block user</label>
                <div className="flex items-center gap-2 mb-2">
                  <input id="blockUserToggle" type="checkbox" className="h-4 w-4" checked={fineForm.block} onChange={(e)=>setFineForm({ ...fineForm, block: e.target.checked })} />
                  <label htmlFor="blockUserToggle" className="text-sm text-gray-700">Deactivate account immediately</label>
                </div>
                {fineForm.block && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select className="border rounded-lg px-3 py-2" value={fineForm.blockMode} onChange={(e)=>setFineForm({ ...fineForm, blockMode: e.target.value })}>
                      <option value="none">Until cleared</option>
                      <option value="date">Until date</option>
                      <option value="days">For N days</option>
                      <option value="weeks">For N weeks</option>
                    </select>
                    {fineForm.blockMode === 'date' && (
                      <input type="datetime-local" className="border rounded-lg px-3 py-2" value={fineForm.blockedUntil} onChange={(e)=>setFineForm({ ...fineForm, blockedUntil: e.target.value })} />
                    )}
                    {fineForm.blockMode === 'days' && (
                      <input type="number" min={1} className="border rounded-lg px-3 py-2" placeholder="Days" value={fineForm.durationDays} onChange={(e)=>setFineForm({ ...fineForm, durationDays: e.target.value })} />
                    )}
                    {fineForm.blockMode === 'weeks' && (
                      <input type="number" min={1} className="border rounded-lg px-3 py-2" placeholder="Weeks" value={fineForm.durationWeeks} onChange={(e)=>setFineForm({ ...fineForm, durationWeeks: e.target.value })} />
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowFineModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add Fine</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <SuccessModal open={successOpen} title={successTitle} message={successMsg} onClose={()=>setSuccessOpen(false)} />
    </div>
  );
}

export default AdminCommissionManager;
