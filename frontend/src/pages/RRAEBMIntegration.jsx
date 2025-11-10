import React, { useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { FaFileInvoice, FaBuilding, FaCalculator, FaCheckCircle, FaTimesCircle, FaSpinner, FaDownload, FaPrint } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RRAEBMIntegration = () => {
  const { formatCurrencyRWF } = useLocale() || {};
  const [billData, setBillData] = useState({
    customerName: '',
    customerTin: '',
    customerEmail: '',
    customerPhone: '',
    serviceType: 'accommodation',
    amount: '',
    description: '',
    bookingId: '',
    invoiceNumber: '',
    taxRate: 18, // Rwanda VAT rate
    currency: 'RWF'
  });

  const [billStatus, setBillStatus] = useState('idle'); // idle, generating, success, failed
  const [generatedBill, setGeneratedBill] = useState(null);
  const [loading, setLoading] = useState(false);

  const serviceTypes = [
    { value: 'accommodation', label: 'Accommodation Services' },
    { value: 'transport', label: 'Transport Services' },
    { value: 'attraction', label: 'Tourist Attractions' },
    { value: 'food', label: 'Food & Beverage' },
    { value: 'other', label: 'Other Services' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBillData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateTin = (tin) => {
    // Rwanda TIN validation (10 digits)
    const tinRegex = /^[0-9]{10}$/;
    return tinRegex.test(tin);
  };

  const calculateTax = () => {
    const amount = Number(billData.amount) || 0;
    const taxRate = Number(billData.taxRate) || 18;
    const taxAmount = (amount * taxRate) / 100;
    const totalAmount = amount + taxAmount;
    
    return {
      subtotal: amount,
      taxAmount: taxAmount,
      totalAmount: totalAmount
    };
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RRA${year}${month}${day}${random}`;
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    
    if (!billData.customerName || !billData.customerTin || !billData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validateTin(billData.customerTin)) {
      toast.error('Please enter a valid 10-digit TIN number');
      return;
    }

    if (Number(billData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setBillStatus('generating');

      const invoiceNumber = generateInvoiceNumber();
      const calculations = calculateTax();
      
      const payload = {
        ...billData,
        invoiceNumber,
        amount: Number(billData.amount),
        taxRate: Number(billData.taxRate),
        ...calculations,
        generatedAt: new Date().toISOString(),
        status: 'generated'
      };

      // Simulate RRA EBM API call
      const response = await fetch(`${API_URL}/api/billing/rra-ebm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate bill');
      }

      // Simulate bill generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      setGeneratedBill({
        ...payload,
        billId: data.billId || `RRA${Date.now()}`,
        qrCode: data.qrCode || 'QR_CODE_DATA_HERE'
      });
      
      setBillStatus('success');
      toast.success('EBM Bill generated successfully!');

    } catch (error) {
      setBillStatus('failed');
      toast.error(error.message || 'Failed to generate bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetBill = () => {
    setBillData({
      customerName: '',
      customerTin: '',
      customerEmail: '',
      customerPhone: '',
      serviceType: 'accommodation',
      amount: '',
      description: '',
      bookingId: '',
      invoiceNumber: '',
      taxRate: 18,
      currency: 'RWF'
    });
    setBillStatus('idle');
    setGeneratedBill(null);
  };

  const calculations = calculateTax();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 px-8 py-6 text-white">
            <div className="flex items-center space-x-3">
              <FaBuilding className="text-3xl" />
              <div>
                <h1 className="text-2xl font-bold">Rwanda Revenue Authority</h1>
                <p className="text-green-100">Electronic Billing Machine (EBM) Integration</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {billStatus === 'idle' && (
              <form onSubmit={handleGenerateBill} className="space-y-8">
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={billData.customerName}
                        onChange={handleInputChange}
                        placeholder="Enter customer full name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TIN Number *
                      </label>
                      <input
                        type="text"
                        name="customerTin"
                        value={billData.customerTin}
                        onChange={handleInputChange}
                        placeholder="1234567890"
                        maxLength="10"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        10-digit Tax Identification Number
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Email
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={billData.customerEmail}
                        onChange={handleInputChange}
                        placeholder="customer@email.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Phone
                      </label>
                      <input
                        type="tel"
                        name="customerPhone"
                        value={billData.customerPhone}
                        onChange={handleInputChange}
                        placeholder="+250 78X XXX XXX"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Service Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Type
                      </label>
                      <select
                        name="serviceType"
                        value={billData.serviceType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        {serviceTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (RWF) *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={billData.amount}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Description
                    </label>
                    <textarea
                      name="description"
                      value={billData.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Describe the service provided..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Booking ID (Optional)
                      </label>
                      <input
                        type="text"
                        name="bookingId"
                        value={billData.bookingId}
                        onChange={handleInputChange}
                        placeholder="Booking reference number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        name="taxRate"
                        value={billData.taxRate}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax Calculation Preview */}
                {billData.amount && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Calculation Preview</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrencyRWF ? formatCurrencyRWF(calculations.subtotal || 0) : `RWF ${(calculations.subtotal || 0).toLocaleString()}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">VAT ({billData.taxRate}%):</span>
                        <span className="font-medium">{formatCurrencyRWF ? formatCurrencyRWF(calculations.taxAmount || 0) : `RWF ${(calculations.taxAmount || 0).toLocaleString()}`}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold text-gray-900">Total:</span>
                          <span className="text-lg font-bold text-green-600">{formatCurrencyRWF ? formatCurrencyRWF(calculations.totalAmount || 0) : `RWF ${(calculations.totalAmount || 0).toLocaleString()}`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* RRA Compliance Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FaFileInvoice className="text-blue-600 text-lg mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">RRA Compliance</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        This bill will be automatically submitted to the Rwanda Revenue Authority 
                        Electronic Billing Machine system for tax compliance and record keeping.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Generating EBM Bill...
                    </>
                  ) : (
                    <>
                      <FaCalculator />
                      Generate EBM Bill
                    </>
                  )}
                </button>
              </form>
            )}

            {billStatus === 'generating' && (
              <div className="text-center py-12">
                <FaSpinner className="text-6xl text-green-500 animate-spin mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Generating EBM Bill</h2>
                <p className="text-gray-600 mb-4">Please wait while we generate your bill...</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-green-800">
                    <strong>Processing:</strong> Submitting to RRA EBM system and generating invoice.
                  </p>
                </div>
              </div>
            )}

            {billStatus === 'success' && generatedBill && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">EBM Bill Generated Successfully!</h2>
                  <p className="text-gray-600">Your bill has been submitted to RRA EBM system.</p>
                </div>

                {/* Generated Bill Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Generated Bill</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <FaPrint />
                        Print
                      </button>
                      <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FaDownload />
                        Download
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Bill Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bill ID:</span>
                          <span className="font-medium">{generatedBill.billId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Invoice Number:</span>
                          <span className="font-medium">{generatedBill.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">{new Date(generatedBill.generatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium text-green-600">{generatedBill.status}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Customer Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{generatedBill.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">TIN:</span>
                          <span className="font-medium">{generatedBill.customerTin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{generatedBill.customerEmail || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{generatedBill.customerPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium text-gray-900 mb-3">Service & Payment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Type:</span>
                        <span className="font-medium">{generatedBill.serviceType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Description:</span>
                        <span className="font-medium">{generatedBill.description || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrencyRWF ? formatCurrencyRWF(generatedBill.subtotal || 0) : `RWF ${(generatedBill.subtotal || 0).toLocaleString()}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">VAT ({generatedBill.taxRate}%):</span>
                        <span className="font-medium">{formatCurrencyRWF ? formatCurrencyRWF(generatedBill.taxAmount || 0) : `RWF ${(generatedBill.taxAmount || 0).toLocaleString()}`}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrencyRWF ? formatCurrencyRWF(generatedBill.totalAmount || 0) : `RWF ${(generatedBill.totalAmount || 0).toLocaleString()}`}</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="mt-6 pt-6 border-t text-center">
                    <h4 className="font-medium text-gray-900 mb-3">QR Code for Verification</h4>
                    <div className="bg-gray-100 w-32 h-32 mx-auto rounded-lg flex items-center justify-center">
                      <span className="text-gray-500 text-xs">QR Code</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Scan this QR code to verify the bill with RRA
                    </p>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resetBill}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Generate Another Bill
                  </button>
                </div>
              </div>
            )}

            {billStatus === 'failed' && (
              <div className="text-center py-12">
                <FaTimesCircle className="text-6xl text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Bill Generation Failed</h2>
                <p className="text-gray-600 mb-6">We couldn't generate your EBM bill. Please try again.</p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-6">
                  <h3 className="text-sm font-medium text-red-900 mb-2">Possible reasons:</h3>
                  <ul className="text-sm text-red-700 text-left space-y-1">
                    <li>• Invalid TIN number</li>
                    <li>• RRA EBM system unavailable</li>
                    <li>• Network connectivity issues</li>
                    <li>• Invalid customer information</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={resetBill}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About RRA EBM Integration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Benefits</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Automatic tax compliance</li>
                <li>• Real-time submission to RRA</li>
                <li>• Digital invoice generation</li>
                <li>• QR code verification</li>
                <li>• Audit trail maintenance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Valid customer TIN number</li>
                <li>• Service description</li>
                <li>• Accurate amount calculation</li>
                <li>• RRA EBM system access</li>
                <li>• Internet connectivity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RRAEBMIntegration;
