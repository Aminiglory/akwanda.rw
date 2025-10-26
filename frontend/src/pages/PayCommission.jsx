import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PayCommission() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [due, setDue] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Best-effort: fetch commission due if backend endpoint exists; otherwise, fall back to manual amount entry
        const res = await fetch(`${API_URL}/api/commission/me/due`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const val = Number(data?.amount || 0);
          if (val > 0) {
            setDue(val);
            setAmount(String(val));
          }
        }
      } catch (_) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const goPay = (e) => {
    e.preventDefault();
    const amt = Number(amount || 0);
    if (!phoneNumber) { toast.error('Enter phone number'); return; }
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    navigate('/payment/mtn-mobile-money', {
      state: {
        phoneNumber,
        amount: amt,
        description: 'Commission Payment',
        bookingId: '',
        customerName: '',
        customerEmail: ''
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaMoneyBillWave className="text-green-600 text-2xl" />
            <h1 className="text-2xl font-bold text-gray-900">Pay Commission</h1>
          </div>
          <p className="text-sm text-gray-600 mb-6">Your account is deactivated until commission is paid. Complete payment to regain full access.</p>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600"><FaSpinner className="animate-spin" /> Loading due amount…</div>
          ) : (
            <form onSubmit={goPay} className="space-y-4">
              {typeof due === 'number' && due > 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                  Detected outstanding commission: <span className="font-semibold">RWF {due.toLocaleString()}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., +250 78X XXX XXX"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RWF)</label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium">Pay with MTN Mobile Money</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
