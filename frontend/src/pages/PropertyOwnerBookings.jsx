import React, { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, FaUsers, FaMoneyBillWave, FaCheckCircle, FaClock, 
  FaEye, FaFileInvoice, FaFilter, FaDownload, FaComments, FaHome, 
  FaChartLine, FaPlus, FaSearch, FaChevronDown, FaChevronUp, 
  FaEdit, FaTrash, FaStar, FaMessage, FaPhone, FaEnvelope,
  FaMapMarkerAlt, FaBed, FaBath, FaWifi, FaCar, FaSwimmingPool,
  FaUtensils, FaTv, FaAirConditioner, FaPaw, FaSmokingBan,
  FaExclamationTriangle, FaTimes, FaCheck, FaArrowRight,
  FaCalendarCheck, FaCalendarTimes, FaUserCheck, FaUserTimes
} from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

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
  const [filters, setFilters] = useState({
    status: 'all',
    property: 'all',
    dateRange: 'all',
    search: ''
  });
  const [expandedSections, setExpandedSections] = useState({
    reservations: true,
    calendar: false,
    finance: false,
    analytics: false,
    promotions: false,
    reviews: false,
    messages: false,
    settings: false
  });

  // Mock data for demonstration
  const mockBookings = [
    {
      _id: '1',
      property: { name: 'Luxury Apartment Kigali', location: 'Kigali, Rwanda' },
      guest: { name: 'John Doe', email: 'john@example.com', phone: '+250788123456' },
      checkIn: '2024-01-15',
      checkOut: '2024-01-18',
      guests: 2,
      totalAmount: 450000,
      status: 'paid',
      bookingDate: '2024-01-10',
      paymentStatus: 'paid',
      rating: 4.8,
      review: 'Excellent stay, highly recommended!',
      specialRequests: 'Late check-in requested',
      amenities: ['WiFi', 'Parking', 'Pool', 'Kitchen']
    },
    {
      _id: '2',
      property: { name: 'Cozy Studio Musanze', location: 'Musanze, Rwanda' },
      guest: { name: 'Jane Smith', email: 'jane@example.com', phone: '+250788654321' },
      checkIn: '2024-01-20',
      checkOut: '2024-01-22',
      guests: 1,
      totalAmount: 180000,
      status: 'pending',
      bookingDate: '2024-01-12',
      paymentStatus: 'pending',
      rating: null,
      review: null,
      specialRequests: 'Vegetarian breakfast',
      amenities: ['WiFi', 'Kitchen']
    },
    {
      _id: '3',
      property: { name: 'Beach House Gisenyi', location: 'Gisenyi, Rwanda' },
      guest: { name: 'Mike Johnson', email: 'mike@example.com', phone: '+250788789012' },
      checkIn: '2024-01-25',
      checkOut: '2024-01-28',
      guests: 4,
      totalAmount: 720000,
      status: 'unpaid',
      bookingDate: '2024-01-14',
      paymentStatus: 'unpaid',
      rating: 4.5,
      review: 'Great location, beautiful views',
      specialRequests: 'Extra towels needed',
      amenities: ['WiFi', 'Parking', 'Pool', 'Beach Access']
    }
  ];

  const mockProperties = [
    {
      _id: '1',
      name: 'Luxury Apartment Kigali',
      location: 'Kigali, Rwanda',
      type: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      guests: 4,
      price: 150000,
      rating: 4.8,
      images: ['/api/images/property1.jpg'],
      amenities: ['WiFi', 'Parking', 'Pool', 'Kitchen', 'AC'],
      status: 'active',
      bookings: 12,
      revenue: 1800000
    },
    {
      _id: '2',
      name: 'Cozy Studio Musanze',
      location: 'Musanze, Rwanda',
      type: 'Studio',
      bedrooms: 1,
      bathrooms: 1,
      guests: 2,
      price: 90000,
      rating: 4.6,
      images: ['/api/images/property2.jpg'],
      amenities: ['WiFi', 'Kitchen'],
      status: 'active',
      bookings: 8,
      revenue: 720000
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // In a real app, these would be API calls
      setBookings(mockBookings);
      setProperties(mockProperties);
      setStats({
        total: mockBookings.length,
        paid: mockBookings.filter(b => b.status === 'paid').length,
        pending: mockBookings.filter(b => b.status === 'pending').length,
        unpaid: mockBookings.filter(b => b.status === 'unpaid').length,
        totalRevenue: mockBookings.reduce((sum, b) => sum + b.totalAmount, 0),
        pendingRevenue: mockBookings.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.totalAmount, 0),
        totalProperties: mockProperties.length,
        activeProperties: mockProperties.filter(p => p.status === 'active').length,
        occupancyRate: 75,
        averageRating: 4.7
      });
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
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
    if (filters.status !== 'all' && booking.status !== filters.status) return false;
    if (filters.property !== 'all' && booking.property._id !== filters.property) return false;
    if (filters.search && !booking.guest.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
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
          <FaMessage />
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
                    <FaMessage className="mr-2" />
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Owner Dashboard</h1>
          <p className="text-gray-600">Manage your properties, bookings, and revenue</p>
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

        {/* Bookings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.map(renderBookingCard)}
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <FaCalendarAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No bookings found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBookingDetails && renderBookingDetails()}
      {showReceipt && renderReceipt()}
    </div>
  );
};

export default PropertyOwnerBookings;