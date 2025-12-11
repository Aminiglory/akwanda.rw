import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiPost } from '../utils/apiUtils';

const RateStay = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = params.get('bookingId') || '';
  const propertyId = params.get('propertyId') || '';
  const initialBookingNumber = params.get('bn') || '';
  const initialPin = params.get('pin') || '';

  const [bookingNumber, setBookingNumber] = useState(initialBookingNumber);
  const [reviewPin, setReviewPin] = useState(initialPin);
  const [submitting, setSubmitting] = useState(false);
  const [overallScore10, setOverallScore10] = useState(0);
  const [fields, setFields] = useState({
    staff: 0,
    cleanliness: 0,
    locationScore: 0,
    facilities: 0,
    comfort: 0,
    valueForMoney: 0,
  });
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [highlightsText, setHighlightsText] = useState('');

  const clamp10 = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(10, n));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId || !propertyId) {
      toast.error('Missing booking information. Please open this page from your booking details.');
      return;
    }
    if (!bookingNumber || !bookingNumber.trim()) {
      toast.error('Please enter your booking number');
      return;
    }
    if (overallScore10 <= 0 || overallScore10 > 10) {
      toast.error('Please choose an overall score from 1 to 10');
      return;
    }
    if (!reviewPin) {
      toast.error('Please enter your review PIN');
      return;
    }

    const highlights = String(highlightsText || '')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

    try {
      setSubmitting(true);
      await apiPost('/api/reviews', {
        bookingId,
        propertyId,
        bookingNumber,
        reviewPin,
        overallScore10: clamp10(overallScore10),
        staff: clamp10(fields.staff),
        cleanliness: clamp10(fields.cleanliness),
        locationScore: clamp10(fields.locationScore),
        facilities: clamp10(fields.facilities),
        comfort: clamp10(fields.comfort),
        valueForMoney: clamp10(fields.valueForMoney),
        title,
        comment,
        highlights,
      });
      toast.success('Thank you for rating your stay');
      if (bookingId) {
        navigate(`/booking-confirmation/${bookingId}`);
      } else {
        navigate('/my-bookings');
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const aspectConfig = [
    { key: 'staff', label: 'Staff' },
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'locationScore', label: 'Location' },
    { key: 'facilities', label: 'Facilities' },
    { key: 'comfort', label: 'Comfort' },
    { key: 'valueForMoney', label: 'Value for money' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Rate your stay</h1>
          <Link to={bookingId ? `/booking-confirmation/${bookingId}` : '/my-bookings'} className="text-sm text-blue-600 hover:text-blue-700">Back to booking</Link>
        </div>

        <form onSubmit={handleSubmit} className="modern-card-elevated p-6 space-y-6">
          <p className="text-sm text-gray-600">
            Please enter your booking details and rate each aspect of your stay from 0 to 10.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="text-gray-600">Booking number</div>
              <input
                type="text"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white"
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                placeholder="e.g. AKW-1234"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="text-gray-600">Review PIN</div>
              <input
                type="password"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white"
                value={reviewPin}
                onChange={(e) => setReviewPin(e.target.value)}
                placeholder="4-digit PIN"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800">Overall score</span>
              <span className="text-sm font-semibold text-blue-700">{overallScore10 || 0} / 10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={overallScore10}
              onChange={(e) => setOverallScore10(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-700">
            {aspectConfig.map((row) => (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <span className="font-semibold">{fields[row.key] || 0} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={fields[row.key] || 0}
                  onChange={(e) => setFields(f => ({ ...f, [row.key]: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>
            ))}
          </div>

          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Headline for your stay (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            rows={4}
            placeholder="Share more about your stay (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700"
            placeholder="Highlights (comma separated, e.g. Very friendly staff, Clean rooms, Good breakfast)"
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border text-sm"
              onClick={() => navigate(bookingId ? `/booking-confirmation/${bookingId}` : '/my-bookings')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RateStay;
