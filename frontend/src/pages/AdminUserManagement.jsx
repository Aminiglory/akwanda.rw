import React, { useEffect, useMemo, useState } from 'react';
import { ListItemSkeleton } from '../components/Skeletons';
import { FaUsers, FaExclamationTriangle, FaCheckCircle, FaUserShield, FaUserTimes, FaSearch, FaFilter, FaSync } from 'react-icons/fa';
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, issuesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/user-management/users`, { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/user-management/role-issues`, { credentials: 'include' })
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
    return list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, searchTerm, filterType, roleIssues]);

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
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}/promote`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to promote');
      toast.success('Promoted to host');
      setUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, userType: 'host' } : u)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const demoteToGuest = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}/demote`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to demote');
      toast.success('Demoted to guest');
      setUsers(prev => prev.map(u => (String(u.id) === String(id) ? { ...u, userType: 'guest' } : u)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const fixAllRoles = async () => {
    try {
      await fetch(`${API_URL}/api/admin/user-management/fix-roles`, { method: 'POST', credentials: 'include' });
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FaUsers className="text-2xl text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FaUserShield className="text-2xl text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hosts</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.userType === 'host').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FaUsers className="text-2xl text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Guests</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.userType === 'guest').length}
              </p>
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

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
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
                <option value="admin">Admins</option>
                <option value="issues">Role Issues</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4 h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <ListItemSkeleton rows={8} />
        </div>
      ) : viewMode === 'table' ? (
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
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => viewUserDetails(user.id)} className="text-blue-600 hover:text-blue-900">View</button>
                      {user.userType !== 'host' && user.userType !== 'admin' && (
                        <button onClick={() => promoteToHost(user.id)} className="text-green-600 hover:text-green-900">Promote to Host</button>
                      )}
                      {user.userType === 'host' && user.propertyCount === 0 && (
                        <button onClick={() => demoteToGuest(user.id)} className="text-red-600 hover:text-red-900">Demote to Guest</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div key={u.id} className="bg-white rounded-lg shadow p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold`}>{(u.name || u.email || 'U').charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{u.name}</div>
                  <div className="text-sm text-gray-500 truncate">{u.email}</div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(u.userType)}`}>{u.userType}</span>
              </div>
              <div className="text-xs text-gray-600 mb-3">Properties: <span className="font-semibold">{u.propertyCount}</span></div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => viewUserDetails(u.id)} className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100">View</button>
                {u.userType !== 'host' && u.userType !== 'admin' && (
                  <button onClick={() => promoteToHost(u.id)} className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100">Promote</button>
                )}
                {u.userType === 'host' && u.propertyCount === 0 && (
                  <button onClick={() => demoteToGuest(u.id)} className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100">Demote</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
              
              <div>
                <h3 className="font-semibold">Properties ({selectedUser.propertyCount})</h3>
                {selectedUser.properties.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.properties.map((property) => (
                      <div key={property._id} className="p-2 bg-gray-50 rounded">
                        <p><strong>{property.title}</strong></p>
                        <p className="text-sm text-gray-600">Status: {property.status}</p>
                        <p className="text-sm text-gray-600">Created: {new Date(property.createdAt).toLocaleDateString()}</p>
                      </div>
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
    </div>
  );
};

export default AdminUserManagement;
