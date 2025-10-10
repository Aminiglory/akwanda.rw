import React, { useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaLock, FaUnlock } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysInMonth(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(y, m, d));
  return cells;
}

export default function RoomCalendarPanel({ propertyId, room, onChanged, readOnly = false, compact = false }) {
  const [current, setCurrent] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lockRange, setLockRange] = useState({ start: '', end: '' });
  const [localClosedDates, setLocalClosedDates] = useState(Array.isArray(room?.closedDates) ? room.closedDates : []);
  const [pendingRange, setPendingRange] = useState({ start: null, end: null });
  const [selectedDay, setSelectedDay] = useState(null);

  const monthName = useMemo(() => current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), [current]);
  const cells = useMemo(() => daysInMonth(current), [current]);

  const fetchMonthBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bookings?propertyId=${propertyId}&month=${current.getMonth()+1}&year=${current.getFullYear()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load bookings');
      const roomId = room?._id || room?.id;
      const filtered = (data.bookings || []).filter(b => {
        if (!roomId) return true;
        return String(b.room || '') === String(roomId);
      });
      setBookings(filtered);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMonthBookings(); }, [propertyId, room?._id, current]);

  // Keep local closed dates in sync when room changes
  useEffect(() => {
    setLocalClosedDates(Array.isArray(room?.closedDates) ? room.closedDates : []);
  }, [room?._id, JSON.stringify(room?.closedDates || [])]);

  // Light periodic refresh for near real-time updates
  useEffect(() => {
    const t = setInterval(fetchMonthBookings, 45000);
    return () => clearInterval(t);
  }, [propertyId, room?._id, current]);

  const closedDates = Array.isArray(localClosedDates) ? localClosedDates : [];

  const dayStatus = (date) => {
    if (!date) return 'empty';
    // highlight pending selection when choosing a range
    if (!readOnly && pendingRange.start && !pendingRange.end) {
      if (sameDay(date, pendingRange.start)) return 'selected';
    }
    if (!readOnly && pendingRange.start && pendingRange.end) {
      if (date >= new Date(pendingRange.start.getFullYear(), pendingRange.start.getMonth(), pendingRange.start.getDate()) &&
          date <= new Date(pendingRange.end.getFullYear(), pendingRange.end.getMonth(), pendingRange.end.getDate())) {
        return 'selected';
      }
    }
    // booked if any booking overlaps [checkIn, checkOut) end-exclusive
    const isBooked = bookings.some(b => {
      const ci = new Date(b.checkIn), co = new Date(b.checkOut);
      return date >= new Date(ci.getFullYear(), ci.getMonth(), ci.getDate()) && date < new Date(co.getFullYear(), co.getMonth(), co.getDate());
    });
    if (isBooked) return 'booked';
    const isClosed = closedDates.some(cd => {
      if (!cd?.startDate || !cd?.endDate) return false;
      const cs = new Date(cd.startDate), ce = new Date(cd.endDate);
      return date >= new Date(cs.getFullYear(), cs.getMonth(), cs.getDate()) && date < new Date(ce.getFullYear(), ce.getMonth(), ce.getDate());
    });
    if (isClosed) return 'closed';
    if (sameDay(date, new Date())) return 'today';
    return 'free';
  };

  const onCellClick = (d) => {
    if (!d) return;
    // Always allow inspecting a day
    setSelectedDay(d);
    if (readOnly) return;
    // quick range selection: first click -> start, second click -> end (>= start)
    if (!pendingRange.start) {
      setPendingRange({ start: d, end: null });
      setLockRange(r => ({ ...r, start: d.toISOString().slice(0,10), end: r.end }));
      return;
    }
    if (!pendingRange.end) {
      if (d < pendingRange.start) {
        // swap
        setPendingRange({ start: d, end: pendingRange.start });
        setLockRange({ start: d.toISOString().slice(0,10), end: pendingRange.start.toISOString().slice(0,10) });
      } else {
        setPendingRange({ start: pendingRange.start, end: d });
        setLockRange(r => ({ ...r, end: d.toISOString().slice(0,10) }));
      }
      return;
    }
    // third click resets to start
    setPendingRange({ start: d, end: null });
    setLockRange({ start: d.toISOString().slice(0,10), end: '' });
  };

  const lockRoom = async () => {
    if (!lockRange.start || !lockRange.end) { toast.error('Select start and end dates'); return; }
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${room._id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate: lockRange.start, endDate: lockRange.end, reason: 'Locked by owner' })
      });
      let data;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (text && text.startsWith('<!DOCTYPE')) {
          throw new Error('Server returned HTML. Check you are logged in and VITE_API_URL points to the backend.');
        } else {
          throw new Error(text || 'Unexpected response from server');
        }
      }
      if (!res.ok) throw new Error(data?.message || 'Failed to lock room');
      toast.success('Room locked');
      setLockRange({ start: '', end: '' });
      // Update local closed dates for immediate visual feedback
      setLocalClosedDates(prev => ([...(prev || []), { startDate: lockRange.start, endDate: lockRange.end, reason: 'Locked by owner' }]));
      onChanged && onChanged();
      fetchMonthBookings();
    } catch (e) { toast.error(e.message); }
  };

  const unlockRoom = async () => {
    if (!lockRange.start || !lockRange.end) { toast.error('Select start and end dates to unlock that range'); return; }
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${room._id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate: lockRange.start, endDate: lockRange.end })
      });
      let data;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (text && text.startsWith('<!DOCTYPE')) {
          throw new Error('Server returned HTML. You may be unauthenticated or VITE_API_URL is pointing to the frontend.');
        } else {
          throw new Error(text || 'Unexpected response from server');
        }
      }
      if (!res.ok) throw new Error(data?.message || 'Failed to unlock room');
      toast.success('Room unlocked');
      setLockRange({ start: '', end: '' });
      // Remove matching range locally for immediate visual feedback
      setLocalClosedDates(prev => (prev || []).filter(cd => {
        const cs = new Date(cd.startDate).toISOString().slice(0,10);
        const ce = new Date(cd.endDate).toISOString().slice(0,10);
        return !(cs === lockRange.start && ce === lockRange.end);
      }));
      onChanged && onChanged();
      fetchMonthBookings();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className={`w-full overflow-hidden bg-white/90 backdrop-blur-sm rounded-xl shadow-md ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>{room.roomNumber} • {room.roomType}</div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous year" onClick={() => setCurrent(new Date(current.getFullYear()-1, current.getMonth(), 1))} className={`${compact ? 'p-1.5' : 'p-2'} hover:bg-gray-100 rounded`}>
            «
          </button>
          <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth()-1, 1))} className={`${compact ? 'p-1.5' : 'p-2'} hover:bg-gray-100 rounded`}>
            <FaChevronLeft />
          </button>
          <div className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>{monthName}</div>
          <select
            className={`px-2 ${compact ? 'py-0.5 text-xs' : 'py-1 text-sm'} border rounded`}
            value={current.getMonth()}
            onChange={(e)=>{
              const m = Number(e.target.value);
              setCurrent(new Date(current.getFullYear(), m, 1));
            }}
          >
            {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=>(
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            className={`px-2 ${compact ? 'py-0.5 text-xs' : 'py-1 text-sm'} border rounded`}
            value={current.getFullYear()}
            onChange={(e)=>{
              const y = Number(e.target.value);
              setCurrent(new Date(y, current.getMonth(), 1));
            }}
          >
            {Array.from({length: 11}, (_,k)=> current.getFullYear()-5 + k).map(y=>(
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" aria-label="Next month" onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth()+1, 1))} className={`${compact ? 'p-1.5' : 'p-2'} hover:bg-gray-100 rounded`}>
            <FaChevronRight />
          </button>
          <button type="button" aria-label="Next year" onClick={() => setCurrent(new Date(current.getFullYear()+1, current.getMonth(), 1))} className={`${compact ? 'p-1.5' : 'p-2'} hover:bg-gray-100 rounded`}>
            »
          </button>
        </div>
      </div>
      <div className={`grid grid-cols-7 gap-1 ${compact ? 'mb-1' : 'mb-2'} text-[11px] md:text-xs text-gray-600`}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (<div key={d} className="text-center py-1">{d}</div>))}
      </div>
      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) => {
            const status = dayStatus(d);
            const cls = {
              empty: 'bg-transparent',
              free: 'bg-gray-50 hover:bg-gray-100',
              booked: 'bg-amber-100',
              closed: 'bg-rose-100',
              today: 'bg-emerald-50',
              selected: 'bg-yellow-100'
            }[status] || 'bg-gray-50';
            return (
              <button type="button" onClick={() => onCellClick(d)} key={idx} className={`${compact ? 'min-h-[48px] p-1.5' : 'min-h-[80px] p-2'} rounded ${cls} text-left w-full`}>
                {d && <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-800`}>{d.getDate()}</div>}
              </button>
            );
          })}
        </div>
      )}
      {!readOnly && (
        <div className={`${compact ? 'mt-3' : 'mt-4'} grid grid-cols-1 md:grid-cols-3 gap-2`}>
          <input type="date" value={lockRange.start} onChange={e => setLockRange(r => ({...r, start: e.target.value}))} className={`${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} border rounded`} />
          <input type="date" value={lockRange.end} onChange={e => setLockRange(r => ({...r, end: e.target.value}))} className={`${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} border rounded`} />
          <div className="flex gap-2">
            <button onClick={lockRoom} className={`flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white ${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} rounded`}>
              <FaLock /> Lock
            </button>
            <button onClick={unlockRoom} className={`flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 ${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} rounded hover:bg-gray-50`}>
              <FaUnlock /> Unlock
            </button>
          </div>
        </div>
      )}
      {/* Day details inspector */}
      {selectedDay && (
        <div className={`${compact ? 'mt-2' : 'mt-3'} text-xs text-gray-700 bg-gray-50/70 rounded-lg p-2`}>
          <div className="font-semibold mb-1">{selectedDay.toLocaleDateString()}</div>
          <div className="space-y-1">
            {(() => {
              const dayBookings = bookings.filter(b => {
                const ci = new Date(b.checkIn), co = new Date(b.checkOut);
                const d0 = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate());
                return d0 >= new Date(ci.getFullYear(), ci.getMonth(), ci.getDate()) && d0 < new Date(co.getFullYear(), co.getMonth(), co.getDate());
              });
              const dayClosed = (Array.isArray(localClosedDates) ? localClosedDates : []).filter(cd => {
                if (!cd?.startDate || !cd?.endDate) return false;
                const cs = new Date(cd.startDate), ce = new Date(cd.endDate);
                const d0 = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate());
                return d0 >= new Date(cs.getFullYear(), cs.getMonth(), cs.getDate()) && d0 < new Date(ce.getFullYear(), ce.getMonth(), ce.getDate());
              });
              return (
                <>
                  {dayBookings.length > 0 ? (
                    <div>
                      <div className="text-gray-600 mb-1">Bookings:</div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {dayBookings.map((b, i) => (
                          <li key={b._id || i} className="text-gray-800">
                            {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()} {b.guest?.firstName ? `• ${b.guest.firstName}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-gray-500">No bookings this day.</div>
                  )}
                  {dayClosed.length > 0 && (
                    <div className="mt-1">
                      <div className="text-gray-600">Closed:</div>
                      <ul className="list-disc pl-5">
                        {dayClosed.map((cd, i) => (
                          <li key={i}>{new Date(cd.startDate).toLocaleDateString()} → {new Date(cd.endDate).toLocaleDateString()} {cd.reason ? `• ${cd.reason}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
      <div className={`${compact ? 'mt-2 text-[11px]' : 'mt-3 text-xs'} text-gray-500 flex gap-3`}>
        <div><span className="inline-block w-3 h-3 bg-amber-200 mr-1 align-middle rounded-sm"></span>Booked</div>
        <div><span className="inline-block w-3 h-3 bg-rose-200 mr-1 align-middle rounded-sm"></span>Closed</div>
        <div><span className="inline-block w-3 h-3 bg-emerald-100 mr-1 align-middle rounded-sm"></span>Today</div>
      </div>
    </div>
  );
}
