import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Receipt() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isDirect = searchParams.get('direct') === 'true';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Use owner receipt endpoint; it includes pricing breakdown
        const res = await fetch(`${API_URL}/api/bookings/${id}/receipt`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load receipt');
        setData(json.receipt);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onPrint = () => {
    if (!data) return;
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading receipt...</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error || 'Failed to load receipt'}</div>
      </div>
    );
  }

  const pricing = data.pricing || {};
  const dates = data.dates || {};
  const guest = data.guest || {};
  const property = data.property || {};

  // For direct bookings, hide commission and show simplified pricing
  const showCommission = !isDirect && pricing.commissionAmount != null;
  const showTax = !isDirect && pricing.taxAmount != null;

  return (
    <div id="receipt-root" className="min-h-screen bg-gray-100 py-6 flex flex-col items-center">
      {/* Print styles */}
      <style>
        {`
        @page { size: A4; margin: 12mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Hide everything, then reveal the receipt only (works regardless of DOM nesting) */
          body * { visibility: hidden !important; }
          #receipt-root, #receipt-root * { visibility: visible !important; }
          #receipt-root { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; margin: 0 !important; }
        }
        `}
      </style>

      <div className="print-container bg-white w-full max-w-3xl shadow rounded-lg p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AKWANDA.rw</h1>
              <p className="text-gray-700">Booking Receipt</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Receipt Date</div>
              <div className="font-semibold">{new Date().toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-300 pt-3 text-sm flex items-center justify-between">
            <div>
              <div className="text-gray-600">Receipt No.</div>
              <div className="font-semibold">{data.confirmationCode || data.bookingId}</div>
            </div>
            <div>
              <div className="text-gray-600">Status</div>
              <div className="font-semibold uppercase">{data.status}</div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="rounded p-4 border border-gray-300">
            <div className="text-xs text-gray-600 mb-1">Booking</div>
            <div className="text-sm">Confirmation: <span className="font-medium">{data.confirmationCode || '—'}</span></div>
            <div className="text-sm">Booking ID: <span className="font-medium">{data.bookingId}</span></div>
          </div>
          <div className="rounded p-4 border border-gray-300">
            <div className="text-xs text-gray-600 mb-1">Property</div>
            <div className="text-sm font-semibold">{property.title}</div>
            <div className="text-sm">{property.address}</div>
            <div className="text-sm text-gray-700">{property.city}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="rounded p-4 border border-gray-300">
            <div className="text-xs text-gray-600 mb-1">Guest</div>
            <div className="text-sm font-semibold">{guest.name}</div>
            <div className="text-sm">{guest.email}</div>
            <div className="text-sm">{guest.phone}</div>
          </div>
          <div className="rounded p-4 border border-gray-300">
            <div className="text-xs text-gray-600 mb-1">Stay</div>
            <div className="text-sm">Check-in: <span className="font-medium">{new Date(dates.checkIn).toLocaleString()}</span></div>
            <div className="text-sm">Check-out: <span className="font-medium">{new Date(dates.checkOut).toLocaleString()}</span></div>
            <div className="text-sm">Nights: <span className="font-medium">{dates.nights}</span></div>
            {'guests' in data && (
              <div className="text-sm">Guests: <span className="font-medium">{data.guests}</span></div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Pricing Summary</h2>
          <div className="divide-y border rounded border-gray-300">
            <div className="flex items-center justify-between p-3">
              <div>Amount Before Tax</div>
              <div className="font-medium">RWF {(pricing.amountBeforeTax || 0).toLocaleString()}</div>
            </div>
            {showTax && (
              <div className="flex items-center justify-between p-3">
                <div>Tax ({pricing.taxRate || 3}%)</div>
                <div className="font-medium">RWF {(pricing.taxAmount || 0).toLocaleString()}</div>
              </div>
            )}
            {showCommission && (
              <div className="flex items-center justify-between p-3">
                <div>Commission</div>
                <div className="font-medium">RWF {(pricing.commissionAmount || 0).toLocaleString()}</div>
              </div>
            )}
            {pricing.discountApplied ? (
              <div className="flex items-center justify-between p-3">
                <div>Discount Applied</div>
                <div className="font-medium">- RWF {(pricing.discountApplied || 0).toLocaleString()}</div>
              </div>
            ) : null}
            <div className="flex items-center justify-between p-3 border-t border-gray-300">
              <div className="font-semibold">Total</div>
              <div className="text-blue-600 font-bold">RWF {(pricing.totalAmount || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Payment */}
        {data.payment && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Payment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded p-3 border border-gray-300">
                <div className="text-xs text-gray-600">Method</div>
                <div className="font-medium">{data.payment.method}</div>
              </div>
              <div className="rounded p-3 border border-gray-300">
                <div className="text-xs text-gray-600">Status</div>
                <div className="font-medium">{data.payment.status}</div>
              </div>
              <div className="rounded p-3 border border-gray-300">
                <div className="text-xs text-gray-600">Transaction</div>
                <div className="font-medium">{data.payment.transactionId}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 no-print gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={!data}
            >
              Print Receipt
            </button>
            <button
              onClick={onPrint}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              disabled={!data}
              title="Use your browser's dialog to Save as PDF"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
