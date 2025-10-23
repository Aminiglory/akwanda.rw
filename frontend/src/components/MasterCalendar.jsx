import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * MasterCalendar
 * Props:
 * - properties: [{ _id, title, rooms: [{ _id, roomNumber, roomType }] }]
 * - onChanged: fn() => void (refresh parent data after bulk ops)
 */
const MasterCalendar = ({ properties = [], onChanged }) => {
  const allRooms = useMemo(() => {
    const list = [];
    for (const p of properties) {
      (p.rooms || []).forEach(r => list.push({ propertyId: p._id, propertyTitle: p.title, ...r }));
    }
    return list;
  }, [properties]);

  const [selectedRooms, setSelectedRooms] = useState(() => new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rate, setRate] = useState('');
  const [minStay, setMinStay] = useState('');
  const [maxStay, setMaxStay] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleRoom = (roomKey) => {
    setSelectedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomKey)) next.delete(roomKey); else next.add(roomKey);
      return next;
    });
  };

  const validateRange = () => {
    if (!startDate || !endDate) { toast.error('Select a start and end date'); return false; }
    if (new Date(startDate) > new Date(endDate)) { toast.error('Start date must be before end date'); return false; }
    if (selectedRooms.size === 0) { toast.error('Select at least one room'); return false; }
    return true;
  };

  const doBulk = async (endpoint, payload) => {
    try {
      setBusy(true);
      const body = { ...payload, rooms: Array.from(selectedRooms).map(x => JSON.parse(x)) };
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Operation failed');
      toast.success('Updated successfully');
      onChanged && onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const onCloseDates = () => {
    if (!validateRange()) return;
    doBulk('/api/rates/bulk/close', { startDate, endDate });
  };
  const onOpenDates = () => {
    if (!validateRange()) return;
    doBulk('/api/rates/bulk/open', { startDate, endDate });
  };
  const onSetRate = () => {
    if (!validateRange()) return;
    if (!rate) { toast.error('Enter a rate'); return; }
    doBulk('/api/rates/bulk/set-rate', { startDate, endDate, rate: Number(rate) });
  };
  const onSetRestrictions = () => {
    if (!validateRange()) return;
    if (!minStay && !maxStay) { toast.error('Enter min or max stay'); return; }
    const payload = { startDate, endDate };
    if (minStay) payload.minStay = Number(minStay);
    if (maxStay) payload.maxStay = Number(maxStay);
    doBulk('/api/rates/bulk/restrictions', payload);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold text-gray-900 mb-2">Rooms</div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {allRooms.length === 0 && (
              <div className="text-sm text-gray-500">No rooms found</div>
            )}
            {allRooms.map(r => {
              const keyObj = { propertyId: r.propertyId, roomId: r._id };
              const key = JSON.stringify(keyObj);
              return (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={selectedRooms.has(key)} onChange={() => toggleRoom(key)} />
                  <span className="truncate">{r.propertyTitle} • {r.roomNumber} • {r.roomType}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold text-gray-900 mb-2">Date Range</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Rate (RWF)</label>
              <input type="number" value={rate} onChange={e=>setRate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min stay (nights)</label>
              <input type="number" value={minStay} onChange={e=>setMinStay(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max stay (nights)</label>
              <input type="number" value={maxStay} onChange={e=>setMaxStay(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold text-gray-900 mb-2">Bulk Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={busy} onClick={onCloseDates} className="px-4 py-3 rounded-lg bg-red-600 text-white disabled:opacity-50">Close Dates</button>
            <button disabled={busy} onClick={onOpenDates} className="px-4 py-3 rounded-lg bg-green-600 text-white disabled:opacity-50">Open Dates</button>
            <button disabled={busy} onClick={onSetRate} className="px-4 py-3 rounded-lg bg-blue-600 text-white disabled:opacity-50">Set Rate</button>
            <button disabled={busy} onClick={onSetRestrictions} className="px-4 py-3 rounded-lg bg-purple-600 text-white disabled:opacity-50">Set Restrictions</button>
          </div>
          <div className="text-xs text-gray-500 mt-2">Applies to selected rooms across the chosen date range.</div>
        </div>
      </div>
    </div>
  );
};

export default MasterCalendar;
