import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaCalendarAlt, FaUsers, FaCheckCircle, FaTimes, FaStar,
  FaExclamationTriangle, FaMapMarkerAlt, FaEye, FaComments,
  FaFilter, FaDownload, FaCog
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GroupHomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCurrencyRWF } = useLocale() || {};
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, open, closed
  const [searchTerm, setSearchTerm] = useState('');

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    reservations: 0,
    arrivals: 0,
    departures: 0,
    reviews: 0,
    cancellations: 0
  });

  useEffect(() => {
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const propsRes = await fetch(`${API_URL}/api/properties/my-properties`, {
        credentials: 'include'
      });
      const propsData = await propsRes.json();
      const propsList = Array.isArray(propsData.properties) ? propsData.properties : [];
      setProperties(propsList);

      // Fetch bookings
      const bookingsRes = await fetch(`${API_URL}/api/bookings/property-owner`, {
        credentials: 'include'
      });
      const bookingsData = await bookingsRes.json();
      const bookingsList = Array.isArray(bookingsData.bookings) ? bookingsData.bookings : [];
      setBookings(bookingsList);

      // Fetch reviews
      try {
        const reviewsRes = await fetch(`${API_URL}/api/bookings/owner/reviews`, {
          credentials: 'include'
        });
        const reviewsData = await reviewsRes.json();
        if (reviewsRes.ok) {
          setReviews(Array.isArray(reviewsData.reviews) ? reviewsData.reviews : []);
        }
      } catch (e) {
        console.error('Failed to fetch reviews:', e);
        setReviews([]);
      }

      // Calculate summary stats
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const since48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const reservations = bookingsList.length;
      const arrivals = bookingsList.filter((b) => {
        if (!b.checkIn) return false;
        const checkIn = new Date(b.checkIn);
        return (
          checkIn >= now &&
          checkIn <= in48h &&
          (b.status === 'confirmed' || (b.paymentStatus || '').toLowerCase() === 'paid')
        );
      }).length;
      const departures = bookingsList.filter((b) => {
        if (!b.checkOut) return false;
        const checkOut = new Date(b.checkOut);
        return (
          checkOut >= now &&
          checkOut <= in48h &&
          (b.status === 'confirmed' || b.status === 'ended')
        );
      }).length;
      const reviewsCount = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews.length : 0;
      const cancellations = bookingsList.filter((b) => {
        if (b.status !== 'cancelled') return false;
        const ts = b.updatedAt || b.cancelledAt || b.createdAt;
        if (!ts) return false;
        const d = new Date(ts);
        return d >= since48h && d <= now;
      }).length;

      setSummaryStats({
        reservations,
        arrivals,
        departures,
        reviews: reviewsCount,
        cancellations
      });
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate property-level stats
  const getPropertyStats = (propertyId) => {
    const propertyBookings = bookings.filter(b => String(b.property?._id) === String(propertyId));
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    return {
      arrivals48h: propertyBookings.filter((b) => {
        if (!b.checkIn) return false;
        const checkIn = new Date(b.checkIn);
        return (
          checkIn >= now &&
          checkIn <= in48h &&
          (b.status === 'confirmed' || (b.paymentStatus || '').toLowerCase() === 'paid')
        );
      }).length,
      departures48h: propertyBookings.filter((b) => {
        if (!b.checkOut) return false;
        const checkOut = new Date(b.checkOut);
        return (
          checkOut >= now &&
          checkOut <= in48h &&
          (b.status === 'confirmed' || b.status === 'ended')
        );
      }).length,
      guestMessages: 0, // TODO: Implement guest messages count
      bookingMessages: propertyBookings.length, // Placeholder
      status: propertyBookings.length > 0 ? 'Open/Bookable' : 'Closed/Not bookable',
      isActive: propertyBookings.some(b => b.status === 'confirmed')
    };
  };

  // Filter properties
  const filteredProperties = properties.filter(prop => {
    if (filterStatus === 'open' && !prop.isActive) return false;
    if (filterStatus === 'closed' && prop.isActive) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const id = String(prop._id || '').toLowerCase();
      const name = String(prop.title || prop.name || '').toLowerCase();
      const location = String(prop.city || prop.address || '').toLowerCase();
      return id.includes(search) || name.includes(search) || location.includes(search);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Group homepage</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your properties and bookings</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Happening today - Summary Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Happening today</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reservations</p>
                  <p className="text-3xl font-bold text-gray-900">{summaryStats.reservations}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaCalendarAlt className="text-2xl text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Arrival</p>
                  <p className="text-3xl font-bold text-gray-900">{summaryStats.arrivals}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FaCheckCircle className="text-2xl text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Departures</p>
                  <p className="text-3xl font-bold text-gray-900">{summaryStats.departures}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FaUsers className="text-2xl text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{summaryStats.reviews}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FaStar className="text-2xl text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cancellations</p>
                  <p className="text-3xl font-bold text-gray-900">{summaryStats.cancellations}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FaTimes className="text-2xl text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Properties</h3>
                <p className="text-sm text-gray-600">Click on any property row to manage it</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mr-2">Filter by status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All properties</option>
                    <option value="open">Open/Bookable</option>
                    <option value="closed">Closed/Not bookable</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Filter by property ID, name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-sm text-gray-600 hover:text-gray-900">Download</button>
                <button className="text-sm text-gray-600 hover:text-gray-900">Customize data</button>
                <button className="text-sm text-gray-600 hover:text-gray-900">Customize view</button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status on Booking.com
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arrivals in next 48 hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departures in next 48 hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking.com messages
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No properties found
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((property) => {
                    const stats = getPropertyStats(property._id);
                    const propertyId = String(property._id || '').slice(-8);
                    return (
                      <tr 
                        key={property._id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/my-bookings?property=${property._id}&tab=overview`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {propertyId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {property.title || property.name || 'Unnamed property'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {property.city || property.address || property.location || 'Location not specified'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {property.isActive ? (
                              <>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-900">Open/Bookable</span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm text-gray-900">Closed/Not bookable</span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info('Property is closed. Contact support for more information.');
                                  }}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Learn why
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stats.arrivals48h > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {stats.arrivals48h}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stats.departures48h}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stats.guestMessages}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stats.bookingMessages > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {stats.bookingMessages}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation to property owner dashboard */}
        {properties.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Click on any property above to manage it, or use the button below to view all properties
            </p>
            <button
              onClick={() => navigate('/my-bookings?tab=overview')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View All Properties Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupHomePage;

