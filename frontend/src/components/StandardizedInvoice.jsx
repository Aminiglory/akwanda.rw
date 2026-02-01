import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { 
  FaFileInvoice, 
  FaPrint, 
  FaDownload, 
  FaCheckCircle, 
  FaCalendarAlt, 
  FaUser, 
  FaMapMarkerAlt, 
  FaCreditCard, 
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaBed,
  FaHome,
  FaCalculator
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StandardizedInvoice = ({ 
  bookingId, 
  userType = 'guest',
  isDirect = false,
  showActions = true,
  compact = false 
}) => {
  const { formatCurrencyRWF } = useLocale() || {};
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetchInvoice();
    }
  }, [bookingId, isDirect]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      
      // Get detailed booking for header/basic info
      const bRes = await fetch(`${API_URL}/api/bookings/${bookingId}`, { credentials: 'include' });
      const bType = bRes.headers.get('content-type') || '';
      const bJson = bType.includes('application/json') ? await bRes.json() : { message: await bRes.text() };
      if (!bRes.ok) throw new Error(bJson.message || 'Failed to fetch booking');

      // Get receipt data depending on direct or not
      const rUrl = isDirect
        ? `${API_URL}/api/bookings/${bookingId}/direct-receipt`
        : `${API_URL}/api/bookings/${bookingId}/receipt`;
      const rRes = await fetch(rUrl, { credentials: 'include' });
      const rType = rRes.headers.get('content-type') || '';
      const rJson = rType.includes('application/json') ? await rRes.json() : { message: await rRes.text() };
      if (!rRes.ok) throw new Error(rJson.message || 'Failed to fetch receipt');

      // Combine booking and receipt data
      setInvoice({
        booking: bJson.booking,
        receipt: rJson.receipt
      });
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
      const node = document.getElementById('standard-invoice-content');
      if (!node) {
        toast.error('Invoice not ready');
        return;
      }
      
      const html = `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Invoice - ${invoice?.receipt?.confirmationCode || bookingId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
              .pricing-table { width: 100%; border-collapse: collapse; }
              .pricing-table th, .pricing-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .pricing-table .total { font-weight: bold; font-size: 16px; background-color: #f0f9ff; }
              .status-paid { color: #28a745; font-weight: bold; }
              .status-pending { color: #ffc107; font-weight: bold; }
              @media print { .no-print { display: none; }
            </style>
          </head>
          <body>
            ${node.innerHTML}
          </body>
        </html>`;
      
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${bookingId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const formatDate = (dateString, withTime = false) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', withTime
      ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: 'numeric' }
    );
  };

  const formatCurrency = (amount) => {
    const n = Number(amount || 0);
    return formatCurrencyRWF ? formatCurrencyRWF(n) : `RWF ${n.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500">Invoice not found</div>
      </div>
    );
  }

  const { booking, receipt } = invoice;
  const property = receipt?.property || {};
  const guest = receipt?.guest || {};
  const dates = receipt?.dates || {};
  const pricing = receipt?.pricing || {};
  const payment = receipt?.payment || {};

  const containerClass = compact 
    ? "max-w-2xl mx-auto p-4 bg-white rounded-lg border" 
    : "max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-lg border";

  return (
    <div id="standard-invoice-content" className={containerClass}>
      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
            font-size: 12px;
          }
          body * { visibility: hidden; }
          #standard-invoice-content, #standard-invoice-content * { visibility: visible; }
          #standard-invoice-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 20px;
          }
          .no-print { display: none !important; }
          .break-after { page-break-after: always; }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-4 border-blue-600 pb-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <FaFileInvoice className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AkwandaTravels.com</h1>
                <p className="text-sm text-gray-600">Invoice</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-600">Invoice No:</span>
                <span className="ml-2 font-semibold">{receipt?.confirmationCode || bookingId}</span>
              </div>
              <div>
                <span className="text-gray-600">Booking ID:</span>
                <span className="ml-2 font-semibold">{bookingId}</span>
              </div>
              {booking?.isDirect && (
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  Direct Booking
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Invoice Date</div>
            <div className="font-semibold">{formatDate(receipt?.createdAt || new Date(), true)}</div>
            <div className="text-sm text-gray-600 mt-1">Due Date</div>
            <div className="font-semibold">{formatDate(dates?.checkIn)}</div>
          </div>
        </div>
      </div>

      {/* Billing Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <FaBuilding className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Bill To</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-semibold text-lg">{guest.name || '—'}</div>
            {guest.email && (
              <div className="flex items-center gap-2">
                <FaEnvelope className="text-gray-400 text-xs" />
                <span>{guest.email}</span>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center gap-2">
                <FaPhone className="text-gray-400 text-xs" />
                <span>{guest.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <FaHome className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">Property Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-medium">{property.title || '—'}</div>
            {property.address && (
              <div className="flex items-start gap-2">
                <FaMapMarkerAlt className="text-gray-400 mt-1 text-xs" />
                <span>{property.address}</span>
              </div>
            )}
            {property.city && <div className="text-gray-700">{property.city}</div>}
          </div>
        </div>
      </div>

      {/* Stay Period */}
      <div className="bg-green-50 rounded-lg p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FaCalendarAlt className="text-green-600" />
          <h3 className="font-semibold text-gray-900">Stay Period</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Check-in:</span>
            <div className="font-medium">{formatDate(dates.checkIn, true)}</div>
          </div>
          <div>
            <span className="text-gray-600">Check-out:</span>
            <div className="font-medium">{formatDate(dates.checkOut, true)}</div>
          </div>
          <div>
            <span className="text-gray-600">Duration:</span>
            <div className="font-medium">{dates.nights} night(s)</div>
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Invoice Details</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Description</th>
                <th className="text-center p-4 font-semibold text-gray-900">Qty</th>
                <th className="text-right p-4 font-semibold text-gray-900">Unit Price</th>
                <th className="text-right p-4 font-semibold text-gray-900">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-4">
                  <div className="font-medium">Accommodation</div>
                  <div className="text-sm text-gray-600">{property.title}</div>
                </td>
                <td className="p-4 text-center">{dates.nights || 1}</td>
                <td className="p-4 text-right">{formatCurrency((pricing.amountBeforeTax || 0) / (dates.nights || 1))}</td>
                <td className="p-4 text-right font-medium">{formatCurrency(pricing.amountBeforeTax || 0)}</td>
              </tr>
              
              {pricing.discountApplied > 0 && (
                <tr>
                  <td className="p-4 text-green-600 font-medium">Discount Applied</td>
                  <td className="p-4 text-center">1</td>
                  <td className="p-4 text-right text-green-600">-{formatCurrency(pricing.discountApplied)}</td>
                  <td className="p-4 text-right font-medium text-green-600">-{formatCurrency(pricing.discountApplied)}</td>
                </tr>
              )}
              
              {!isDirect && pricing.taxAmount > 0 && (
                <tr>
                  <td className="p-4">
                    <div className="font-medium">Tax</div>
                    <div className="text-sm text-gray-600">{pricing.taxRate || 3}% VAT</div>
                  </td>
                  <td className="p-4 text-center">1</td>
                  <td className="p-4 text-right">{formatCurrency(pricing.taxAmount)}</td>
                  <td className="p-4 text-right font-medium">{formatCurrency(pricing.taxAmount)}</td>
                </tr>
              )}
              
              {!isDirect && pricing.commissionAmount > 0 && (
                <tr>
                  <td className="p-4">
                    <div className="font-medium">Platform Commission</div>
                    <div className="text-sm text-gray-600">Service fee</div>
                  </td>
                  <td className="p-4 text-center">1</td>
                  <td className="p-4 text-right">{formatCurrency(pricing.commissionAmount)}</td>
                  <td className="p-4 text-right font-medium text-red-600">{formatCurrency(pricing.commissionAmount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-blue-50">
              <tr>
                <td colSpan="3" className="p-4 font-bold text-gray-900">Total Amount</td>
                <td className="p-4 text-right font-bold text-lg text-blue-600">
                  {formatCurrency(pricing.totalAmount || pricing.finalAgreedAmount || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FaCreditCard className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Payment Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Payment Method</div>
            <div className="font-medium capitalize">{payment.method?.replace('_', ' ') || '—'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Payment Status</div>
            <div className={`font-medium capitalize ${
              payment.status === 'paid' ? 'text-green-600' : 
              payment.status === 'pending' ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {payment.status || '—'}
            </div>
          </div>
          {payment.transactionId && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Transaction ID</div>
              <div className="font-medium text-xs break-all">{payment.transactionId}</div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Invoice Summary</h3>
            <p className="text-sm text-gray-600">Thank you for your business</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Due</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(pricing.totalAmount || pricing.finalAgreedAmount || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 text-center text-sm text-gray-600">
        <div className="mb-4">
          <p className="font-semibold text-gray-900">AkwandaTravels.com</p>
          <p>Kigali, Rwanda</p>
          <p>Email: support@akwanda.rw | Phone: +250 788 123 456</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p>For questions about this invoice, please contact our support team.</p>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="mt-8 flex justify-center gap-4 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <FaPrint />
            <span>Print Invoice</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <FaDownload />
            <span>Download PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default StandardizedInvoice;
