import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaCar, FaCalendarAlt, FaCheckCircle, FaTimes, FaStar,
  FaExclamationTriangle, FaMapMarkerAlt, FaEye, FaComments,
  FaFilter, FaDownload, FaCog, FaMotorcycle, FaBicycle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const VehiclesGroupHomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCurrencyRWF } = useLocale() || {};
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [searchTerm, setSearchTerm] = useState('');

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalVehicles: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const [vehiclesRes, bookingsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/cars/mine`, { credentials: 'include', headers: authHeaders }),
        fetch(`${API_URL}/api/car-bookings/for-my-cars`, { credentials: 'include', headers: authHeaders }),
      ]);

      let vehiclesList = [];
      let bookingsList = [];

      if (vehiclesRes.status === 'fulfilled') {
        try {
          const res = vehiclesRes.value;
          const vehiclesData = await res.json().catch(() => ({ cars: [] }));

          if (Array.isArray(vehiclesData.cars)) {
            vehiclesList = vehiclesData.cars;
          } else if (Array.isArray(vehiclesData)) {
            vehiclesList = vehiclesData;
          } else {
            vehiclesList = [];
          }

          if (!res.ok) {
            console.error('Failed to fetch vehicles:', res.status, res.statusText, vehiclesData?.message);
          }

          setVehicles(vehiclesList);
        } catch (e) {
          console.error('Failed to parse vehicles response:', e);
          setVehicles([]);
        }
      } else {
        console.error('Failed to fetch vehicles:', vehiclesRes.reason);
        setVehicles([]);
      }

      if (bookingsRes.status === 'fulfilled') {
        try {
          const bookingsData = await bookingsRes.value.json().catch(() => ({ bookings: [] }));
          bookingsList = Array.isArray(bookingsData.bookings) ? bookingsData.bookings : [];
          setBookings(bookingsList);
        } catch (e) {
          console.error('Failed to parse bookings response:', e);
          setBookings([]);
        }
      } else {
        console.error('Failed to fetch bookings:', bookingsRes.reason);
        setBookings([]);
      }

      // Calculate summary stats
      const activeBookings = bookingsList.filter(b => {
        const s = String(b.status || '').toLowerCase();
        return s === 'active' || s === 'confirmed' || s === 'pending';
      }).length;

      const completedBookings = bookingsList.filter(b => {
        const s = String(b.status || '').toLowerCase();
        return s === 'completed' || s === 'ended';
      }).length;

      const totalRevenue = bookingsList.reduce((sum, b) => {
        return sum + (Number(b.totalAmount || 0));
      }, 0);

      setSummaryStats({
        totalVehicles: vehiclesList.length,
        activeBookings,
        completedBookings,
        totalRevenue
      });
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      toast.error('Failed to load some data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate vehicle-level stats
  const getVehicleStats = (vehicle) => {
    if (!vehicle) {
      return {
        activeBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        status: 'Inactive',
        isActive: false,
      };
    }

    const vehicleId = vehicle._id;
    const vehicleBookings = bookings.filter(b => String(b.car?._id) === String(vehicleId));

    const activeBookings = vehicleBookings.filter(b => {
      const s = String(b.status || '').toLowerCase();
      return s === 'active' || s === 'confirmed' || s === 'pending';
    }).length;

    const completedBookings = vehicleBookings.filter(b => {
      const s = String(b.status || '').toLowerCase();
      return s === 'completed' || s === 'ended';
    }).length;

    const totalRevenue = vehicleBookings.reduce((sum, b) => {
      return sum + (Number(b.totalAmount || 0));
    }, 0);

    const isActive = vehicle.isAvailable === true || vehicle.status === 'active';

    let status;
    if (isActive) {
      status = 'Active/Available';
    } else {
      status = 'Inactive/Not available';
    }

    return {
      activeBookings,
      completedBookings,
      totalRevenue,
      status,
      isActive,
    };
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const stats = getVehicleStats(vehicle);
    if (filterStatus === 'active' && !stats.isActive) return false;
    if (filterStatus === 'inactive' && stats.isActive) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const id = String(vehicle._id || '').toLowerCase();
      const name = String(vehicle.vehicleName || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || '').toLowerCase();
      const location = String(vehicle.location || '').toLowerCase();
      return id.includes(search) || name.includes(search) || location.includes(search);
    }
    return true;
  });

  const getVehicleIcon = (category) => {
    if (category === 'motorcycle') return FaMotorcycle;
    if (category === 'bicycle') return FaBicycle;
    return FaCar;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vehicles homepage...</p>
        </div>
      </div>
    );
  }

  // If no vehicles, redirect to first vehicle listing
  if (vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <FaCar className="text-6xl text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No vehicles yet</h1>
          <p className="text-gray-600 mb-6">You need to list your first vehicle to access the vehicles dashboard.</p>
          <button
            onClick={() => navigate('/upload-property?type=vehicle')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            List Your First Vehicle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vehicles Group Homepage</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your vehicles and bookings</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Vehicles</div>
            <div className="text-2xl font-bold text-gray-900">{summaryStats.totalVehicles}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Active Bookings</div>
            <div className="text-2xl font-bold text-emerald-700">{summaryStats.activeBookings}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold text-blue-700">{summaryStats.completedBookings}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrencyRWF
                ? formatCurrencyRWF(summaryStats.totalRevenue)
                : `RWF ${Number(summaryStats.totalRevenue || 0).toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Vehicles Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Vehicles</h3>
                <p className="text-sm text-gray-600">Click on any vehicle row to manage it</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mr-2">Filter by status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All vehicles</option>
                    <option value="active">Active/Available</option>
                    <option value="inactive">Inactive/Not available</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Filter by vehicle ID, name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No vehicles found
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    const stats = getVehicleStats(vehicle);
                    const vehicleId = String(vehicle._id || '').slice(-8);
                    const VehicleIcon = getVehicleIcon(vehicle.category || vehicle.type || 'car');
                    const vehicleName = vehicle.vehicleName || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Unnamed vehicle';
                    return (
                      <tr 
                        key={vehicle._id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          try {
                            if (typeof window !== 'undefined' && window.localStorage) {
                              window.localStorage.setItem('owner:lastVehicleId', String(vehicle._id || ''));
                            }
                          } catch (_) {}
                          navigate(`/owner/cars?car=${vehicle._id}`);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vehicleId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <VehicleIcon className="text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {vehicleName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {vehicle.location || 'Location not specified'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {stats.isActive ? (
                              <>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-900">{stats.status}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm text-gray-900">{stats.status}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stats.activeBookings > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {stats.activeBookings}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stats.completedBookings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrencyRWF
                            ? formatCurrencyRWF(stats.totalRevenue)
                            : `RWF ${Number(stats.totalRevenue || 0).toLocaleString()}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation to vehicle owner dashboard */}
        {vehicles.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Click on any vehicle above to manage it, or use the button below to view all vehicles
            </p>
            <button
              onClick={() => navigate('/owner/cars')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View All Vehicles Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehiclesGroupHomePage;

