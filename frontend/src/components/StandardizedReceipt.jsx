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
  FaHome
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StandardizedReceipt = ({ 
  bookingId, 
  userType = 'guest',
  isDirect = false,
  showActions = true,
  compact = false 
}) => {
  const { formatCurrencyRWF } = useLocale() || {};
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetchReceipt();
    }
  }, [bookingId, isDirect]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const endpoint = isDirect 
        ? `${API_URL}/api/bookings/${bookingId}/direct-receipt`
        : `${API_URL}/api/bookings/${bookingId}/receipt`;
      
      const res = await fetch(endpoint, {
        credentials: 'include'
      });
      
      const ctype = res.headers.get('content-type') || '';
      const data = ctype.includes('application/json') ? await res.json() : { message: await res.text() };
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch receipt');
      
      // Normalize receipt data
      const r = data.receipt || {};
      const pricing = r.pricing || {};
      
      setReceipt({
        ...r,
        dates: r.dates || {},
        property: r.property || {},
        guest: r.guest || {},
        room: r.room || null,
        payment: r.payment || { method: 'cash', status: 'pending', transactionId: '' },
        services: r.services || {},
        pricing: {
          amountBeforeTax: Number(pricing.amountBeforeTax ?? 0),
          discountApplied: Number(pricing.discountApplied ?? 0),
          taxRate: Number(pricing.taxRate ?? 3),
          taxAmount: Number(pricing.taxAmount ?? 0),
          totalAmount: Number(pricing.totalAmount ?? 0),
          commissionAmount: Number(pricing.commissionAmount ?? 0),
          finalAgreedAmount: Number(pricing.finalAgreedAmount ?? 0),
          ...pricing
        },
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
      const node = document.getElementById('standard-receipt-content');
      if (!node) {
        toast.error('Receipt not ready');
        return;
      }
      
      const html = `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Booking Receipt - ${receipt?.confirmationCode || bookingId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { border-bottom: 3px solid #a06b42; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #a06b42; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
              .pricing-table { width: 100%; border-collapse: collapse; }
              .pricing-table th, .pricing-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .pricing-table .total { font-weight: bold; font-size: 16px; background-color: #f9f9f9; }
              .status-paid { color: #28a745; font-weight: bold; }
              .status-pending { color: #ffc107; font-weight: bold; }
              @media print { .no-print { display: none; } }
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
      a.download = `receipt-${bookingId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
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
          <div className="w-12 h-12 border-4 border-[#a06b42] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500">Receipt not found</div>
      </div>
    );
  }

  const { dates, property, guest, room, payment, pricing } = receipt;
  const propertyAddOns = Array.isArray(property?.addOnServices) ? property.addOnServices : [];
  const selectedAddOns = propertyAddOns.filter(a => a && a.key && receipt.services[a.key]);
  const agreedAmount = pricing.finalAgreedAmount > 0 ? pricing.finalAgreedAmount : pricing.totalAmount;

  const containerClass = compact 
    ? "max-w-2xl mx-auto p-4 bg-white rounded-lg border" 
    : "max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-lg border";

  return (
    <div id="standard-receipt-content" className={containerClass}>
      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
            font-size: 12px;
          }
          body * { visibility: hidden; }
          #standard-receipt-content, #standard-receipt-content * { visibility: visible; }
          #standard-receipt-content { 
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
      <div className="border-b-4 border-[#a06b42] pb-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#a06b42] rounded-full flex items-center justify-center">
                <FaFileInvoice className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AkwandaTravels.com</h1>
                <p className="text-sm text-gray-600">Booking Receipt</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-600">Receipt No:</span>
                <span className="ml-2 font-semibold">{receipt.confirmationCode || receipt.bookingId}</span>
              </div>
              {receipt.status && (
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-2 font-semibold uppercase ${
                    receipt.status === 'confirmed' ? 'text-green-600' : 
                    receipt.status === 'pending' ? 'text-yellow-600' : 
                    'text-gray-600'
                  }`}>{receipt.status}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Receipt Date</div>
            <div className="font-semibold">{formatDate(receipt.createdAt || new Date(), true)}</div>
            {isDirect && (
              <div className="mt-2 inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                Direct Booking
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking & Property Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <FaHome className="text-[#a06b42]" />
            <h3 className="font-semibold text-gray-900">Property Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Property:</span>
              <span className="ml-2 font-medium">{property.title || '—'}</span>
            </div>
            {property.address && (
              <div className="flex items-start gap-2">
                <FaMapMarkerAlt className="text-gray-400 mt-1 text-xs" />
                <span>{property.address}</span>
              </div>
            )}
            {property.city && <div className="text-gray-700">{property.city}</div>}
            {room && room.name && (
              <div>
                <span className="text-gray-600">Room:</span>
                <span className="ml-2 font-medium">{room.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <FaUser className="text-[#a06b42]" />
            <h3 className="font-semibold text-gray-900">Guest Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <span className="ml-2 font-medium">{guest.name || '—'}</span>
            </div>
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
            {'guests' in receipt && (
              <div>
                <span className="text-gray-600">Guests:</span>
                <span className="ml-2 font-medium">{receipt.guests}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stay Details */}
      <div className="bg-blue-50 rounded-lg p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FaCalendarAlt className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Stay Details</h3>
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

      {/* Add-on Services */}
      {selectedAddOns.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Additional Services</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <ul className="space-y-2 text-sm">
              {selectedAddOns.map(addOn => (
                <li key={addOn.key} className="flex items-center justify-between">
                  <span className="font-medium">{addOn.name}</span>
                  {addOn.scope && (
                    <span className="text-gray-500 text-xs">({addOn.scope.replace(/_/g, ' ')})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Pricing Summary */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Pricing Summary</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="divide-y">
            <div className="flex justify-between p-4 bg-gray-50">
              <span className="text-gray-700">Amount Before Tax</span>
              <span className="font-medium">{formatCurrency(pricing.amountBeforeTax)}</span>
            </div>
            
            {pricing.discountApplied > 0 && (
              <div className="flex justify-between p-4">
                <span className="text-gray-700">Discount Applied</span>
                <span className="font-medium text-green-600">- {formatCurrency(pricing.discountApplied)}</span>
              </div>
            )}
            
            {!isDirect && pricing.taxAmount > 0 && (
              <div className="flex justify-between p-4">
                <span className="text-gray-700">Tax ({pricing.taxRate}%)</span>
                <span className="font-medium">{formatCurrency(pricing.taxAmount)}</span>
              </div>
            )}
            
            {!isDirect && pricing.commissionAmount > 0 && (
              <div className="flex justify-between p-4">
                <span className="text-gray-700">Platform Commission</span>
                <span className="font-medium text-red-600">- {formatCurrency(pricing.commissionAmount)}</span>
              </div>
            )}
            
            {isDirect && pricing.finalAgreedAmount > 0 && (
              <div className="flex justify-between p-4 bg-amber-50">
                <span className="font-medium text-gray-900">Final Agreed Price</span>
                <span className="font-bold text-amber-700">{formatCurrency(pricing.finalAgreedAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between p-4 bg-[#a06b42] text-white">
              <span className="font-bold">Total Amount</span>
              <span className="font-bold text-lg">{formatCurrency(agreedAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FaCreditCard className="text-[#a06b42]" />
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

      {/* Footer */}
      <div className="border-t pt-6 text-center text-sm text-gray-600">
        <p>Thank you for choosing AkwandaTravels.com</p>
        <p className="mt-1">For inquiries, contact: support@akwanda.rw | +250 788 123 456</p>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="mt-8 flex justify-center gap-4 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <FaPrint />
            <span>Print Receipt</span>
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

export default StandardizedReceipt;
