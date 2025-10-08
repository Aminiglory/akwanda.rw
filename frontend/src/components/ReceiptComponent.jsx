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
      // Normalize using API-provided amounts (inclusive tax model)
      const r = data.receipt || {};
      const pricing = r.pricing || {};
      const amountBeforeTax = Number(pricing.amountBeforeTax ?? 0);
      const discountApplied = Number(pricing.discountApplied ?? 0);
      const taxRate = Number(pricing.taxRate ?? 3);
      const taxAmount = Number(pricing.taxAmount ?? 0);
      const totalAmount = Number(pricing.totalAmount ?? 0);
      const commissionAmount = Number(pricing.commissionAmount ?? 0);
      const propertyOwnerAmount = Math.max(0, totalAmount - commissionAmount - taxAmount);
      setReceipt({
        ...r,
        pricing: {
          ...pricing,
          amountBeforeTax,
          discountApplied,
          taxRate,
          taxAmount,
          totalAmount,
          commissionAmount,
          propertyOwnerAmount,
        },
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helpers restored
  const handlePrint = () => {
    window.print();
  };
  const handleDownload = () => {
    try {
      const node = document.getElementById('receipt-content');
      if (!node) {
        toast.error('Receipt not ready');
        return;
      }
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title></head><body>${node.outerHTML}</body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${bookingId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (e) {
      toast.error('Failed to download receipt');
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

  const formatCurrency = (amount) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  // Guards
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
        <p className="text-gray-600">Receipt not found</p>
      </div>
    );
  }

  // Begin JSX
  return (
    <div id="receipt-content" className="max-w-3xl mx-auto p-6 bg-white rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FaFileInvoice className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Receipt</h2>
        </div>
        <div className="text-sm text-gray-500">{formatDate(receipt.createdAt)}</div>
      </div>

      {/* Totals */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">EBM Tax (included) ({receipt.pricing.taxRate || 3}%):</span>
          <span className="font-semibold text-blue-600">{formatCurrency(receipt.pricing.taxAmount || 0)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-gray-900 font-semibold">Total Paid (Tax Included):</span>
          <span className="font-bold">{formatCurrency(receipt.pricing.totalAmount)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-gray-600">Platform Commission ({((receipt.pricing.commissionAmount / (receipt.pricing.totalAmount || 1)) * 100).toFixed(1)}%):</span>
          <span className="font-semibold text-red-600">-{formatCurrency(receipt.pricing.commissionAmount)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-gray-900 font-semibold">Amount to Property Owner:</span>
          <span className="font-bold text-green-600">{formatCurrency(receipt.pricing.propertyOwnerAmount)}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FaCheckCircle className="text-green-600" />
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

      {/* Footer Actions */}
      <div className="mt-6 flex justify-center gap-3 print:hidden">
        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          <FaPrint />
          <span>Print</span>
        </button>
        <button onClick={handleDownload} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
          <FaDownload />
          <span>Download</span>
        </button>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptComponent;
