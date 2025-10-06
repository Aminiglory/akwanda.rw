import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUsers, FaMoneyBillWave, FaCheckCircle, FaClock, FaEye, FaFileInvoice, FaFilter, FaDownload, FaComments, FaHome, FaChartLine } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import BookingManagementPanel from '../components/BookingManagementPanel';
import RoomCalendarPanel from '../components/RoomCalendarPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PropertyOwnerBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, paid, pending, unpaid
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, properties, analytics
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [unreadByBooking, setUnreadByBooking] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    unpaid: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    totalProperties: 0,
    activeProperties: 0
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Fetch bookings
      const bookingsRes = await fetch(`${API_URL}/api/bookings/property-owner`, {
        credentials: 'include'
      });
      
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
      } else {
        console.warn('Failed to fetch bookings');
        setBookings([]);
      }

      // Fetch unread messages grouped by booking
      try {
        const unreadRes = await fetch(`${API_URL}/api/messages/unread-by-booking`, { credentials: 'include' });
        if (unreadRes.ok) {
          const unreadData = await unreadRes.json();
          setUnreadByBooking(unreadData.unreadByBooking || {});
        } else {
          setUnreadByBooking({});
        }
      } catch (e) {
        console.warn('Unread-by-booking fetch failed:', e);
        setUnreadByBooking({});
      }
      
      // Fetch properties (with fallback to older endpoint)
      let loadedProperties = [];
      try {
        const propertiesRes = await fetch(`${API_URL}/api/properties/my-properties`, {
          credentials: 'include'
        });
        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json();
          loadedProperties = propertiesData.properties || [];
        }
      } catch (e) {
        console.warn('Primary properties fetch failed:', e);
      }

      // Fallback to /api/properties/mine if primary route returned nothing
      if (!loadedProperties || loadedProperties.length === 0) {
        try {
          const altRes = await fetch(`${API_URL}/api/properties/mine`, {
            credentials: 'include'
          });
          if (altRes.ok) {
            const altData = await altRes.json();
            loadedProperties = altData.properties || [];
          }
        } catch (e) {
          console.warn('Fallback properties fetch failed:', e);
        }
      }
      setProperties(loadedProperties || []);
    } catch (error) {
      console.error('Fetch error:', error);
      setBookings([]);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = bookings.length;
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.isActive).length;
    const paid = bookings.filter(b => b.paymentStatus === 'paid').length;
    const pending = bookings.filter(b => b.paymentStatus === 'pending').length;
    const unpaid = bookings.filter(b => b.paymentStatus === 'unpaid').length;
    
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);
    
    const pendingRevenue = bookings
      .filter(b => b.paymentStatus === 'unpaid' || b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);

    setStats({ total, paid, pending, unpaid, totalRevenue, pendingRevenue, totalProperties, activeProperties });
  };

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowBookingPanel(true);
  };

  const handleCloseBookingPanel = () => {
    setShowBookingPanel(false);
    setSelectedBooking(null);
  };

  const handleBookingUpdate = () => {
    fetchBookings();
  };

  const getFilteredBookings = () => {
    let filtered = bookings;

    // Apply payment status filter
    if (filter !== 'all') {
      filtered = filtered.filter(b => b.paymentStatus === filter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.confirmationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.guest?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.guest?.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: 'Paid' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaClock, label: 'Pending' },
      unpaid: { bg: 'bg-red-100', text: 'text-red-800', icon: FaClock, label: 'Unpaid (Pay on Arrival)' },
      failed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaClock, label: 'Failed' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="mr-1" />
        {config.label}
      </span>
    );
  };

  const exportToCSV = () => {
    const csvData = getFilteredBookings().map(booking => ({
      'Confirmation Code': booking.confirmationCode,
      'Property': booking.property?.title || 'N/A',
      'Guest': `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`,
      'Check-in': formatDate(booking.checkIn),
      'Check-out': formatDate(booking.checkOut),
      'Guests': booking.numberOfGuests,
      'Total Amount': booking.totalAmount,
      'Tax Amount': booking.taxAmount || 0,
      'Commission': booking.commissionAmount,
      'Your Earnings': (booking.amountBeforeTax || booking.totalAmount) - booking.commissionAmount,
      'Payment Status': booking.paymentStatus,
      'Payment Method': booking.paymentMethod,
      'Transaction ID': booking.transactionId || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Bookings exported successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  // If the property owner has no listings, show a clear CTA and stop here
  if ((properties || []).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">Become a Property Owner on AKWANDA</h1>
              <p className="text-blue-100">You need at least one active listing to access booking tracking and guest messaging.</p>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                <p className="text-gray-700">
                  Add your first property to start receiving bookings, track payments, and chat with your guests in real time.
                </p>
                <ul className="list-disc list-inside text-gray-600">
                  <li>Full booking tracking (paid, pending, pay on arrival)</li>
                  <li>Guest–Owner messaging with notifications</li>
                  <li>Receipts with EBM tax breakdown</li>
                  <li>Export bookings to CSV</li>
                </ul>
                <div className="pt-4">
                  <button
                    onClick={() => navigate('/upload')}
                    className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <span>Add Your First Listing</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header + Tabs */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Property Bookings</h1>
          <p className="text-gray-600 mb-4">Track bookings, view room calendars, and manage availability</p>
          <div className="flex items-center gap-4 border-b">
            {[
              { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
              { id: 'properties', label: 'Calendars', icon: FaHome },
              { id: 'analytics', label: 'Analytics', icon: FaChartLine }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 -mb-px border-b-2 ${active ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  <Icon />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="text-2xl text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Paid Bookings</p>
                <p className="text-3xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="text-2xl text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="text-2xl text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">After commission</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Revenue</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FaClock className="text-2xl text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.pending + stats.unpaid} pending bookings</p>
          </div>
        </div>

        {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <FaFilter className="text-gray-400" />
              <div className="flex space-x-2">
                {['all', 'paid', 'pending', 'unpaid'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FaDownload />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <FaCalendarAlt className="text-4xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600">
                {filter !== 'all' ? 'Try changing the filter' : 'Your bookings will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            {booking.property?.title || 'N/A'}
                            {unreadByBooking[booking._id] > 0 && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"
                                title={`${unreadByBooking[booking._id]} unread message${unreadByBooking[booking._id] > 1 ? 's' : ''}`}
                                aria-label="Unread messages"
                              />
                            )}
                          </p>
                          <p className="text-sm text-gray-600">Code: {booking.confirmationCode}</p>
                          <p className="text-xs text-gray-500">{booking.numberOfGuests} guests</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.guest?.firstName} {booking.guest?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{booking.guest?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{formatDate(booking.checkIn)}</p>
                          <p className="text-gray-600">to {formatDate(booking.checkOut)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{formatCurrency(booking.totalAmount)}</p>
                          <p className="text-xs text-gray-600">Tax: {formatCurrency(booking.taxAmount || 0)}</p>
                          <p className="text-xs text-green-600">
                            You earn: {formatCurrency((booking.amountBeforeTax || booking.totalAmount) - booking.commissionAmount)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {getPaymentStatusBadge(booking.paymentStatus)}
                          <p className="text-xs text-gray-600 capitalize">
                            {booking.paymentMethod?.replace('_', ' ')}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewBooking(booking)}
                            className="relative p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Manage & Message"
                          >
                            <FaComments />
                            {unreadByBooking[booking._id] > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full">
                                {unreadByBooking[booking._id]}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => navigate(`/booking-confirmation/${booking._id}`)}
                            className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => {
                              // Open receipt in new tab
                              window.open(`/booking-confirmation/${booking._id}`, '_blank');
                            }}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                            title="View Receipt"
                          >
                            <FaFileInvoice />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            {properties.map((p) => (
              <div key={p._id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{p.title}</h3>
                    <p className="text-sm text-gray-600">{p.city} • {p.address}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded border text-gray-600">{(p.category || 'apartment').toUpperCase()}</span>
                </div>
                {Array.isArray(p.rooms) && p.rooms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {p.rooms.map((room) => (
                      <RoomCalendarPanel
                        key={room._id || room.roomNumber}
                        propertyId={p._id}
                        room={room}
                        onChanged={fetchBookings}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No rooms configured for this property.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Record Keeping Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-700 font-medium">Paid Bookings:</p>
              <p className="text-blue-900 text-xl font-bold">{stats.paid}</p>
              <p className="text-blue-600">Revenue: {formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-yellow-700 font-medium">Pending Payments:</p>
              <p className="text-yellow-900 text-xl font-bold">{stats.pending}</p>
              <p className="text-yellow-600">Expected: {formatCurrency(stats.pendingRevenue)}</p>
            </div>
            <div>
              <p className="text-red-700 font-medium">Pay on Arrival:</p>
              <p className="text-red-900 text-xl font-bold">{stats.unpaid}</p>
              <p className="text-red-600">To be collected at check-in</p>
            </div>
          </div>
        </div>
      </div>

      {showBookingPanel && selectedBooking && (
        <BookingManagementPanel
          booking={selectedBooking}
          onClose={handleCloseBookingPanel}
          onUpdate={handleBookingUpdate}
        />
      )}
    </div>
  );
};

export default PropertyOwnerBookings;
