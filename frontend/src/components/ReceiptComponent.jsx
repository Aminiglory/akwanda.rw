import React, { useState, useEffect } from 'react';
import { FaDownload, FaPrint, FaFileInvoice, FaCalendarAlt, FaUser, FaMapMarkerAlt, FaCreditCard, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ReceiptComponent = ({ bookingId, userType }) => {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceipt();
  }, [bookingId]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/receipt`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch receipt');
      
      setReceipt(data.receipt);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([document.getElementById('receipt-content').innerHTML], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${receipt.confirmationCode}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center p-8">
        <FaFileInvoice className="text-4xl text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Receipt not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 print:p-4" id="receipt-content">
      {/* Header */}
      <div className="text-center mb-8 border-b pb-6">
        <div className="flex items-center justify-center mb-4">
          <FaFileInvoice className="text-3xl text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Booking Receipt</h1>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
          <p className="text-sm text-blue-800 font-medium">Confirmation Code</p>
          <p className="text-2xl font-bold text-blue-900">{receipt.confirmationCode}</p>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Property Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaMapMarkerAlt className="text-blue-600 mr-2" />
            Property Information
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Property:</span> {receipt.property.title}</p>
            <p><span className="font-medium">Address:</span> {receipt.property.address}</p>
            <p><span className="font-medium">City:</span> {receipt.property.city}</p>
          </div>
        </div>

        {/* Guest Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaUser className="text-green-600 mr-2" />
            Guest Information
          </h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Name:</span> {receipt.guest.name}</p>
            <p><span className="font-medium">Email:</span> {receipt.guest.email}</p>
            <p><span className="font-medium">Phone:</span> {receipt.guest.phone || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FaCalendarAlt className="text-purple-600 mr-2" />
          Booking Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-600">Check-in Date</p>
            <p className="text-gray-900">{formatDate(receipt.dates.checkIn)}</p>
          </div>
          <div>
            <p className="font-medium text-gray-600">Check-out Date</p>
            <p className="text-gray-900">{formatDate(receipt.dates.checkOut)}</p>
          </div>
          <div>
            <p className="font-medium text-gray-600">Duration</p>
            <p className="text-gray-900">{receipt.dates.nights} nights</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="font-medium text-gray-600">Number of Guests</p>
          <p className="text-gray-900">{receipt.guests} guests</p>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FaCreditCard className="text-orange-600 mr-2" />
          Pricing Breakdown
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold">{formatCurrency(receipt.pricing.totalAmount)}</span>
            </div>
            {receipt.pricing.discountApplied > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount Applied:</span>
                <span>-{formatCurrency(receipt.pricing.discountApplied)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Commission ({((receipt.pricing.commissionAmount / receipt.pricing.totalAmount) * 100).toFixed(1)}%):</span>
              <span className="font-semibold text-red-600">-{formatCurrency(receipt.pricing.commissionAmount)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Amount to Property Owner:</span>
                <span className="text-green-600">{formatCurrency(receipt.pricing.propertyOwnerAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FaCheckCircle className="text-green-600 mr-2" />
          Payment Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-600">Payment Method</p>
            <p className="text-gray-900 capitalize">{receipt.payment.method.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="font-medium text-gray-600">Payment Status</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              receipt.payment.status === 'paid' ? 'bg-green-100 text-green-800' :
              receipt.payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {receipt.payment.status.charAt(0).toUpperCase() + receipt.payment.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 text-center text-sm text-gray-500">
        <p>Receipt generated on {formatDate(receipt.createdAt)}</p>
        <p className="mt-2">Thank you for using AKWANDA.rw</p>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center space-x-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <FaPrint />
          <span>Print Receipt</span>
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <FaDownload />
          <span>Download Receipt</span>
        </button>
      </div>
    </div>
  );
};

export default ReceiptComponent;
