import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { FaDownload, FaPrint, FaFileInvoice, FaCalendarAlt, FaUser, FaMapMarkerAlt, FaCreditCard, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ReceiptComponent = ({ bookingId, userType }) => {
  const { formatCurrencyRWF } = useLocale() || {};
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
      const ctype = res.headers.get('content-type') || '';
      const data = ctype.includes('application/json') ? await res.json() : { message: await res.text() };
      
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
      // Normalize and ensure we always have the key nested objects
      setReceipt({
        ...r,
        dates: r.dates || {},
        property: r.property || {},
        guest: r.guest || {},
        room: r.room || null,
        payment: r.payment || { method: 'cash', status: 'pending', transactionId: '' },
        services: r.services || {},
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
  const formatDate = (dateString, withTime = false) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', withTime
      ? {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
    );
  };

  const formatCurrency = (amount) => {
    const n = Number(amount || 0);
    return formatCurrencyRWF ? formatCurrencyRWF(n) : `RWF ${n.toLocaleString()}`;
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

  const services = receipt.services || {};
  const propertyAddOns = Array.isArray(receipt.property?.addOnServices) ? receipt.property.addOnServices : [];
  const selectedAddOns = propertyAddOns.filter(a => a && a.key && services[a.key]);
  const dates = receipt.dates || {};
  const pricing = receipt.pricing || {};
  const guest = receipt.guest || {};
  const property = receipt.property || {};
  const room = receipt.room || null;

  // Begin JSX
  return (
    <div id="receipt-content" className="max-w-3xl mx-auto p-6 bg-white rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <FaFileInvoice className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Booking Receipt</h2>
          </div>
          <div className="mt-1 text-xs text-gray-600 space-x-4">
            <span>Receipt No: <span className="font-semibold">{receipt.confirmationCode || receipt.bookingId}</span></span>
            {receipt.status && (
              <span>Status: <span className="font-semibold uppercase">{receipt.status}</span></span>
            )}
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>Receipt Date</div>
          <div className="font-medium">{formatDate(receipt.createdAt, true)}</div>
        </div>
      </div>

      {/* Booking & Property Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Booking</p>
          <p>Confirmation: <span className="font-semibold">{receipt.confirmationCode || '—'}</span></p>
          {receipt.bookingNumber && (
            <p>Booking Number: <span className="font-semibold">{receipt.bookingNumber}</span></p>
          )}
          <p>Guests: <span className="font-semibold">{receipt.guests || 1}</span></p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Property</p>
          <p className="font-semibold text-gray-900">{property.title || '—'}</p>
          {property.address && <p>{property.address}</p>}
          {property.city && <p className="text-gray-700">{property.city}</p>}
          {room && room.name && (
            <p className="mt-1">Room: <span className="font-semibold">{room.name}</span></p>
          )}
        </div>
      </div>

      {/* Guest & Stay Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Guest</p>
          <p className="font-semibold text-gray-900">{guest.name || '—'}</p>
          {guest.email && <p>{guest.email}</p>}
          {guest.phone && <p>{guest.phone}</p>}
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Stay</p>
          <p>Check-in: <span className="font-semibold">{formatDate(dates.checkIn, true)}</span></p>
          <p>Check-out: <span className="font-semibold">{formatDate(dates.checkOut, true)}</span></p>
          {typeof dates.nights === 'number' && (
            <p>Nights: <span className="font-semibold">{dates.nights}</span></p>
          )}
        </div>
      </div>

      {/* Selected add-on services (if any) */}
      {selectedAddOns.length > 0 && (
        <div className="mb-6 border-t border-gray-200 pt-4 text-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Add-on services</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            {selectedAddOns.map(addOn => (
              <li key={addOn.key}>
                <span className="font-medium">{addOn.name}</span>
                {addOn.scope && (
                  <span className="ml-1 text-gray-500 text-xs">({addOn.scope.replace(/_/g, ' ')})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pricing Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing Summary</h3>
        <div className="divide-y border rounded-lg border-gray-200 text-sm">
          <div className="flex justify-between p-3">
            <span className="text-gray-700">Amount Before Tax</span>
            <span className="font-medium">{formatCurrency(pricing.amountBeforeTax)}</span>
          </div>
          {pricing.discountApplied > 0 && (
            <div className="flex justify-between p-3">
              <span className="text-gray-700">Discount Applied</span>
              <span className="font-medium text-green-700">- {formatCurrency(pricing.discountApplied)}</span>
            </div>
          )}
          <div className="flex justify-between p-3">
            <span className="text-gray-700">EBM Tax (included) ({pricing.taxRate || 3}%):</span>
            <span className="font-medium text-blue-600">{formatCurrency(pricing.taxAmount)}</span>
          </div>
          <div className="flex justify-between p-3">
            <span className="text-gray-900 font-semibold">Total Paid (Tax Included)</span>
            <span className="font-bold">{formatCurrency(pricing.totalAmount)}</span>
          </div>
          <div className="flex justify-between p-3">
            <span className="text-gray-700">Platform Commission {pricing.totalAmount > 0 ? `(${((pricing.commissionAmount / pricing.totalAmount) * 100).toFixed(1)}%)` : ''}</span>
            <span className="font-medium text-red-600">- {formatCurrency(pricing.commissionAmount)}</span>
          </div>
          <div className="flex justify-between p-3 bg-green-50">
            <span className="text-gray-900 font-semibold">Amount to Property Owner</span>
            <span className="font-bold text-green-700">{formatCurrency(pricing.propertyOwnerAmount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FaCheckCircle className="text-green-600" />
          Payment Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-600">Payment Method</p>
            <p className="text-gray-900 capitalize">{receipt.payment.method.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="font-medium text-gray-600">Payment Status</p>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                receipt.payment.status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : receipt.payment.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {receipt.payment.status.charAt(0).toUpperCase() + receipt.payment.status.slice(1)}
            </span>
          </div>
          {receipt.payment.transactionId && (
            <div>
              <p className="font-medium text-gray-600">Transaction ID</p>
              <p className="text-gray-900 break-all">{receipt.payment.transactionId}</p>
            </div>
          )}
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
