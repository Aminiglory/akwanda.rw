import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { FaFileInvoice, FaPrint, FaDownload, FaCheckCircle, FaBuilding, FaPhone, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RRAReceiptComponent = ({ bookingId }) => {
  const { formatCurrencyRWF } = useLocale() || {};
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
      
      const html = `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>RRA Tax Receipt - ${receipt?.receiptNumber || bookingId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { border-bottom: 4px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
              .tax-box { border: 2px solid #16a34a; background-color: #f0fdf4; }
              .total-row { font-weight: bold; font-size: 16px; background-color: #f0fdf4; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            ${container.innerHTML}
          </body>
        </html>`;
      
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rra-receipt-${bookingId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('RRA receipt downloaded');
    } catch (_) {
      toast.error('Failed to download receipt');
    }
  };

  const formatCurrency = (amount) => {
    const n = Number(amount || 0);
    return formatCurrencyRWF ? formatCurrencyRWF(n) : `RWF ${n.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RRA receipt...</p>
        </div>
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
    <div id="rra-receipt-content" className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-lg border">
      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
            font-size: 12px;
          }
          body * { visibility: hidden; }
          #rra-receipt-content, #rra-receipt-content * { visibility: visible; }
          #rra-receipt-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 20px;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-4 border-green-600 pb-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <FaFileInvoice className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RRA TAX RECEIPT</h1>
                <p className="text-sm text-gray-600">Rwanda Revenue Authority - Official Tax Document</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg inline-flex items-center">
              <FaCheckCircle className="mr-2" />
              <span className="font-semibold">TAX COMPLIANT</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Receipt Number:</p>
            <p className="font-bold text-lg text-green-700">{receipt.receiptNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Issue Date:</p>
            <p className="font-semibold">{new Date(receipt.issueDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Taxpayer Information */}
      <div className="mb-8 bg-green-50 rounded-lg p-5 border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <FaBuilding className="text-green-600" />
          <h3 className="font-semibold text-gray-900">Taxpayer Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Business Name:</span>
            <div className="font-semibold text-lg">{receipt.taxpayerName}</div>
          </div>
          <div>
            <span className="text-gray-600">TIN:</span>
            <div className="font-semibold text-lg">{receipt.taxpayerTIN}</div>
          </div>
        </div>
      </div>

      {/* Booking Information */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Booking Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Confirmation Code:</span>
            <div className="font-semibold">{receipt.confirmationCode}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Property:</span>
            <div className="font-semibold">{receipt.property.title}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Location:</span>
            <div className="font-semibold">{receipt.property.address}, {receipt.property.city}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Duration:</span>
            <div className="font-semibold">{receipt.dates.nights} night(s)</div>
          </div>
        </div>
      </div>

      {/* Guest Information */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Guest Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Name:</span>
            <div className="font-semibold">{receipt.guest.name}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Email:</span>
            <div className="font-semibold">{receipt.guest.email}</div>
          </div>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="mb-8 border-2 border-green-200 rounded-lg p-6 bg-green-50">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FaFileInvoice className="text-green-600" />
          Tax Breakdown
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Amount Before Tax:</span>
            <span className="font-semibold">{formatCurrency(receipt.pricing.amountBeforeTax || 0)}</span>
          </div>
          
          {receipt.pricing.discountApplied > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount Applied:</span>
              <span className="font-semibold">- {formatCurrency(receipt.pricing.discountApplied || 0)}</span>
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
              <span className="font-semibold">{formatCurrency(receipt.taxDetails.taxableAmount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Tax Amount:</span>
              <span className="font-bold text-green-700">{formatCurrency(receipt.taxDetails.taxAmount || 0)}</span>
            </div>
          </div>
          
          <div className="border-t-2 border-green-400 pt-3 mt-3">
            <div className="flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total Amount (Inc. Tax):</span>
              <span className="text-xl font-bold text-green-700">{formatCurrency(receipt.pricing.totalAmount || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Payment Method:</span>
            <div className="font-semibold capitalize">{receipt.payment.method.replace('_', ' ')}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-gray-600">Payment Status:</span>
            <div className={`font-semibold capitalize ${
              receipt.payment.status === 'paid' ? 'text-green-600' : 
              receipt.payment.status === 'pending' ? 'text-yellow-600' : 
              'text-gray-600'
            }`}>
              {receipt.payment.status}
            </div>
          </div>
          {receipt.payment.transactionId !== 'N/A' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-gray-600">Transaction ID:</span>
              <div className="font-semibold text-xs break-all">{receipt.payment.transactionId}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Description */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h3 className="font-semibold text-blue-900 mb-2">Tax Description</h3>
        <p className="text-sm text-blue-800">{receipt.taxDetails.description}</p>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 mt-6">
        <div className="text-center text-sm text-gray-600 mb-6">
          <div className="mb-4">
            <p className="font-semibold text-gray-900">AkwandaTravels.com</p>
            <p>Official RRA Tax Receipt</p>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <FaEnvelope className="text-gray-400" />
              <span>tax@akwanda.rw</span>
            </div>
            <div className="flex items-center gap-1">
              <FaPhone className="text-gray-400" />
              <span>+250 788 123 456</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center gap-4 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <FaPrint />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <FaDownload />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RRAReceiptComponent;
