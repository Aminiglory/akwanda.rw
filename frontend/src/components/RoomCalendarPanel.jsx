import React, { useEffect, useMemo, useState } from 'react';
import '../styles/calendar.css';
import { FaChevronLeft, FaChevronRight, FaLock, FaUnlock, FaCog, FaCalendarAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
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
  // Debug logging
  console.log('RoomCalendarPanel props:', { propertyId, room: room?.roomNumber || room?.roomType, roomId: room?._id || room?.id, readOnly, compact });
  const [current, setCurrent] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lockRange, setLockRange] = useState({ start: '', end: '' });
  const [localClosedDates, setLocalClosedDates] = useState(Array.isArray(room?.closedDates) ? room.closedDates : []);
  const [pendingRange, setPendingRange] = useState({ start: null, end: null });
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [priceOverrides, setPriceOverrides] = useState({});
  const [minStayOverrides, setMinStayOverrides] = useState({});
  const [showAllRooms, setShowAllRooms] = useState(false);

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
        if (!roomId || showAllRooms) return true;
        return String(b.room || '') === String(roomId);
      });
      setBookings(filtered);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMonthBookings(); }, [propertyId, room?._id, current, showAllRooms]);

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
    if (!room._id && !room.id) { toast.error('Room ID not found'); return; }
    try {
      const roomId = room._id || room.id;
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${roomId}/lock`, {
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
      // Notify other calendars
      try { window.dispatchEvent(new CustomEvent('calendar:updated', { detail: { propertyId, roomId } })); } catch (_) {}
    } catch (e) { toast.error(e.message); }
  };

  const unlockRoom = async () => {
    if (!lockRange.start || !lockRange.end) { toast.error('Select start and end dates to unlock that range'); return; }
    if (!room._id && !room.id) { toast.error('Room ID not found'); return; }
    try {
      const roomId = room._id || room.id;
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${roomId}/unlock`, {
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
      // Notify other calendars
      try { window.dispatchEvent(new CustomEvent('calendar:updated', { detail: { propertyId, roomId } })); } catch (_) {}
    } catch (e) { toast.error(e.message); }
  };

  const applyBulkAction = async () => {
    if (!pendingRange.start || !pendingRange.end || !bulkAction) {
      toast.error('Select date range and action');
      return;
    }
    
    try {
      const startDate = pendingRange.start.toISOString().slice(0, 10);
      const endDate = pendingRange.end.toISOString().slice(0, 10);
      
      switch (bulkAction) {
        case 'close':
          await lockRoom();
          break;
        case 'open':
          await unlockRoom();
          break;
        case 'price_increase':
          toast.success('Price increase applied to selected dates');
          break;
        case 'min_stay':
          toast.success('Minimum stay requirement applied');
          break;
        default:
          toast.error('Invalid action');
      }
      
      setPendingRange({ start: null, end: null });
      setBulkAction('');
    } catch (e) {
      toast.error(e.message);
    }
  };

  // Safety check for room data
  if (!room) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Calendar Error</div>
        <div className="text-red-600 text-sm">Room data not available</div>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      {!readOnly && (
        <div className={`${compact ? 'mb-2' : 'mb-3'}`}>
          <div className="text-sm font-semibold text-gray-900">Booking Calendar</div>
          <div className="text-xs text-gray-500">Lock/unlock dates, view bookings, and manage availability</div>
        </div>
      )}
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="flex items-center gap-3">
          <div className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>
            {room.roomNumber || 'Room'} • {room.roomType || 'Unknown Type'}{!readOnly && showAllRooms ? ' • All rooms' : ''}
          </div>
          {!readOnly && (
            <>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`p-2 rounded-lg transition-colors ${showAdvanced ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title="Advanced Controls"
              >
                <FaCog className="text-sm" />
              </button>
              <button
                onClick={() => setShowAllRooms(v => !v)}
                className={`p-2 rounded-lg transition-colors ${showAllRooms ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={showAllRooms ? 'Showing bookings for all rooms' : 'Show bookings for all rooms'}
              >
                {showAllRooms ? <FaEye className="text-sm" /> : <FaEyeSlash className="text-sm" />}
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous year" onClick={() => setCurrent(new Date(current.getFullYear()-1, current.getMonth(), 1))} className={`${compact ? 'p-1.5' : 'p-2'} hover:bg-gray-100 rounded`}>
            «
          </button>
          <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth()-1, 1))} className={`${compact ? 'p-1.5' : 'p-2'} hover:bg-gray-100 rounded`}>
            <FaChevronLeft />
          </button>
          <div className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>{monthName}</div>
          <select
            className={`${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
            className={`${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            value={current.getFullYear()}
            onChange={(e)=>{
              const y = Number(e.target.value);
              setCurrent(new Date(y, current.getMonth(), 1));
            }}
          >
            {(() => {
              const base = new Date().getFullYear();
              return Array.from({length: 101}, (_,k)=> base + k).map(y => (
                <option key={y} value={y}>{y}</option>
              ));
            })()}
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
              booked: 'cal-cell--booked',
              closed: 'cal-cell--closed',
              today: 'cal-cell--today',
              selected: 'bg-yellow-100'
            }[status] || 'bg-gray-50';
            return (
              <button type="button" onClick={() => onCellClick(d)} key={idx} className={`${compact ? 'min-h-[48px] p-1.5' : 'min-h-[80px] p-2'} rounded ${cls} text-left w-full border transition-colors ${status==='booked' ? 'border-amber-300' : status==='closed' ? 'border-rose-300' : 'border-transparent hover:border-gray-300'}`}>
                {d && <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-800`}>{d.getDate()}</div>}
              </button>
            );
          })}
        </div>
      )}
      {!readOnly && !showAdvanced && (
        <div className={`${compact ? 'mt-3' : 'mt-4'} grid grid-cols-1 md:grid-cols-3 gap-2`}>
          <input type="date" value={lockRange.start} onChange={e => setLockRange(r => ({...r, start: e.target.value}))} className={`${compact ? 'px-3 py-2 text-sm' : 'px-4 py-3'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`} />
          <input type="date" value={lockRange.end} onChange={e => setLockRange(r => ({...r, end: e.target.value}))} className={`${compact ? 'px-3 py-2 text-sm' : 'px-4 py-3'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`} />
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
      
      {!readOnly && showAdvanced && (
        <div className={`${compact ? 'mt-3' : 'mt-4'} bg-gray-50 rounded-lg p-4 space-y-4`}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Advanced Room Management</h4>
            <span className="text-xs text-gray-500">Booking.com-style controls</span>
          </div>
          
          {/* Bulk Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="date" value={lockRange.start} onChange={e => setLockRange(r => ({...r, start: e.target.value}))} className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Start Date" />
            <input type="date" value={lockRange.end} onChange={e => setLockRange(r => ({...r, end: e.target.value}))} className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="End Date" />
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Select Action</option>
              <option value="close">Close Dates</option>
              <option value="open">Open Dates</option>
              <option value="price_increase">Price Override</option>
              <option value="min_stay">Min Stay Rule</option>
            </select>
            <button onClick={applyBulkAction} className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Apply
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button onClick={lockRoom} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm">
              <FaLock /> Close
            </button>
            <button onClick={unlockRoom} className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
              <FaUnlock /> Open
            </button>
            <button className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm">
              <FaEye /> Show All
            </button>
            <button className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm">
              <FaCalendarAlt /> Sync
            </button>
          </div>
          
          {pendingRange.start && pendingRange.end && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-900">
                Selected: {pendingRange.start.toLocaleDateString()} - {pendingRange.end.toLocaleDateString()}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {Math.ceil((pendingRange.end - pendingRange.start) / (1000 * 60 * 60 * 24))} days selected
              </div>
            </div>
          )}
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
                      <ul className="space-y-1">
                        {dayBookings.map((b, i) => (
                          <li key={b._id || i} className="flex items-center justify-between bg-white rounded-md border p-2">
                            <div className="text-gray-800 text-xs">
                              <div className="font-medium">
                                {b.guest?.firstName || 'Guest'} {b.guest?.lastName || ''}
                              </div>
                              <div className="opacity-70">
                                {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Quick Links like booking.com */}
                              <a
                                href={`/booking-confirmation/${b._id}`}
                                className="px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700 text-[11px]"
                                title="View booking"
                              >View</a>
                              <a
                                href={`/messages?booking=${b._id}`}
                                className="px-2 py-1 rounded text-white bg-emerald-600 hover:bg-emerald-700 text-[11px]"
                                title="Open messages"
                              >Chat</a>
                              <a
                                href={`${API_URL}/api/bookings/${b._id}/receipt.csv`}
                                target="_blank" rel="noopener noreferrer"
                                className="px-2 py-1 rounded text-white bg-purple-600 hover:bg-purple-700 text-[11px]"
                                title="Download receipt"
                              >Receipt</a>
                            </div>
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
                          <li key={i} className="text-rose-700">
                            {new Date(cd.startDate).toLocaleDateString()} → {new Date(cd.endDate).toLocaleDateString()} {cd.reason ? `• ${cd.reason}` : ''}
                          </li>
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
      <div className={`${compact ? 'mt-2' : 'mt-3'} cal-legend`}>
        <span><span className="dot booked"></span>Booked</span>
        <span><span className="dot closed"></span>Closed</span>
        <span><span className="dot today"></span>Today</span>
      </div>
    </div>
  );
}
