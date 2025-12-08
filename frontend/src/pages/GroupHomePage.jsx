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
  const [enforcementPaused, setEnforcementPaused] = useState(false);

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
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const [propsRes, bookingsRes, reviewsRes, settingsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include', headers: authHeaders }),
        fetch(`${API_URL}/api/bookings/property-owner`, { credentials: 'include', headers: authHeaders }),
        fetch(`${API_URL}/api/bookings/owner/reviews`, { credentials: 'include', headers: authHeaders }),
        // Mounted at /api/admin/commission-settings on the backend
        fetch(`${API_URL}/api/admin/commission-settings/public`, { credentials: 'include' }),
      ]);

      let propsList = [];
      let bookingsList = [];
      let reviewsList = [];

      if (propsRes.status === 'fulfilled') {
        try {
          const res = propsRes.value;
          const propsData = await res.json().catch(() => ({ properties: [] }));

          // Support multiple possible response shapes from the API
          if (Array.isArray(propsData.properties)) {
            propsList = propsData.properties;
          } else if (Array.isArray(propsData.data)) {
            propsList = propsData.data;
          } else if (Array.isArray(propsData)) {
            propsList = propsData;
          } else {
            propsList = [];
          }

          if (!res.ok) {
            console.error('Failed to fetch properties:', res.status, res.statusText, propsData?.message);
          }

          setProperties(propsList);
        } catch (e) {
          console.error('Failed to parse properties response:', e);
          setProperties([]);
        }
      } else {
        console.error('Failed to fetch properties:', propsRes.reason);
        setProperties([]);
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

      if (reviewsRes.status === 'fulfilled') {
        try {
          const reviewsData = await reviewsRes.value.json().catch(() => ({ reviews: [] }));
          if (reviewsRes.value.ok) {
            reviewsList = Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [];
            setReviews(reviewsList);
          }
        } catch (e) {
          console.error('Failed to parse reviews response:', e);
          setReviews([]);
        }
      } else {
        console.error('Failed to fetch reviews:', reviewsRes.reason);
        setReviews([]);
      }

      if (settingsRes.status === 'fulfilled') {
        try {
          const settingsData = await settingsRes.value.json().catch(() => ({}));
          setEnforcementPaused(!!settingsData.enforcementPaused);
        } catch (e) {
          console.error('Failed to parse commission settings response:', e);
          setEnforcementPaused(false);
        }
      } else {
        console.error('Failed to fetch commission settings:', settingsRes.reason);
        setEnforcementPaused(false);
      }

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
      const reviewsCount = reviewsList.length;
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
        cancellations,
      });
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      toast.error('Failed to load some data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate property-level stats based on property state + real bookings data
  const getPropertyStats = (property) => {
    if (!property) {
      return {
        arrivals48h: 0,
        departures48h: 0,
        guestMessages: 0,
        bookingMessages: 0,
        status: 'Closed/Not bookable',
        isActive: false,
      };
    }

    const propertyId = property._id;
    const propertyBookings = bookings.filter(b => String(b.property?._id) === String(propertyId));
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const arrivals48h = propertyBookings.filter((b) => {
      if (!b.checkIn) return false;
      const checkIn = new Date(b.checkIn);
      return (
        checkIn >= now &&
        checkIn <= in48h &&
        (b.status === 'confirmed' || (b.paymentStatus || '').toLowerCase() === 'paid')
      );
    }).length;

    const departures48h = propertyBookings.filter((b) => {
      if (!b.checkOut) return false;
      const checkOut = new Date(b.checkOut);
      return (
        checkOut >= now &&
        checkOut <= in48h &&
        (b.status === 'confirmed' || b.status === 'ended')
      );
    }).length;

    // Derive basic message counts from bookings so columns are not static
    const guestMessages = propertyBookings.reduce((sum, b) => {
      // Use any available message count fields, otherwise approximate by counting bookings
      const gm = Number(b.guestMessageCount || b.messageCount || 0);
      return sum + (isNaN(gm) ? 0 : gm);
    }, 0) || propertyBookings.length;

    const bookingMessages = propertyBookings.reduce((sum, b) => {
      const bm = Number(b.bookingMessageCount || 0);
      return sum + (isNaN(bm) ? 0 : bm);
    }, 0) || propertyBookings.length;

    // Real activation state: property is open/bookable when it's marked active,
    // not explicitly deactivated/blocked, and (when enforcement is active) does not have unpaid commission.
    const isActiveFromProperty = property.status === 'active' || property.isActive === true;
    const isDeactivated = property.isDeactivated === true || property.isBlocked === true;

    // unpaidCommission is already computed per-property by /api/properties/my-properties
    const unpaid = property.unpaidCommission || {};
    const unpaidAmount = Number(unpaid.unpaidAmount ?? unpaid.amount ?? 0) || 0;
    const hasUnpaidCommission = unpaidAmount > 0 || Number(unpaid.count || unpaid.bookingsCount || 0) > 0;

    // When enforcement is paused, we ignore unpaid commission for bookability on the group home page
    const shouldTreatAsUnpaid = !enforcementPaused && hasUnpaidCommission;

    const isActive = isActiveFromProperty && !isDeactivated && !shouldTreatAsUnpaid;

    let status;
    if (shouldTreatAsUnpaid) {
      status = 'Closed – unpaid commission';
    } else if (isActive) {
      status = 'Open/Bookable';
    } else {
      status = 'Closed/Not bookable';
    }

    return {
      arrivals48h,
      departures48h,
      guestMessages,
      bookingMessages,
      status,
      isActive,
    };
  };

  // Filter properties using derived stats so status is dynamic and respects real property activation
  const filteredProperties = properties.filter(prop => {
    const stats = getPropertyStats(prop);
    if (filterStatus === 'open' && !stats.isActive) return false;
    if (filterStatus === 'closed' && stats.isActive) return false;
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
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group homepage</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your properties and bookings</p>
          </div>

          {enforcementPaused && (
            <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs sm:text-sm text-yellow-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="font-semibold">Commission enforcement is temporarily paused.</span>
              <span className="sm:ml-2 text-[11px] sm:text-xs">
                Your properties stay open and bookable even if commissions are unpaid. Amounts are still tracked and will be enforced again when this pause ends.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
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
                    Status on Akwanda.rw
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
                    Akwanda.rw messages
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
                    const stats = getPropertyStats(property);
                    const propertyId = String(property._id || '').slice(-8);
                    return (
                      <tr 
                        key={property._id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          try {
                            if (typeof window !== 'undefined' && window.localStorage) {
                              window.localStorage.setItem('owner:lastPropertyId', String(property._id || ''));
                            }
                          } catch (_) {}
                          navigate(`/dashboard?property=${property._id}`);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {propertyId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="text-gray-400 mr-2" />
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">
                                  {property.title || property.name || 'Unnamed property'}
                                </div>
                                {/* Premium badge based on commission level */}
                                {(property.commissionLevel?.isPremium || property.isPremium) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-800">
                                    Premium
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {property.city || property.address || property.location || 'Location not specified'}
                              </div>
                              {/* Commission level summary, when available */}
                              {(property.commissionLevel || typeof property.commissionRate === 'number') && (
                                <div className="mt-1 text-xs text-gray-500 flex flex-wrap items-center gap-1">
                                  {property.commissionLevel?.name && (
                                    <span className="font-medium">
                                      Level: {property.commissionLevel.name}
                                    </span>
                                  )}
                                  {typeof property.commissionLevel?.onlineRate === 'number' && typeof property.commissionLevel?.directRate === 'number' && (
                                    <span>
                                      • Online {property.commissionLevel.onlineRate}% / Direct {property.commissionLevel.directRate}%
                                    </span>
                                  )}
                                  {(!property.commissionLevel || (typeof property.commissionLevel?.onlineRate !== 'number' && typeof property.commissionLevel?.directRate !== 'number')) && typeof property.commissionRate === 'number' && (
                                    <span>
                                      • Base commission {property.commissionRate}%
                                    </span>
                                  )}
                                </div>
                              )}
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
              onClick={() => navigate('/dashboard')}
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

