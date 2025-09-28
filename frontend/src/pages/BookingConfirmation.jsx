import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaCalendarAlt, FaUsers, FaBed, FaMapMarkerAlt, FaPhone, FaEnvelope, FaDownload, FaPrint, FaShare, FaHome } from 'react-icons/fa';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookingConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bookings/${id}`, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch booking');
      
      setBooking(data.booking);
      
      // Fetch property details
      const propertyRes = await fetch(`${API_URL}/api/properties/${data.booking.property}`, { credentials: 'include' });
      const propertyData = await propertyRes.json();
      
      if (propertyRes.ok) {
        setProperty(propertyData.property);
      }
    } catch (error) {
      toast.error(error.message);
      navigate('/apartments');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Booking Confirmation - AKWANDA.rw',
          text: `Your booking confirmation code: ${booking.confirmationCode}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Booking link copied to clipboard!');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateNights = () => {
    if (!booking?.checkIn || !booking?.checkOut) return 0;
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking confirmation...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <Link
            to="/apartments"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle className="text-4xl text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-lg text-gray-600 mb-4">
            Your reservation has been successfully created
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-blue-800 font-medium">Confirmation Code</p>
            <p className="text-2xl font-bold text-blue-900">{booking.confirmationCode}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Booking Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-in Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(booking.checkIn)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(booking.checkOut)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUsers className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Number of Guests</p>
                      <p className="font-semibold text-gray-900">{booking.numberOfGuests}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaBed className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-900">{calculateNights()} nights</p>
                    </div>
                  </div>
                </div>
              </div>

              {booking.specialRequests && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Special Requests</h3>
                  <p className="text-gray-700">{booking.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Property Information */}
            {property && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Property Information</h2>
                
                <div className="flex items-start space-x-4">
                  <img
                    src={property.images?.[0]?.startsWith('http') ? property.images[0] : `${API_URL}${property.images?.[0]}` || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=150&fit=crop'}
                    alt={property.title}
                    className="w-32 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.title}</h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FaMapMarkerAlt className="mr-2" />
                      <span>{property.address}, {property.city}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{property.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Your Contact Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Contact Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaEnvelope className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{booking.guestContact?.email || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaPhone className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{booking.guestContact?.phone || booking.contactPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Owner Contact Information */}
            {property?.host && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Property Owner Contact</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUsers className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Owner Name</p>
                      <p className="font-semibold text-gray-900">{property.host.firstName} {property.host.lastName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaEnvelope className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{property.host.email}</p>
                    </div>
                  </div>
                  
                  {property.host.phone && (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FaPhone className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-900">{property.host.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Important Note</h3>
                  <p className="text-sm text-blue-800">
                    You can now contact the property owner directly using the information above. 
                    Save these details for your stay and any questions you may have.
                  </p>
                </div>
              </div>
            )}

            {/* Important Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-yellow-900 mb-4">Important Information</h2>
              <ul className="space-y-2 text-yellow-800">
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Please arrive at the property during check-in hours</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Bring a valid ID for verification</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Contact the property directly for any special arrangements</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Keep this confirmation code for your records</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-gray-900">RWF {booking.totalAmount?.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment:</span>
                  <span className="text-gray-900">{booking.paymentMethod?.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <FaPrint />
                  <span>Print Confirmation</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <FaShare />
                  <span>Share Booking</span>
                </button>
                
                <Link
                  to="/apartments"
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <FaHome />
                  <span>Browse More Properties</span>
                </Link>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
                <p className="text-sm text-blue-800 mb-3">
                  If you have any questions about your booking, please contact our support team.
                </p>
                <div className="text-sm text-blue-700">
                  <p>Email: support@akwanda.rw</p>
                  <p>Phone: +250 788 123 456</p>
                </div>
              </div>

              {/* Customer Support Section */}
              <div className="mt-6 p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Report a Problem</h4>
                <p className="text-sm text-red-800 mb-3">
                  Having issues with your booking? Use your booking ID to report problems.
                </p>
                <div className="text-sm text-red-700">
                  <p><strong>Booking ID:</strong> {booking.confirmationCode}</p>
                  <p><strong>Support Email:</strong> support@akwanda.rw</p>
                  <p><strong>Emergency:</strong> +250 788 123 456</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
