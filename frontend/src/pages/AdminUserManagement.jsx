import React, { useEffect, useMemo, useState } from 'react';
import { ListItemSkeleton } from '../components/Skeletons';
import { FaUsers, FaExclamationTriangle, FaCheckCircle, FaUserShield, FaUserTimes, FaSearch, FaFilter, FaSync, FaEllipsisV, FaUser, FaEdit, FaTrash, FaHome } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roleIssues, setRoleIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [menuFor, setMenuFor] = useState(null); // action menu per user
  const [propertyFor, setPropertyFor] = useState(null); // property details modal
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [reportType, setReportType] = useState('revenue');
  const [reportPeriod, setReportPeriod] = useState('monthly');

  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.message || 'Download failed');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      const objUrl = window.URL.createObjectURL(blob);
      link.href = objUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objUrl);
      toast.success('Download started');
    } catch (e) {
      toast.error(e.message || 'Failed to download');
    }
  };

  const downloadPdf = async () => {
    const qs = new URLSearchParams({ type: reportType, period: reportPeriod }).toString();
    await downloadFile(`${API_URL}/api/reports/generate-pdf?${qs}`, `${reportType}-${reportPeriod}-report.pdf`);
  };
  const downloadCsv = async () => {
    const qs = new URLSearchParams({ type: reportType, period: reportPeriod }).toString();
    await downloadFile(`${API_URL}/api/reports/generate-csv?${qs}`, `${reportType}-${reportPeriod}-report.csv`);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, issuesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/user-management/users`, { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/user-management/users/role-issues`, { credentials: 'include' })
      ]);
      const usersJson = await usersRes.json();
      const issuesJson = await issuesRes.json();
      setUsers(usersJson.users || []);
      setRoleIssues(issuesJson.issues || []);
    } catch (e) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const [togglingId, setTogglingId] = useState(null);
  const deactivateUser = async (id) => {
    try {
      if (!window.confirm('Deactivate this user account?')) return;
      setTogglingId(id);
      const res = await fetch(`${API_URL}/api/admin/users/${id}/deactivate`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Admin deactivation' }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to deactivate');
      toast.success('User deactivated');
      setUsers(prev => prev.map(u => (String(u.id||u._id)===String(id) ? { ...u, isBlocked: true } : u)));
      // Best-effort: notify the user and deactivate their workers
      try {
        await fetch(`${API_URL}/api/notifications`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'account_deactivated',
            userId: id,
            title: 'Account Deactivated',
            message: 'Your account has been deactivated due to unpaid commissions. Your workers have been suspended. Please settle outstanding amounts to regain access.'
          })
        });
      } catch (_) {}
      try {
        await fetch(`${API_URL}/api/admin/users/${id}/workers/deactivate`, { method: 'POST', credentials: 'include' });
      } catch (_) {}
    } catch (e) {
      toast.error(e.message || 'Failed to deactivate');
    } finally { setTogglingId(null); }
  };
  const reactivateUser = async (id) => {
    try {
      if (!window.confirm('Reactivate this user account?')) return;
      setTogglingId(id);
      const res = await fetch(`${API_URL}/api/admin/users/${id}/reactivate`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to reactivate');
      toast.success('User reactivated');
      setUsers(prev => prev.map(u => (String(u.id||u._id)===String(id) ? { ...u, isBlocked: false } : u)));
    } catch (e) {
      toast.error(e.message || 'Failed to reactivate');
    } finally { setTogglingId(null); }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => String(u.id) !== String(id) && String(u._id) !== String(id)));
    } catch (e) {
      toast.error(e.message || 'Failed to delete user');
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredUsers = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    let list = users;
    if (filterType !== 'all') {
      if (filterType === 'issues') {
        const ids = new Set((roleIssues || []).map(r => String(r.userId || r._id)));
        list = list.filter(u => ids.has(String(u.id || u._id)));
      } else {
        list = list.filter(u => (u.userType || '').toLowerCase() === filterType);
      }
    }
    // Always exclude admins from the Users tab
    list = list.filter(u => (u.userType || '').toLowerCase() !== 'admin');
    const result = list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
    return result;
  }, [users, searchTerm, filterType, roleIssues]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [filteredUsers.length]);

  const getRoleColor = (role) => {
    switch ((role || '').toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'host': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const viewUserDetails = async (id) => {
    try {
      setShowUserDetails(true);
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load user');
      setSelectedUser({
        user: data.user,
        properties: data.properties || [],
        propertyCount: (data.properties || []).length
      });
    } catch (e) {
      toast.error(e.message || 'Failed to load user');
      setShowUserDetails(false);
    }
  };

  const promoteToHost = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}/promote-to-host`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to promote');
      toast.success('Promoted to host');
      setUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, userType: 'host' } : u)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const demoteToGuest = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}/demote-to-guest`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to demote');
      toast.success('Demoted to guest');
      setUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, userType: 'guest' } : u)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const fixAllRoles = async () => {
    try {
      await fetch(`${API_URL}/api/admin/user-management/users/fix-roles`, { method: 'POST', credentials: 'include' });
      toast.success('Role issues resolved');
      loadData();
    } catch {
      toast.error('Failed to fix roles');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg overflow-hidden border">
              <button
                className={`px-3 py-2 text-sm ${viewMode==='table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                Table
              </button>
              <button
                className={`px-3 py-2 text-sm ${viewMode==='cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setViewMode('cards')}
                title="Cards view"
              >
                Cards
              </button>
            </div>
            <button
              onClick={loadData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FaSync />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        {/* Reports Toolbar */}
        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Type</label>
            <select value={reportType} onChange={(e)=>setReportType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="revenue">Revenue</option>
              <option value="bookings">Bookings</option>
              <option value="performance">Performance</option>
              <option value="tax">Tax</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Period</label>
            <select value={reportPeriod} onChange={(e)=>setReportPeriod(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPdf} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Download PDF</button>
            <button onClick={downloadCsv} className="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-black">Download CSV</button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FaUsers className="text-2xl text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.userType !== 'admin').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FaUserShield className="text-2xl text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hosts</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.userType === 'host').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FaUsers className="text-2xl text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Guests</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.userType === 'guest').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-2xl text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Role Issues</p>
              <p className="text-2xl font-bold text-gray-900">{roleIssues.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Issues Alert */}
      {roleIssues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-yellow-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  {roleIssues.length} users have role issues
                </h3>
                <p className="text-sm text-yellow-700">
                  These users have properties but aren't marked as hosts
                </p>
              </div>
            </div>
            <button
              onClick={fixAllRoles}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Fix All Roles
            </button>
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {propertyFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="text-lg font-semibold flex items-center gap-2"><FaHome className="text-blue-600" /> Property Details</div>
              <button className="px-2 py-1" onClick={() => setPropertyFor(null)}>Close</button>
            </div>
            <div className="p-6 space-y-3 text-sm text-gray-700">
              <div><span className="text-gray-500">Title:</span> {propertyFor.title}</div>
              <div><span className="text-gray-500">Status:</span> {propertyFor.status}</div>
              <div><span className="text-gray-500">Created:</span> {new Date(propertyFor.createdAt).toLocaleString()}</div>
              {propertyFor.city && (<div><span className="text-gray-500">City:</span> {propertyFor.city}</div>)}
              {Array.isArray(propertyFor.images) && propertyFor.images.length>0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {propertyFor.images.slice(0,6).map((img, i) => (
                    <img key={i} src={typeof img==='string'? img: (img?.path||img?.url||'')} alt="property" className="w-full h-24 object-cover rounded border" />
                  ))}
                </div>
              )}
              {propertyFor.description && (<div className="mt-2"><span className="text-gray-500">Description:</span><div className="mt-1 whitespace-pre-wrap">{propertyFor.description}</div></div>)}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="guest">Guests</option>
            <option value="host">Hosts</option>
            <option value="issues">Role Issues</option>
          </select>
        </div>
      </div>
      <div className="mt-2 md:mt-0 flex items-center gap-2">
        <div className="inline-flex rounded-lg overflow-hidden border">
          <button
            className={`px-3 py-2 text-sm ${viewMode==='table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            Table
          </button>
          <button
            className={`px-3 py-2 text-sm ${viewMode==='cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setViewMode('cards')}
            title="Cards view"
          >
            Cards
          </button>
        </div>
        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FaSync />
          <span>Refresh</span>
        </button>
      </div>

    {/* Users List */}
    {loading ? (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4 h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <ListItemSkeleton rows={8} />
      </div>
    ) : (
      viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paged.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar?.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">{(user.name || user.email || 'U').charAt(0)}</div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.userType)}`}>{user.userType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.propertyCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.shouldBeHost ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"><FaExclamationTriangle className="mr-1" />Needs Host Role</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><FaCheckCircle className="mr-1" />Correct Role</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setMenuFor(menuFor === user.id ? null : user.id)}
                          className="p-2 border rounded"
                          aria-haspopup="menu"
                          aria-expanded={menuFor === user.id}
                          title="Actions"
                        >
                          <FaEllipsisV />
                        </button>
                        {menuFor === user.id && (
                          <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow z-10">
                            <button onClick={() => { viewUserDetails(user.id); setMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                              <FaUser className="md:hidden" /><span className="hidden md:inline">View</span><span className="md:hidden">View</span>
                            </button>
                            {user.userType !== 'host' && user.userType !== 'admin' && (
                              <button onClick={() => { promoteToHost(user.id); setMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                                <FaHome className="md:hidden" /><span className="hidden md:inline">Promote to Host</span><span className="md:hidden">Promote</span>
                              </button>
                            )}
                            {user.userType === 'host' && user.propertyCount === 0 && (
                              <button onClick={() => { demoteToGuest(user.id); setMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                                <FaUserTimes className="md:hidden" /><span className="hidden md:inline">Demote to Guest</span><span className="md:hidden">Demote</span>
                              </button>
                            )}
                            <button onClick={() => { (user.isBlocked ? reactivateUser(user.id) : deactivateUser(user.id)); setMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                              <FaEdit className="md:hidden" /><span className="hidden md:inline">{user.isBlocked ? 'Reactivate' : 'Deactivate'}</span><span className="md:hidden">{user.isBlocked ? 'Reactivate' : 'Deactivate'}</span>
                            </button>
                            <button onClick={() => { setConfirmDeleteId(user.id); setMenuFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-rose-600">
                              <FaTrash className="md:hidden" /><span className="hidden md:inline">Delete</span><span className="md:hidden">Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
            <div className="text-sm text-gray-600">Showing <span className="font-semibold">{Math.min(page*pageSize, filteredUsers.length)}</span> of <span className="font-semibold">{filteredUsers.length}</span></div>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1.5 text-sm border rounded disabled:opacity-50">Prev</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i+1)} className={`px-3 py-1.5 text-sm border rounded ${page===i+1? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700'}`}>{i+1}</button>
              ))}
              <button disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1.5 text-sm border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div key={u.id} className="bg-white rounded-lg shadow p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                {u.avatar ? (
                  <img src={u.avatar?.startsWith('http') ? u.avatar : `${API_URL}${u.avatar}`} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold`}>{(u.name || u.email || 'U').charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{u.name}</div>
                  <div className="text-sm text-gray-500 truncate">{u.email}</div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(u.userType)}`}>{u.userType}</span>
              </div>
              {/* Add card body/actions here if needed */}
            </div>
          ))}
        </div>
      ))}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">User Details</h2>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedUser.user.avatar ? (
                  <img src={selectedUser.user.avatar?.startsWith('http') ? selectedUser.user.avatar : `${API_URL}${selectedUser.user.avatar || ''}`} alt={selectedUser.user.firstName} className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-base font-semibold">{(selectedUser.user.firstName || selectedUser.user.email || 'U').charAt(0)}</div>
                )}
                <div className="text-sm text-gray-600">
                  <div className="font-semibold text-gray-900">Profile</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${String(selectedUser.user.userType).toLowerCase()==='admin' ? 'bg-purple-100 text-purple-700' : String(selectedUser.user.userType).toLowerCase()==='host' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {selectedUser.user.userType}
                    </span>
                    {selectedUser.user.isBlocked ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Blocked</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Personal Information</h3>
                <p><strong>Name:</strong> {selectedUser.user.firstName} {selectedUser.user.lastName}</p>
                <p><strong>Email:</strong> {selectedUser.user.email}</p>
                <p><strong>Phone:</strong> {selectedUser.user.phone}</p>
                <p><strong>Role:</strong> {selectedUser.user.userType}</p>
                <p><strong>Joined:</strong> {new Date(selectedUser.user.createdAt).toLocaleDateString()}</p>
                <div className="mt-3">
                  <a
                    href={`/messages?to=${encodeURIComponent(selectedUser.user._id || selectedUser.user.id)}`}
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start Chat
                  </a>
                </div>
              </div>
              
              {selectedUser.user?.privileges && (
                <div>
                  <h3 className="font-semibold">Privileges</h3>
                  {Object.values(selectedUser.user.privileges).some(Boolean) ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(selectedUser.user.privileges).filter(([_, v]) => v).map(([k]) => (
                        <span key={k} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">{k}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No privileges assigned</div>
                  )}
                </div>
              )}
              <div>
                <h3 className="font-semibold">Properties ({selectedUser.propertyCount})</h3>
                {selectedUser.properties.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.properties.map((property) => (
                      <button key={property._id} onClick={() => setPropertyFor(property)} className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100">
                        <p className="font-semibold text-gray-900 flex items-center gap-2"><FaHome className="text-blue-600" /> {property.title}</p>
                        <p className="text-sm text-gray-600">Status: {property.status}</p>
                        <p className="text-sm text-gray-600">Created: {new Date(property.createdAt).toLocaleDateString()}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No properties</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-4 border-b">
              <div className="text-lg font-semibold text-gray-900">Delete User</div>
            </div>
            <div className="p-4 text-sm text-gray-700">
              Are you sure you want to permanently delete this user? This action cannot be undone and may remove their properties, bookings, messages and related data.
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button className="px-4 py-2 border rounded" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button
                className="px-4 py-2 bg-rose-600 text-white rounded"
                onClick={async () => { await deleteUser(confirmDeleteId); setConfirmDeleteId(null); }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
