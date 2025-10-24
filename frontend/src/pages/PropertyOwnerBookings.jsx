import React, { useState, useEffect, useRef } from 'react';
import { 
  FaCalendarAlt, FaUsers, FaMoneyBillWave, FaCheckCircle, FaClock, 
  FaEye, FaFileInvoice, FaFilter, FaDownload, FaComments, FaHome, 
  FaChartLine, FaPlus, FaSearch, FaChevronDown, FaChevronUp, 
  FaEdit, FaTrash, FaStar, FaPhone, FaEnvelope, FaDollarSign,
  FaMapMarkerAlt, FaBed, FaBath, FaWifi, FaCar, FaSwimmingPool,
  FaUtensils, FaTv, FaSnowflake, FaPaw, FaSmokingBan,
  FaExclamationTriangle, FaTimes, FaCheck, FaArrowRight,
  FaCalendarCheck, FaCalendarTimes, FaUserCheck, FaUserTimes
} from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import BookingCalendar from '../components/BookingCalendar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PropertyOwnerBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    unpaid: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    totalProperties: 0,
    activeProperties: 0,
    occupancyRate: 0,
    averageRating: 0
  });
  const [showDirectBooking, setShowDirectBooking] = useState(false);
  const [directForm, setDirectForm] = useState({
    propertyId: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    guestInfo: { firstName: '', lastName: '', email: '', phone: '' },
    contactInfo: { email: '', phone: '' },
    paymentMethod: 'cash',
    markPaid: true,
    specialRequests: ''
  });
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    property: 'all',
    dateRange: 'all',
    year: new Date().getFullYear(),
    search: ''
  });
  const [ownerView, setOwnerView] = useState('table'); // 'table' | 'calendar'
  const [expandedSections, setExpandedSections] = useState({
    reservations: true,
    calendar: false,
    finance: false,
    analytics: false,
    promotions: false,
    reviews: false,
    messages: false,
    settings: false,
    revenue: false,
    advancedAnalytics: false,
    reviewsManagement: false,
    propertyPerformance: false,
    guestCommunication: false
  });
  const calendarRef = useRef(null);

  // Removed mock data. We will fetch live data from the backend.

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookRes, propRes, occRes] = await Promise.all([
        fetch(`${API_URL}/api/bookings/property-owner`, { credentials: 'include' }),
        fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' }),
        fetch(`${API_URL}/api/bookings/owner/visitors-analytics`, { credentials: 'include' })
      ]);
      const [bookJson, propJson, occJson] = await Promise.all([bookRes.json(), propRes.json(), occRes.json()]);
      if (bookRes.ok) setBookings(bookJson.bookings || []);
      if (propRes.ok) {
        const props = propJson.properties || [];
        setProperties(props);
        // Ensure a concrete propertyId is selected so the calendar fetch runs
        if (props.length && filters.property === 'all') {
          setFilters(prev => ({ ...prev, property: props[0]._id }));
        }
      }
      const list = bookRes.ok ? (bookJson.bookings || []) : [];
      setStats({
        total: list.length,
        paid: list.filter(b => b.paymentStatus === 'paid' || b.status === 'confirmed').length,
        pending: list.filter(b => b.paymentStatus === 'pending' || b.status === 'pending').length,
        unpaid: list.filter(b => b.paymentStatus === 'unpaid').length,
        totalRevenue: list.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        pendingRevenue: list.filter(b => (b.paymentStatus === 'pending' || b.status === 'pending')).reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        totalProperties: (propJson.properties || []).length,
        activeProperties: (propJson.properties || []).filter(p => p.status === 'active').length,
        occupancyRate: Math.max(0, Math.min(100, Number(occJson?.kpis?.occupancyPercent || 0))),
        averageRating: 0
      });
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadOwnerProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setProperties(data.properties || []);
    } catch (_) {}
  };

  useEffect(() => { loadOwnerProperties(); }, []);

  // Respond to navbar dropdown links like /my-bookings?tab=properties
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'properties' || tab === 'calendar') {
      setOwnerView('calendar');
      // Ensure a property is selected to render the calendar
      if (properties.length && filters.property === 'all') {
        setFilters(prev => ({ ...prev, property: properties[0]._id }));
      }
      // Expand and scroll to calendar
      setExpandedSections(prev => ({ ...prev, calendar: true }));
      setTimeout(() => {
        if (calendarRef.current) {
          calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.search, properties, filters.property]);

  const onDirectChange = (path, value) => {
    setDirectForm(prev => {
      if (path.includes('.')) {
        const [p, c] = path.split('.');
        return { ...prev, [p]: { ...prev[p], [c]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  const onSelectProperty = async (pid) => {
    onDirectChange('propertyId', pid);
    onDirectChange('roomId', '');
    setOwnerRooms([]);
    if (!pid) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${pid}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setOwnerRooms(data.property?.rooms || []);
    } catch (_) {}
  };

  const submitDirectBooking = async () => {
    try {
      if (!directForm.propertyId || !directForm.roomId || !directForm.checkIn || !directForm.checkOut) {
        toast.error('Please fill property, room, dates');
        return;
      }
      if (!directForm.guestInfo.firstName || !directForm.guestInfo.lastName || !directForm.guestInfo.phone) {
        toast.error('Guest name and phone are required');
        return;
      }
      const payload = {
        propertyId: directForm.propertyId,
        room: directForm.roomId,
        checkIn: directForm.checkIn,
        checkOut: directForm.checkOut,
        numberOfGuests: directForm.guests,
        contactInfo: directForm.contactInfo,
        specialRequests: directForm.specialRequests,
        groupBooking: directForm.guests >= 4,
        groupSize: directForm.guests,
        paymentMethod: directForm.paymentMethod,
        guestInfo: directForm.guestInfo,
        markPaid: directForm.paymentMethod === 'cash' ? directForm.markPaid : false,
        directBooking: true
      };
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create booking');
      toast.success('Direct booking recorded');
      setShowDirectBooking(false);
      // Open simplified direct receipt for printing/saving
      if (data?.booking?._id) {
        window.open(`${API_URL}/api/bookings/${data.booking._id}/direct-receipt.csv`, '_blank');
        navigate(`/booking-confirmation/${data.booking._id}`);
      } else {
        loadData();
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleViewReceipt = (booking) => {
    setSelectedBooking(booking);
    setShowReceipt(true);
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      // API call to update status
      setBookings(prev => prev.map(b => 
        b._id === bookingId ? { ...b, status: newStatus } : b
      ));
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filters.status !== 'all' && booking.status !== filters.status && booking.paymentStatus !== filters.status) return false;
    if (filters.property !== 'all' && String(booking.property?._id) !== String(filters.property)) return false;
    const guestName = `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim().toLowerCase();
    if (filters.search && !guestName.includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const renderBookingCard = (booking) => (
    <div key={booking._id} className="modern-card p-6 hover:scale-105 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{booking.property.name}</h3>
          <p className="text-sm text-gray-600 flex items-center">
            <FaMapMarkerAlt className="mr-1" />
            {booking.property.location}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          booking.status === 'paid' ? 'bg-green-100 text-green-800' :
          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {booking.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Guest</p>
          <p className="font-medium">{booking.guest.name}</p>
          <p className="text-sm text-gray-500">{booking.guest.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Dates</p>
          <p className="font-medium">{booking.checkIn} - {booking.checkOut}</p>
          <p className="text-sm text-gray-500">{booking.guests} guests</p>
        </div>
      </div>

      {/* Finance History */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Finance History</h2>
          <div ref={calendarRef} className="neu-card p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map(tr => (
                  <tr key={`fin-${tr._id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(tr.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{tr.confirmationCode || tr._id}</td>
                    <td className="px-4 py-3 text-sm">{tr.property?.title || tr.property?.name || 'Property'}</td>
                    <td className="px-4 py-3 text-sm">{`${tr.guest?.firstName || ''} ${tr.guest?.lastName || ''}`.trim() || tr.guest?.email || 'Guest'}</td>
                    <td className="px-4 py-3 text-right font-semibold">RWF {(tr.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{tr.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm">{tr.paymentStatus || tr.status}</td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No finance history yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-xl font-bold text-blue-600">RWF {booking.totalAmount.toLocaleString()}</p>
        </div>
        {booking.rating && (
          <div className="flex items-center">
            <FaStar className="text-yellow-400 mr-1" />
            <span className="font-medium">{booking.rating}</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => handleViewDetails(booking)}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <FaEye className="mr-2" />
          View Details
        </button>
        <button
          onClick={() => handleViewReceipt(booking)}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
        >
          <FaFileInvoice className="mr-2" />
          Receipt
        </button>
        <button
          onClick={() => navigate(`/messages?booking=${booking._id}`)}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaComments />
        </button>
      </div>
    </div>
  );
  const renderBookingDetails = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Booking Details</h2>
            <button
              onClick={() => setShowBookingDetails(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {selectedBooking && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Guest Information */}
              <div className="modern-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FaUser className="mr-2" />
                  Guest Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedBooking.guest.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedBooking.guest.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedBooking.guest.phone}</p>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                      <FaEnvelope className="mr-2" />
                      Email
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center">
                      <FaPhone className="mr-2" />
                      Call
                    </button>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="modern-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FaCalendarAlt className="mr-2" />
                  Booking Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-medium">{selectedBooking.property.name}</p>
                    <p className="text-sm text-gray-500">{selectedBooking.property.location}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Check-in</p>
                      <p className="font-medium">{selectedBooking.checkIn}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out</p>
                      <p className="font-medium">{selectedBooking.checkOut}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Guests</p>
                    <p className="font-medium">{selectedBooking.guests} guests</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-blue-600">RWF {selectedBooking.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {selectedBooking.specialRequests && (
                <div className="modern-card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FaComments className="mr-2" />
                    Special Requests
                  </h3>
                  <p className="text-gray-700">{selectedBooking.specialRequests}</p>
                </div>
              )}

              {/* Review */}
              {selectedBooking.review && (
                <div className="modern-card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FaStar className="mr-2" />
                    Guest Review
                  </h3>
                  <div className="flex items-center mb-2">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span className="font-medium">{selectedBooking.rating}</span>
                  </div>
                  <p className="text-gray-700">{selectedBooking.review}</p>
                </div>
              )}

              {/* Actions */}
              <div className="modern-card p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleStatusChange(selectedBooking._id, 'paid')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <FaCheck className="mr-2" />
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedBooking._id, 'pending')}
                    className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center"
                  >
                    <FaClock className="mr-2" />
                    Mark as Pending
                  </button>
                  <button
                    onClick={() => navigate(`/messages?booking=${selectedBooking._id}`)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FaComments className="mr-2" />
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderReceipt = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Booking Receipt</h2>
            <button
              onClick={() => setShowReceipt(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {selectedBooking && (
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">AKWANDA.rw</h3>
              <p className="text-gray-600">Booking Receipt</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Booking ID:</span>
                <span className="font-medium">{selectedBooking._id}</span>
              </div>
              <div className="flex justify-between">
                <span>Property:</span>
                <span className="font-medium">{selectedBooking.property.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Guest:</span>
                <span className="font-medium">{selectedBooking.guest.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="font-medium">{selectedBooking.checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out:</span>
                <span className="font-medium">{selectedBooking.checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span>Guests:</span>
                <span className="font-medium">{selectedBooking.guests}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600">RWF {selectedBooking.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Owner Dashboard</h1>
              <p className="text-gray-600">Manage your properties, bookings, and revenue</p>
            </div>
            <button
              onClick={() => setShowDirectBooking(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaPlus />
              New Direct Booking
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <FaCalendarAlt className="text-3xl text-blue-600" />
            </div>
          </div>
          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">RWF {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <FaMoneyBillWave className="text-3xl text-green-600" />
            </div>
          </div>
          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Properties</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalProperties}</p>
              </div>
              <FaHome className="text-3xl text-purple-600" />
            </div>
          </div>
          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold text-orange-600">{stats.occupancyRate}%</p>
              </div>
              <FaChartLine className="text-3xl text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="neu-card p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="modern-input"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select
              value={filters.property}
              onChange={(e) => setFilters(prev => ({ ...prev, property: e.target.value }))}
              className="modern-input"
            >
              <option value="all">All Properties</option>
              {properties.map(prop => (
                <option key={prop._id} value={prop._id}>{prop.name}</option>
              ))}
            </select>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))}
              className="modern-input"
            >
              {Array.from({ length: 11 }, (_, k) => new Date().getFullYear() - 5 + k).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="flex-1 min-w-64">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by guest name..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="modern-input pl-10 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bookings / Calendar Card */}
        <div className="neu-card p-0 overflow-x-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="font-semibold text-gray-800">Clients & Calendar</div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded ${ownerView === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                onClick={() => setOwnerView('table')}
              >
                Table
              </button>
              <button
                className={`px-3 py-1 rounded ${ownerView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                onClick={() => setOwnerView('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>

          {ownerView === 'table' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direct</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map(b => {
                const guestName = `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`.trim() || b.guest?.email || 'Guest';
                const propertyTitle = b.property?.title || b.property?.name || 'Property';
                const propertyLocation = b.property?.city || b.property?.address || '';
                const checkIn = new Date(b.checkIn).toLocaleDateString();
                const checkOut = new Date(b.checkOut).toLocaleDateString();
                return (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{guestName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{b.guest?.email || '-'}</div>
                      <div>{b.guest?.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="font-medium text-gray-900">{propertyTitle}</div>
                      <div className="text-gray-500">{propertyLocation}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{checkIn} → {checkOut}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.numberOfGuests || b.guests || 1}</td>
                    <td className="px-4 py-3 text-right font-semibold">RWF {(b.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        (b.paymentStatus === 'paid' || b.status === 'confirmed') ? 'bg-green-100 text-green-800' :
                        (b.paymentStatus === 'pending' || b.status === 'pending') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {b.paymentStatus || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{b.isDirect ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm space-x-1">
                      <button
                        onClick={() => navigate(`/receipt/${b._id}?direct=${b.isDirect ? 'true' : 'false'}`)}
                        className="p-2 rounded bg-green-50 text-green-700 hover:bg-green-100"
                        aria-label="Receipt"
                        title="Receipt"
                      >
                        <FaFileInvoice />
                      </button>
                      <button
                        onClick={() => navigate(`/invoice/${b._id}?direct=${b.isDirect ? 'true' : 'false'}`)}
                        className="p-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
                        aria-label="Invoice"
                        title="Invoice"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => navigate(`/messages?booking=${b._id}`)}
                        className="p-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        aria-label="Chat"
                        title="Chat"
                      >
                        <FaComments />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}

          {ownerView === 'calendar' && (
            <div className="p-4">
              {(() => {
                const propertyForCalendar = filters.property !== 'all' ? filters.property : (properties[0]?._id || '');
                if (!propertyForCalendar) {
                  return (
                    <div className="text-gray-500 py-8 text-center">Select a property to view its calendar.</div>
                  );
                }
                const params = new URLSearchParams(location.search);
                const mo = parseInt(params.get('monthOffset') || '0', 10);
                const base = new Date(filters.year, new Date().getMonth(), 1);
                if (!isNaN(mo)) {
                  base.setMonth(base.getMonth() + mo);
                }
                return (
                  <BookingCalendar
                    propertyId={propertyForCalendar}
                    initialDate={base}
                    onBookingSelect={(booking) => {
                      setSelectedBooking(booking);
                      setShowBookingDetails(true);
                    }}
                  />
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Management Section */}
      <div className="neu-card p-0 mb-8">
        <div 
          className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('revenue')}
        >
          <div className="flex items-center space-x-3">
            <FaMoneyBillWave className="text-green-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Revenue Management</h2>
          </div>
          {expandedSections.revenue ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        
        {expandedSections.revenue && (
          <div className="p-6 space-y-6">
            {/* Pricing Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <FaDollarSign className="mr-2" />
                  Dynamic Pricing
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Base Rate</span>
                    <div className="flex items-center space-x-2">
                      <input type="number" className="w-20 px-2 py-1 border rounded" placeholder="100" />
                      <span className="text-blue-900">RWF/night</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Weekend Premium</span>
                    <div className="flex items-center space-x-2">
                      <input type="number" className="w-16 px-2 py-1 border rounded" placeholder="20" />
                      <span className="text-blue-900">%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Peak Season</span>
                    <div className="flex items-center space-x-2">
                      <input type="number" className="w-16 px-2 py-1 border rounded" placeholder="50" />
                      <span className="text-blue-900">%</span>
                    </div>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Update Pricing Rules
                  </button>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                  <FaChartLine className="mr-2" />
                  Revenue Insights
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-700">This Month</span>
                    <span className="font-semibold text-green-900">RWF {stats.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Average Daily Rate</span>
                    <span className="font-semibold text-green-900">RWF {Math.round(stats.totalRevenue / Math.max(stats.total, 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Revenue per Property</span>
                    <span className="font-semibold text-green-900">RWF {Math.round(stats.totalRevenue / Math.max(stats.totalProperties, 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Occupancy Rate</span>
                    <span className="font-semibold text-green-900">{stats.occupancyRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Calendar */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaCalendarAlt className="mr-2 text-blue-600" />
                Rate Calendar
              </h3>
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="font-semibold text-gray-600 py-2">{day}</div>
                ))}
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="border border-gray-200 rounded p-2 hover:bg-blue-50 cursor-pointer">
                    <div className="text-xs text-gray-600">{((i % 30) + 1)}</div>
                    <div className="text-xs font-semibold text-blue-600">RWF 100k</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Analytics Section */}
      <div className="neu-card p-0 mb-8">
        <div 
          className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('advancedAnalytics')}
        >
          <div className="flex items-center space-x-3">
            <FaChartLine className="text-purple-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Advanced Analytics</h2>
          </div>
          {expandedSections.advancedAnalytics ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        
        {expandedSections.advancedAnalytics && (
          <div className="p-6 space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Booking Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Conversion Rate</span>
                    <span className="font-semibold text-purple-900">12.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Avg. Booking Value</span>
                    <span className="font-semibold text-purple-900">RWF {Math.round(stats.totalRevenue / Math.max(stats.total, 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Repeat Guests</span>
                    <span className="font-semibold text-purple-900">23%</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-4">Market Position</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-orange-700">Market Share</span>
                    <span className="font-semibold text-orange-900">8.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-700">Competitor Rank</span>
                    <span className="font-semibold text-orange-900">#3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-700">Price Competitiveness</span>
                    <span className="font-semibold text-orange-900">Good</span>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-teal-900 mb-4">Guest Satisfaction</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-teal-700">Average Rating</span>
                    <span className="font-semibold text-teal-900 flex items-center">
                      <FaStar className="text-yellow-400 mr-1" />
                      {stats.averageRating || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-700">Response Rate</span>
                    <span className="font-semibold text-teal-900">95%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-700">Review Score</span>
                    <span className="font-semibold text-teal-900">Excellent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Trends Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaChartLine className="mr-2 text-purple-600" />
                Revenue Trends (Last 12 Months)
              </h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FaChartLine className="text-4xl mx-auto mb-2" />
                  <p>Revenue chart visualization</p>
                  <p className="text-sm">Integration with Chart.js recommended</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guest Reviews Management */}
      <div className="neu-card p-0 mb-8">
        <div 
          className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('reviewsManagement')}
        >
          <div className="flex items-center space-x-3">
            <FaStar className="text-yellow-500 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Guest Reviews Management</h2>
          </div>
          {expandedSections.reviewsManagement ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        
        {expandedSections.reviewsManagement && (
          <div className="p-6 space-y-6">
            {/* Review Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <FaStar className="text-yellow-500 text-2xl mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-900">{stats.averageRating || 'N/A'}</div>
                <div className="text-sm text-yellow-700">Average Rating</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <FaCheckCircle className="text-green-500 text-2xl mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-900">24</div>
                <div className="text-sm text-green-700">Total Reviews</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <FaClock className="text-orange-500 text-2xl mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-900">3</div>
                <div className="text-sm text-orange-700">Pending Response</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <FaComments className="text-blue-500 text-2xl mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">95%</div>
                <div className="text-sm text-blue-700">Response Rate</div>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">Guest {i}</span>
                          <div className="flex text-yellow-400">
                            {[1, 2, 3, 4, 5].map(star => (
                              <FaStar key={star} className="text-sm" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">Great location and clean rooms. Highly recommended!</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">2 days ago</div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm mt-1">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                View All Reviews
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Property Performance */}
      <div className="neu-card p-0 mb-8">
        <div 
          className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('propertyPerformance')}
        >
          <div className="flex items-center space-x-3">
            <FaHome className="text-indigo-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Property Performance</h2>
          </div>
          {expandedSections.propertyPerformance ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        
        {expandedSections.propertyPerformance && (
          <div className="p-6 space-y-6">
            {/* Property Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {properties.slice(0, 4).map(property => (
                <div key={property._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{property.title || property.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center">
                        <FaMapMarkerAlt className="mr-1" />
                        {property.city || property.address}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      property.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Occupancy</div>
                      <div className="text-lg font-semibold text-indigo-600">75%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Revenue</div>
                      <div className="text-lg font-semibold text-green-600">RWF 450k</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Rating</div>
                      <div className="text-lg font-semibold text-yellow-600 flex items-center">
                        <FaStar className="mr-1" />
                        {property.rating || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Bookings</div>
                      <div className="text-lg font-semibold text-blue-600">12</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                      View Details
                    </button>
                    <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                      Edit Property
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Guest Communication Templates */}
      <div className="neu-card p-0 mb-8">
        <div 
          className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('guestCommunication')}
        >
          <div className="flex items-center space-x-3">
            <FaComments className="text-blue-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Guest Communication Templates</h2>
          </div>
          {expandedSections.guestCommunication ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        
        {expandedSections.guestCommunication && (
          <div className="p-6 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-green-50 border border-green-200 rounded-lg p-4 text-left hover:bg-green-100 transition-colors">
                <FaCheckCircle className="text-green-600 text-xl mb-2" />
                <h3 className="font-semibold text-green-900">Booking Confirmation</h3>
                <p className="text-sm text-green-700">Send confirmation details</p>
              </button>
              <button className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors">
                <FaCalendarAlt className="text-blue-600 text-xl mb-2" />
                <h3 className="font-semibold text-blue-900">Check-in Instructions</h3>
                <p className="text-sm text-blue-700">Pre-arrival information</p>
              </button>
              <button className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left hover:bg-purple-100 transition-colors">
                <FaStar className="text-purple-600 text-xl mb-2" />
                <h3 className="font-semibold text-purple-900">Review Request</h3>
                <p className="text-sm text-purple-700">Post-stay feedback</p>
              </button>
            </div>

            {/* Message Templates */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Templates</h3>
              <div className="space-y-4">
                {[
                  { title: "Welcome Message", trigger: "After booking confirmation", status: "Active" },
                  { title: "Check-in Instructions", trigger: "24 hours before arrival", status: "Active" },
                  { title: "Thank You & Review Request", trigger: "After checkout", status: "Active" },
                  { title: "Special Offers", trigger: "Manual send", status: "Draft" }
                ].map((template, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.title}</h4>
                      <p className="text-sm text-gray-600">{template.trigger}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        template.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.status}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Create New Template
              </button>
            </div>

            {/* Automated Messaging Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Message Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Messages Sent</span>
                    <span className="font-semibold text-indigo-900">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Response Rate</span>
                    <span className="font-semibold text-indigo-900">87%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Avg Response Time</span>
                    <span className="font-semibold text-indigo-900">2.3 hrs</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-emerald-900 mb-4">Guest Satisfaction</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Communication Rating</span>
                    <span className="font-semibold text-emerald-900 flex items-center">
                      <FaStar className="text-yellow-400 mr-1" />
                      4.8
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Positive Feedback</span>
                    <span className="font-semibold text-emerald-900">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Complaints</span>
                    <span className="font-semibold text-emerald-900">2</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-amber-900 mb-4">Automation Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Active Templates</span>
                    <span className="font-semibold text-amber-900">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Scheduled Messages</span>
                    <span className="font-semibold text-amber-900">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Success Rate</span>
                    <span className="font-semibold text-amber-900">99.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBookingDetails && renderBookingDetails()}
      {showReceipt && renderReceipt()}
      {showDirectBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold">New Direct Booking</h2>
              <button onClick={() => setShowDirectBooking(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Property</label>
                  <select
                    value={directForm.propertyId}
                    onChange={(e) => onSelectProperty(e.target.value)}
                    className="modern-input w-full"
                  >
                    <option value="">Select property</option>
                    {properties.map(p => (
                      <option key={p._id} value={p._id}>{p.title || p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Room</label>
                  <select
                    value={directForm.roomId}
                    onChange={(e) => onDirectChange('roomId', e.target.value)}
                    className="modern-input w-full"
                  >
                    <option value="">Select room</option>
                    {ownerRooms.map(r => (
                      <option key={r._id} value={r._id}>{r.roomNumber} • {r.roomType}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Check-in</label>
                  <input type="date" value={directForm.checkIn} onChange={(e) => onDirectChange('checkIn', e.target.value)} className="modern-input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Check-out</label>
                  <input type="date" value={directForm.checkOut} onChange={(e) => onDirectChange('checkOut', e.target.value)} className="modern-input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Guests</label>
                  <input type="number" min={1} value={directForm.guests} onChange={(e) => onDirectChange('guests', Number(e.target.value))} className="modern-input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <select value={directForm.paymentMethod} onChange={(e) => onDirectChange('paymentMethod', e.target.value)} className="modern-input w-full">
                    <option value="cash">Cash</option>
                    <option value="mtn_mobile_money">MTN Mobile Money</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Guest First Name</label>
                  <input type="text" value={directForm.guestInfo.firstName} onChange={(e) => onDirectChange('guestInfo.firstName', e.target.value)} className="modern-input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Guest Last Name</label>
                  <input type="text" value={directForm.guestInfo.lastName} onChange={(e) => onDirectChange('guestInfo.lastName', e.target.value)} className="modern-input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Guest Phone</label>
                  <input type="tel" value={directForm.guestInfo.phone} onChange={(e) => onDirectChange('guestInfo.phone', e.target.value)} className="modern-input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Guest Email (optional)</label>
                  <input type="email" value={directForm.guestInfo.email} onChange={(e) => onDirectChange('guestInfo.email', e.target.value)} className="modern-input w-full" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contact Phone</label>
                  <input type="tel" value={directForm.contactInfo.phone} onChange={(e) => onDirectChange('contactInfo.phone', e.target.value)} className="modern-input w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contact Email</label>
                  <input type="email" value={directForm.contactInfo.email} onChange={(e) => onDirectChange('contactInfo.email', e.target.value)} className="modern-input w-full" />
                </div>
              </div>

              {directForm.paymentMethod === 'cash' && (
                <div className="flex items-center gap-2">
                  <input id="markPaid" type="checkbox" checked={!!directForm.markPaid} onChange={(e) => onDirectChange('markPaid', e.target.checked)} />
                  <label htmlFor="markPaid" className="text-sm text-gray-600">Mark as paid now</label>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Special Requests</label>
                <textarea value={directForm.specialRequests} onChange={(e) => onDirectChange('specialRequests', e.target.value)} className="modern-input w-full" rows={3} />
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDirectBooking(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg">Cancel</button>
                <button onClick={submitDirectBooking} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Create Booking</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyOwnerBookings;