import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaBuilding,
  FaCalendarAlt,
  FaEnvelope,
  FaChartLine,
  FaUsers,
  FaCog,
  FaTasks,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assignedProperties: 0,
    tasksCompleted: 0,
    tasksAssigned: 0,
    rating: 0
  });
  const [tasks, setTasks] = useState([]);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    if (!user || user.userType !== 'worker') {
      toast.error('Access denied. Workers only.');
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch worker stats and assigned properties
      const response = await fetch(`${API_URL}/api/worker/dashboard`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
        setProperties(data.properties || []);
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getPrivilegesList = () => {
    if (!user?.privileges) return [];
    return Object.entries(user.privileges)
      .filter(([key, value]) => value === true)
      .map(([key]) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^can/, '').trim()
      }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const privileges = getPrivilegesList();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-gray-600 mt-2">Worker Dashboard - {user?.position || 'Staff Member'}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {user?.assignedProperties?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FaBuilding className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {user?.performance?.totalTasksCompleted || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(user?.performance?.totalTasksAssigned || 0) - (user?.performance?.totalTasksCompleted || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FaTasks className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {user?.performance?.rating || 0}/5
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FaChartLine className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Permissions & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Your Permissions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FaCog className="mr-2 text-blue-600" />
              Your Permissions
            </h2>
            {privileges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {privileges.map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2 text-sm">
                    <FaCheckCircle className="text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No permissions assigned yet. Contact your manager.</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FaTasks className="mr-2 text-blue-600" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              {user?.privileges?.canViewProperties && (
                <button
                  onClick={() => navigate('/worker/properties')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <span className="flex items-center text-blue-700 font-medium">
                    <FaBuilding className="mr-3" />
                    View Properties
                  </span>
                  <span className="text-blue-600">→</span>
                </button>
              )}
              
              {user?.privileges?.canViewBookings && (
                <button
                  onClick={() => navigate('/worker/bookings')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <span className="flex items-center text-green-700 font-medium">
                    <FaCalendarAlt className="mr-3" />
                    View Bookings
                  </span>
                  <span className="text-green-600">→</span>
                </button>
              )}
              
              {user?.privileges?.canMessageGuests && (
                <button
                  onClick={() => navigate('/messages')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <span className="flex items-center text-purple-700 font-medium">
                    <FaEnvelope className="mr-3" />
                    Messages
                  </span>
                  <span className="text-purple-600">→</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Assigned Properties */}
        {user?.assignedProperties && user.assignedProperties.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FaBuilding className="mr-2 text-blue-600" />
              Assigned Properties
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => (
                <div key={property._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900">{property.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{property.address}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{property.category}</span>
                    {user?.privileges?.canViewProperties && (
                      <button
                        onClick={() => navigate(`/properties/${property._id}`)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Permissions Warning */}
        {privileges.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-yellow-600 text-2xl mr-4 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Limited Access
                </h3>
                <p className="text-yellow-800">
                  You currently have no permissions assigned. Please contact your property owner or manager to request access to specific features.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDashboard;
