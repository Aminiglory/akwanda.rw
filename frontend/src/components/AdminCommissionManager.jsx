import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaToggleOn, FaToggleOff, FaMoneyBillWave } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminCommissionManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsersWithUnpaidCommissions();
  }, []);

  const fetchUsersWithUnpaidCommissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/users/unpaid-commissions`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
      
      setUsers(data.users || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId, totalCommission) => {
    if (!window.confirm(`Are you sure you want to deactivate this user? They owe RWF ${totalCommission.toLocaleString()} in commission.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: `Account deactivated due to unpaid commission of RWF ${totalCommission.toLocaleString()}`
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to deactivate user');

      toast.success('User account deactivated successfully');
      fetchUsersWithUnpaidCommissions();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReactivateUser = async (userId) => {
    if (!window.confirm('Are you sure you want to reactivate this user account?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to reactivate user');

      toast.success('User account reactivated successfully');
      fetchUsersWithUnpaidCommissions();
    } catch (error) {
      toast.error(error.message);
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Commission Management</h2>
          <p className="text-gray-600">Manage users with unpaid commissions</p>
        </div>
        <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
          <FaExclamationTriangle className="inline mr-2" />
          <span className="font-semibold">{users.length} users with unpaid commissions</span>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Commissions Paid!</h3>
          <p className="text-gray-600">No users have unpaid commissions at this time</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total Commission Owed</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <FaMoneyBillWave className="text-red-600" />
                      <span className="text-xl font-bold text-red-600">
                        {formatCurrency(user.totalCommission)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {user.bookings?.length || 0} unpaid bookings
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBlocked ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <FaToggleOff className="mr-1" />
                        Deactivated
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <FaToggleOn className="mr-1" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.isBlocked ? (
                      <button
                        onClick={() => handleReactivateUser(user._id)}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <FaToggleOn />
                        <span>Reactivate</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeactivateUser(user._id, user.totalCommission)}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <FaToggleOff />
                        <span>Deactivate</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaExclamationTriangle className="text-yellow-600 text-xl mt-0.5" />
          <div className="text-sm text-yellow-800">
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
    </div>
  );
};

export default AdminCommissionManager;
