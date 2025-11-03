import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Invoice = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isDirect = searchParams.get('direct') === 'true';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Get detailed booking for header/basic info
        const bRes = await fetch(`${API_URL}/api/bookings/${id}`, { credentials: 'include' });
        const bType = bRes.headers.get('content-type') || '';
        const bJson = bType.includes('application/json') ? await bRes.json() : { message: await bRes.text() };
        if (!bRes.ok) throw new Error(bJson.message || 'Failed to fetch booking');

        // Get receipt data (JSON variant) depending on direct or not
        const rUrl = isDirect
          ? `${API_URL}/api/bookings/${id}/direct-receipt`
          : `${API_URL}/api/bookings/${id}/receipt`;
        const rRes = await fetch(rUrl, { credentials: 'include' });
        const rType = rRes.headers.get('content-type') || '';
        const rJson = rType.includes('application/json') ? await rRes.json() : { message: await rRes.text() };
        if (!rRes.ok) throw new Error(rJson.message || 'Failed to fetch receipt');

        setData({ booking: bJson.booking, receipt: rJson.receipt });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isDirect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading invoice...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const { booking, receipt } = data || {};
  const property = receipt?.property || {};
  const guest = receipt?.guest || {};
  const dates = receipt?.dates || {};
  const pricing = receipt?.pricing || {};
  const payment = receipt?.payment || {};

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8 print:shadow-none print:rounded-none">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">Invoice</h1>
            <p className="text-sm text-gray-500">Confirmation: {receipt?.confirmationCode}</p>
            {booking?.isDirect && (
              <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Direct Booking</span>
            )}
          </div>
          <div className="text-right">
            <div className="font-semibold">AKWANDA.rw</div>
            <div className="text-sm text-gray-600">www.akwanda.rw</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-semibold mb-2">Property</h2>
            <div className="text-sm text-gray-700">
              <div>{property.title}</div>
              <div>{property.address}</div>
              <div>{property.city}</div>
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Guest</h2>
            <div className="text-sm text-gray-700">
              <div>{guest.name}</div>
              <div>{guest.email}</div>
              <div>{guest.phone}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-semibold mb-2">Stay</h2>
            <div className="text-sm text-gray-700">
              <div>Check-in: {new Date(dates.checkIn).toLocaleString()}</div>
              <div>Check-out: {new Date(dates.checkOut).toLocaleString()}</div>
              <div>Nights: {dates.nights}</div>
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Payment</h2>
            <div className="text-sm text-gray-700">
              <div>Method: {payment.method}</div>
              <div>Status: {payment.status}</div>
              <div>Txn: {payment.transactionId}</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-semibold mb-2">Summary</h2>
          <div className="border rounded">
            <div className="flex justify-between p-3">
              <span>Discount</span>
              <span>RWF {(pricing.discountApplied || 0).toLocaleString()}</span>
            </div>
            {!isDirect && (
              <>
                <div className="flex justify-between p-3 border-t">
                  <span>Tax ({booking?.taxRate || 3}%)</span>
                  <span>RWF {(booking?.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 border-t">
                  <span>Commission</span>
                  <span>RWF {(booking?.commissionAmount || 0).toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between p-3 border-t font-semibold">
              <span>Total</span>
              <span>RWF {(pricing.totalAmount || booking?.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 no-print">
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Print</button>
          <a
            href={`${API_URL}/api/bookings/${id}/${isDirect ? 'direct-receipt.csv' : 'receipt.csv'}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200"
          >
            Download CSV
          </a>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
