import React, { useState, useEffect } from 'react';
import { FaFileInvoice, FaPrint, FaDownload, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RRAReceiptComponent = ({ bookingId }) => {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRRAReceipt();
  }, [bookingId]);

  const fetchRRAReceipt = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/rra-receipt`, {
        credentials: 'include'
      });
      const ctype = res.headers.get('content-type') || '';
      const data = ctype.includes('application/json') ? await res.json() : { message: await res.text() };
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch RRA receipt');
      
      setReceipt(data.rraReceipt);
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
    try {
      const container = document.getElementById('rra-receipt-content');
      if (!container) { toast.error('Receipt not ready'); return; }
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>RRA Receipt</title></head><body>${container.outerHTML}</body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rra-receipt-${bookingId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (_) {
      toast.error('Failed to download receipt');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Unable to load RRA receipt</p>
      </div>
    );
  }

  return (
    <div id="rra-receipt-content" className="bg-white p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b-4 border-green-600 pb-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RRA TAX RECEIPT</h1>
            <p className="text-sm text-gray-600 mt-1">Rwanda Revenue Authority</p>
          </div>
          <div className="text-right">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg inline-block">
              <FaCheckCircle className="inline mr-2" />
              <span className="font-semibold">TAX COMPLIANT</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Receipt Number:</p>
            <p className="font-bold text-lg">{receipt.receiptNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Issue Date:</p>
            <p className="font-semibold">{new Date(receipt.issueDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Taxpayer Information */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Taxpayer Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Business Name:</p>
            <p className="font-semibold">{receipt.taxpayerName}</p>
          </div>
          <div>
            <p className="text-gray-600">TIN:</p>
            <p className="font-semibold">{receipt.taxpayerTIN}</p>
          </div>
        </div>
      </div>

      {/* Booking Information */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Booking Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Confirmation Code:</p>
            <p className="font-semibold">{receipt.confirmationCode}</p>
          </div>
          <div>
            <p className="text-gray-600">Property:</p>
            <p className="font-semibold">{receipt.property.title}</p>
          </div>
          <div>
            <p className="text-gray-600">Location:</p>
            <p className="font-semibold">{receipt.property.address}, {receipt.property.city}</p>
          </div>
          <div>
            <p className="text-gray-600">Duration:</p>
            <p className="font-semibold">{receipt.dates.nights} night(s)</p>
          </div>
        </div>
      </div>

      {/* Guest Information */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Guest Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Name:</p>
            <p className="font-semibold">{receipt.guest.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Email:</p>
            <p className="font-semibold">{receipt.guest.email}</p>
          </div>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="mb-6 border-2 border-green-200 rounded-lg p-4 bg-green-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Breakdown</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Amount Before Tax:</span>
            <span className="font-semibold">RWF {receipt.pricing.amountBeforeTax.toLocaleString()}</span>
          </div>
          
          {receipt.pricing.discountApplied > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount Applied:</span>
              <span className="font-semibold">- RWF {receipt.pricing.discountApplied.toLocaleString()}</span>
            </div>
          )}
          
          <div className="border-t border-green-300 pt-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">Tax Type:</span>
              <span className="font-semibold">{receipt.taxDetails.taxType}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">Tax Rate:</span>
              <span className="font-semibold">{receipt.taxDetails.taxRate}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">Taxable Amount:</span>
              <span className="font-semibold">RWF {receipt.taxDetails.taxableAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Tax Amount:</span>
              <span className="font-bold text-green-700">RWF {receipt.taxDetails.taxAmount.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="border-t-2 border-green-400 pt-3 mt-3">
            <div className="flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total Amount (Inc. Tax):</span>
              <span className="text-xl font-bold text-green-700">RWF {receipt.pricing.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Payment Method:</p>
            <p className="font-semibold capitalize">{receipt.payment.method.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-gray-600">Payment Status:</p>
            <p className={`font-semibold capitalize ${
              receipt.payment.status === 'paid' ? 'text-green-600' : 
              receipt.payment.status === 'pending' ? 'text-yellow-600' : 
              'text-gray-600'
            }`}>
              {receipt.payment.status}
            </p>
          </div>
          {receipt.payment.transactionId !== 'N/A' && (
            <div>
              <p className="text-gray-600">Transaction ID:</p>
              <p className="font-semibold">{receipt.payment.transactionId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tax Description */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Tax Description:</strong> {receipt.taxDetails.description}
        </p>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 mt-6">
        <div className="text-center text-sm text-gray-600 mb-4">
          <p>This is an official tax receipt issued by AKWANDA.rw</p>
          <p className="mt-1">For inquiries, contact: tax@akwanda.rw | +250 788 123 456</p>
        </div>
        
        <div className="flex justify-center space-x-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <FaPrint />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <FaDownload />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default RRAReceiptComponent;
