import React, { useState, useEffect } from 'react';
import { FaMobile, FaCreditCard, FaShieldAlt, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MTNMobileMoneyPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingDetails = location.state || {};

  const [paymentData, setPaymentData] = useState({
    phoneNumber: bookingDetails.phoneNumber || '',
    amount: bookingDetails.amount || '',
    currency: 'RWF',
    description: bookingDetails.description || '',
    bookingId: bookingDetails.bookingId || '',
    customerName: bookingDetails.customerName || '',
    customerEmail: bookingDetails.customerEmail || ''
  });

  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, failed
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePhoneNumber = (phone) => {
    // Rwanda phone number validation
    const rwandaPhoneRegex = /^(\+250|250|0)?[0-9]{9}$/;
    return rwandaPhoneRegex.test(phone.replace(/\s/g, ''));
  };

  const formatPhoneNumber = (phone) => {
    // Format to +250XXXXXXXXX
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('250')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+250${cleaned}`;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!paymentData.phoneNumber || !paymentData.amount || !paymentData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validatePhoneNumber(paymentData.phoneNumber)) {
      toast.error('Please enter a valid Rwanda phone number');
      return;
    }

    if (Number(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setPaymentStatus('processing');

      const formattedPhone = formatPhoneNumber(paymentData.phoneNumber);
      
      const payload = {
        ...paymentData,
        phoneNumber: formattedPhone,
        amount: Number(paymentData.amount),
        paymentMethod: 'mtn_mobile_money',
        timestamp: new Date().toISOString()
      };

      // Simulate MTN Mobile Money API call
      const response = await fetch(`${API_URL}/api/payments/mtn-mobile-money`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment failed');
      }

      // Set transaction ID and success status
      setTransactionId(data.transactionId || `MTN${Date.now()}`);
      setPaymentStatus('success');
      toast.success('Payment processed successfully! Redirecting...');

      // Wait a bit longer to ensure backend is updated, then redirect
      if (paymentData.bookingId) {
        setTimeout(() => {
          // Use window.location for a clean redirect
          window.location.href = `/booking-confirmation/${paymentData.bookingId}`;
        }, 4000);
      }

    } catch (error) {
      setPaymentStatus('failed');
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPayment = () => {
    setPaymentData({
      phoneNumber: '',
      amount: '',
      currency: 'RWF',
      description: '',
      bookingId: '',
      customerName: '',
      customerEmail: ''
    });
    setPaymentStatus('idle');
    setTransactionId('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-6 text-white">
            <div className="flex items-center space-x-3">
              <FaMobile className="text-3xl" />
              <div>
                <h1 className="text-2xl font-bold">MTN Mobile Money</h1>
                <p className="text-yellow-100">Secure and convenient payment</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {paymentStatus === 'idle' && (
              <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <FaMobile className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={paymentData.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="+250 78X XXX XXX"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your MTN Mobile Money registered number
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (RWF) *
                      </label>
                      <div className="relative">
                        <FaCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          name="amount"
                          value={paymentData.amount}
                          onChange={handleInputChange}
                          placeholder="0"
                          min="1"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={paymentData.description}
                      onChange={handleInputChange}
                      placeholder="e.g., Property booking payment"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={paymentData.customerName}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Email
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={paymentData.customerEmail}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking ID (Optional)
                    </label>
                    <input
                      type="text"
                      name="bookingId"
                      value={paymentData.bookingId}
                      onChange={handleInputChange}
                      placeholder="Booking reference number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Security Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FaShieldAlt className="text-blue-600 text-lg mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">Secure Payment</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Your payment is processed securely through MTN Mobile Money. 
                        We never store your payment details.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">RWF {Number(paymentData.amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">MTN Mobile Money</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone Number:</span>
                      <span className="font-medium">{paymentData.phoneNumber || 'Not provided'}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-yellow-600">RWF {Number(paymentData.amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <FaMobile />
                      Pay with MTN Mobile Money
                    </>
                  )}
                </button>
              </form>
            )}

            {paymentStatus === 'processing' && (
              <div className="text-center py-12">
                <FaSpinner className="text-6xl text-yellow-500 animate-spin mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing Payment</h2>
                <p className="text-gray-600 mb-4">Please wait while we process your payment...</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> You will receive an MTN Mobile Money prompt on your phone. 
                    Please enter your PIN to complete the payment.
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="text-center py-12">
                <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-6">Your payment has been processed successfully.</p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto mb-6">
                  <h3 className="text-lg font-medium text-green-900 mb-3">Transaction Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Transaction ID:</span>
                      <span className="font-medium text-green-900">{transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Amount:</span>
                      <span className="font-medium text-green-900">RWF {Number(paymentData.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Phone Number:</span>
                      <span className="font-medium text-green-900">{paymentData.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Date:</span>
                      <span className="font-medium text-green-900">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={resetPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Make Another Payment
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Print Receipt
                  </button>
                </div>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="text-center py-12">
                <FaTimesCircle className="text-6xl text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Failed</h2>
                <p className="text-gray-600 mb-6">We couldn't process your payment. Please try again.</p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-6">
                  <h3 className="text-sm font-medium text-red-900 mb-2">Possible reasons:</h3>
                  <ul className="text-sm text-red-700 text-left space-y-1">
                    <li>• Insufficient balance in your Mobile Money account</li>
                    <li>• Incorrect phone number</li>
                    <li>• Network connectivity issues</li>
                    <li>• Transaction was cancelled</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={resetPayment}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About MTN Mobile Money</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Benefits</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Secure and encrypted transactions</li>
                <li>• Instant payment processing</li>
                <li>• Available 24/7</li>
                <li>• No additional fees</li>
                <li>• SMS confirmation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">How it works</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>1. Enter your phone number</li>
                <li>2. Confirm payment amount</li>
                <li>3. Enter your Mobile Money PIN</li>
                <li>4. Receive confirmation SMS</li>
                <li>5. Payment completed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MTNMobileMoneyPayment;
