import React, { useState, useEffect } from 'react';
import { FaUsers, FaExclamationTriangle, FaCheckCircle, FaUserShield, FaUserTimes, FaSearch, FaFilter, FaSync } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roleIssues, setRoleIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, guest, host, admin, issues
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, issuesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/user-management/users`, { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/user-management/users/role-issues`, { credentials: 'include' })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setRoleIssues(issuesData.issues || []);
      }
    } catch (error) {
      toast.error('Failed to load user data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fixAllRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/fix-roles`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadData(); // Reload data
      } else {
        toast.error(data.message || 'Failed to fix roles');
      }
    } catch (error) {
      toast.error('Failed to fix roles');
      console.error('Error fixing roles:', error);
    }
  };

  const promoteToHost = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${userId}/promote-to-host`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadData(); // Reload data
      } else {
        toast.error(data.message || 'Failed to promote user');
      }
    } catch (error) {
      toast.error('Failed to promote user');
      console.error('Error promoting user:', error);
    }
  };

  const demoteToGuest = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${userId}/demote-to-guest`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadData(); // Reload data
      } else {
        toast.error(data.message || 'Failed to demote user');
      }
    } catch (error) {
      toast.error('Failed to demote user');
      console.error('Error demoting user:', error);
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${userId}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
        setShowUserDetails(true);
      } else {
        toast.error('Failed to load user details');
      }
    } catch (error) {
      toast.error('Failed to load user details');
      console.error('Error loading user details:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filterType) {
      case 'guest': return user.userType === 'guest';
      case 'host': return user.userType === 'host';
      case 'admin': return user.userType === 'admin';
      case 'issues': return user.shouldBeHost;
      default: return true;
    }
  });

  const getRoleColor = (userType) => {
    switch (userType) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'host': return 'bg-blue-100 text-blue-800';
      case 'guest': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
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

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.userType)}`}>
                      {user.userType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.propertyCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.shouldBeHost ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        <FaExclamationTriangle className="mr-1" />
                        Needs Host Role
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <FaCheckCircle className="mr-1" />
                        Correct Role
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => viewUserDetails(user.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    {user.userType !== 'host' && user.userType !== 'admin' && (
                      <button
                        onClick={() => promoteToHost(user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Promote to Host
                      </button>
                    )}
                    {user.userType === 'host' && user.propertyCount === 0 && (
                      <button
                        onClick={() => demoteToGuest(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Demote to Guest
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
