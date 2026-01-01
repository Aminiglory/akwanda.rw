import React, { useState } from 'react';
import toast from 'react-hot-toast';

const AddFlightInlineForm = ({ apiUrl, onCreated }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    airline: '',
    flightNumber: '',
    from: '',
    to: '',
    departure: '',
    arrival: '',
    duration: '',
    price: '',
    status: 'upcoming',
    cabinClass: '',
    channel: 'direct',
    groupBooking: false,
    groupSize: '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.airline || !form.flightNumber || !form.from || !form.to || !form.departure || !form.arrival || !form.price) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${apiUrl}/api/flights/owner/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          airline: form.airline,
          flightNumber: form.flightNumber,
          from: form.from,
          to: form.to,
          departure: form.departure,
          arrival: form.arrival,
          duration: form.duration || undefined,
          price: Number(form.price),
          status: form.status,
          cabinClass: form.cabinClass || undefined,
          channel: form.channel,
          groupBooking: form.groupBooking,
          groupSize: form.groupSize ? Number(form.groupSize) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create flight booking');
      }

      toast.success('Flight booking created successfully');
      setForm({
        airline: '',
        flightNumber: '',
        from: '',
        to: '',
        departure: '',
        arrival: '',
        duration: '',
        price: '',
        status: 'upcoming',
        cabinClass: '',
        channel: 'direct',
        groupBooking: false,
        groupSize: '',
      });
      onCreated?.();
    } catch (error) {
      toast.error(error.message || 'Failed to create flight booking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Airline *</label>
          <input
            type="text"
            value={form.airline}
            onChange={(e) => handleChange('airline', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Flight Number *</label>
          <input
            type="text"
            value={form.flightNumber}
            onChange={(e) => handleChange('flightNumber', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">From *</label>
          <input
            type="text"
            value={form.from}
            onChange={(e) => handleChange('from', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            placeholder="e.g., Kigali"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">To *</label>
          <input
            type="text"
            value={form.to}
            onChange={(e) => handleChange('to', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            placeholder="e.g., Nairobi"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Departure *</label>
          <input
            type="datetime-local"
            value={form.departure}
            onChange={(e) => handleChange('departure', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Arrival *</label>
          <input
            type="datetime-local"
            value={form.arrival}
            onChange={(e) => handleChange('arrival', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
          <input
            type="text"
            value={form.duration}
            onChange={(e) => handleChange('duration', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            placeholder="e.g., 1h 30m"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Price (RWF) *</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
          >
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cabin Class</label>
          <select
            value={form.cabinClass}
            onChange={(e) => handleChange('cabinClass', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
          >
            <option value="">Select class</option>
            <option value="economy">Economy</option>
            <option value="premium">Premium</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
          <select
            value={form.channel}
            onChange={(e) => handleChange('channel', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
          >
            <option value="direct">Direct</option>
            <option value="online">Online</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Group Size</label>
          <input
            type="number"
            min="1"
            value={form.groupSize}
            onChange={(e) => handleChange('groupSize', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
            placeholder="Number of passengers"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.groupBooking}
            onChange={(e) => handleChange('groupBooking', e.target.checked)}
            className="rounded"
          />
          <span>Group booking</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? 'Creating...' : 'Create Flight Booking'}
        </button>
      </div>
    </form>
  );
};

export default AddFlightInlineForm;

