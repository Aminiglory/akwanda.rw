import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiPost } from '../utils/apiUtils';
import { FaStar } from 'react-icons/fa';

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

  const clampStars = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(5, n));
  };

  const aspects = useMemo(() => ([
    { key: 'staff', label: 'Staff' },
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'locationScore', label: 'Location' },
    { key: 'facilities', label: 'Facilities' },
    { key: 'comfort', label: 'Comfort' },
    { key: 'valueForMoney', label: 'Value for money' },
  ]), []);

  const overallStars = useMemo(() => {
    const values = aspects
      .map(a => clampStars(fields[a.key]))
      .filter(v => typeof v === 'number' && v > 0);
    if (values.length === 0) return 0;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return Math.round(avg * 10) / 10;
  }, [aspects, fields]);

  const overallScore10 = useMemo(() => {
    if (!overallStars) return 0;
    return Math.round((overallStars * 2) * 10) / 10;
  }, [overallStars]);

  const StarPicker = ({ value, onChange, size = 18, disabled = false }) => {
    const v = clampStars(value);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, idx) => {
          const n = idx + 1;
          const active = n <= v;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                if (disabled) return;
                onChange(n);
              }}
              disabled={disabled}
              className={`p-0.5 ${disabled ? 'cursor-default' : ''}`}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
            >
              <FaStar size={size} className={active ? 'text-yellow-500' : 'text-gray-300'} />
            </button>
          );
        })}
      </div>
    );
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
    if (!reviewPin) {
      toast.error('Please enter your review PIN');
      return;
    }

    const missingAspect = aspects.find(a => clampStars(fields[a.key]) <= 0);
    if (missingAspect) {
      toast.error(`Please rate ${missingAspect.label}`);
      return;
    }

    const highlights = String(highlightsText || '')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

    try {
      setSubmitting(true);
      const to10 = (stars) => Math.round((clampStars(stars) * 2) * 10) / 10;
      await apiPost('/api/reviews', {
        bookingId,
        propertyId,
        bookingNumber,
        reviewPin,
        overallScore10,
        staff: to10(fields.staff),
        cleanliness: to10(fields.cleanliness),
        locationScore: to10(fields.locationScore),
        facilities: to10(fields.facilities),
        comfort: to10(fields.comfort),
        valueForMoney: to10(fields.valueForMoney),
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
      const raw = (e && (e.message || e.error || e.toString())) || '';
      let friendly = 'Failed to submit review. Please check your details and try again.';

      if (raw.includes('Invalid booking number')) {
        friendly = 'The booking number you entered does not match this booking. Please copy it exactly from your confirmation message or notification.';
      } else if (raw.includes('Invalid review PIN')) {
        friendly = 'The review PIN you entered is incorrect. Please use the PIN shown in your booking confirmation or notification.';
      } else if (raw.includes('You can review after your stay has ended')) {
        friendly = 'You can only rate your stay after checkout. Please try again once your stay has ended.';
      }

      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Rate your stay</h1>
          <Link to={bookingId ? `/booking-confirmation/${bookingId}` : '/my-bookings'} className="text-sm text-blue-600 hover:text-blue-700">Back to booking</Link>
        </div>

        <form onSubmit={handleSubmit} className="modern-card-elevated p-6 space-y-6">
          <p className="text-sm text-gray-600">
            Please enter your booking details and rate each aspect of your stay from 1 to 5 stars.
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

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-800">Overall rating</div>
                <div className="text-xs text-gray-600">Calculated from the categories below</div>
              </div>
              <div className="flex items-center gap-3">
                <StarPicker value={Math.round(overallStars)} onChange={() => {}} size={20} disabled />
                <div className="text-sm font-semibold text-blue-700">{overallStars || 0} / 5</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-800">
            {aspects.map((row) => (
              <div key={row.key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <StarPicker
                      value={fields[row.key] || 0}
                      onChange={(next) => setFields(f => ({ ...f, [row.key]: next }))}
                    />
                    <span className="text-xs text-gray-600 w-10 text-right">{fields[row.key] || 0}/5</span>
                  </div>
                </div>
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
