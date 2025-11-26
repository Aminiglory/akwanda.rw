import React, { useState, useEffect } from 'react';
import '../styles/calendar.css';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaPlus, FaEdit, FaTrash, FaEye, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Lightweight timeout wrapper so calendar loads fail fast on very slow networks
const fetchWithUiTimeout = (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

const BookingCalendar = ({ propertyId, onBookingSelect, initialDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [loading, setLoading] = useState(false);
  // owner-specific controls
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [showAllRooms, setShowAllRooms] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [pendingRange, setPendingRange] = useState({ start: null, end: null });
  const [lockRange, setLockRange] = useState({ start: '', end: '' });
  const [closedRanges, setClosedRanges] = useState([]);
  const [propertyOverride, setPropertyOverride] = useState(propertyId || '');

  useEffect(() => {
    if (!propertyOverride) return;
    fetchBookings();
  }, [currentDate, propertyOverride, selectedRoomId, showAllRooms]);

  // React to initialDate changes (e.g., navigate from navbar: next month)
  useEffect(() => {
    if (initialDate instanceof Date && !isNaN(initialDate)) {
      const a = currentDate;
      if (a.getFullYear() !== initialDate.getFullYear() || a.getMonth() !== initialDate.getMonth()) {
        setCurrentDate(new Date(initialDate));
      }
    }
  }, [initialDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetchWithUiTimeout(`${API_URL}/api/bookings?propertyId=${propertyOverride}&month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        let list = data.bookings || [];
        if (!showAllRooms && selectedRoomId) {
          list = list.filter(b => String(b.room || '') === String(selectedRoomId));
        }
        setBookings(list);
      }
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Load owner's properties for selector
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithUiTimeout(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          const list = Array.isArray(data.properties) ? data.properties : [];
          setProperties(list);
          // Initialize propertyOverride if empty
          if (!propertyOverride && list.length) setPropertyOverride(list[0]._id);
        }
      } catch (_) {}
    })();
  }, []);

  // Load rooms for the selected property for filtering/locking
  useEffect(() => {
    const pid = propertyOverride;
    if (!pid) { setRooms([]); setSelectedRoomId(''); return; }
    (async () => {
      try {
        const res = await fetchWithUiTimeout(`${API_URL}/api/properties/${pid}`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          const list = Array.isArray(data.property?.rooms) ? data.property.rooms : [];
          setRooms(list);
          if (!showAllRooms && list.length) setSelectedRoomId(prev => prev || (list[0]._id || list[0].id || ''));
        }
      } catch (_) {}
    })();
  }, [propertyOverride]);

  // Fetch closed ranges (locked days) helper
  const fetchClosedRanges = async () => {
    const pid = propertyOverride;
    if (!pid) { setClosedRanges([]); return; }
    // If showing all rooms, suppress closed highlighting to prevent showing red
    // before the owner has selected a specific room to manage.
    if (showAllRooms) { setClosedRanges([]); return; }
    try {
      const noCacheUrl = `${API_URL}/api/properties/${pid}?_=${Date.now()}`;
      const res = await fetchWithUiTimeout(noCacheUrl, { credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      if (!res.ok) { setClosedRanges([]); return; }
      const list = Array.isArray(data.property?.rooms) ? data.property.rooms : [];
      let ranges = [];
      if (selectedRoomId) {
        const r = list.find(rr => String(rr._id || rr.id) === String(selectedRoomId));
        ranges = Array.isArray(r?.closedDates) ? r.closedDates : [];
      }
      setClosedRanges(ranges.filter(cd => cd && cd.startDate && cd.endDate));
    } catch (_) {
      setClosedRanges([]);
    }
  };

  // Refresh closed ranges when filters change
  useEffect(() => { fetchClosedRanges(); }, [propertyOverride, showAllRooms, selectedRoomId]);

  // Periodically refresh bookings and closed ranges to catch owner-side changes (e.g., unlocks)
  useEffect(() => {
    const t = setInterval(() => {
      fetchBookings();
      fetchClosedRanges();
    }, 30000);
    return () => clearInterval(t);
  }, [propertyOverride, currentDate, selectedRoomId, showAllRooms]);

  // Listen for global calendar updates (e.g., from RoomCalendarPanel)
  useEffect(() => {
    const handler = (e) => {
      if (!e?.detail?.propertyId) { fetchBookings(); fetchClosedRanges(); return; }
      if (String(e.detail.propertyId) === String(propertyOverride)) {
        fetchBookings();
        fetchClosedRanges();
      }
    };
    window.addEventListener('calendar:updated', handler);
    return () => window.removeEventListener('calendar:updated', handler);
  }, [propertyOverride]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    return bookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      // Treat checkout day as available (end-exclusive)
      return date >= checkIn && date < checkOut;
    });
  };

  const isDateClosed = (date) => {
    if (!date) return false;
    return closedRanges.some(cd => {
      try {
        const cs = new Date(cd.startDate);
        const ce = new Date(cd.endDate);
        const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return d0 >= new Date(cs.getFullYear(), cs.getMonth(), cs.getDate()) && d0 < new Date(ce.getFullYear(), ce.getMonth(), ce.getDate());
      } catch (_) { return false; }
    });
  };

  // Range selection on month view cells
  const onMonthCellClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    // range select for owners
    if (showAllRooms) return; // require a room when modifying
    if (!pendingRange.start) {
      setPendingRange({ start: date, end: null });
      setLockRange(r => ({ ...r, start: date.toISOString().slice(0,10), end: r.end }));
      return;
    }
    if (!pendingRange.end) {
      if (date < pendingRange.start) {
        setPendingRange({ start: date, end: pendingRange.start });
        setLockRange({ start: date.toISOString().slice(0,10), end: pendingRange.start.toISOString().slice(0,10) });
      } else {
        setPendingRange({ start: pendingRange.start, end: date });
        setLockRange(r => ({ ...r, end: date.toISOString().slice(0,10) }));
      }
      return;
    }
    // third click resets
    setPendingRange({ start: date, end: null });
    setLockRange({ start: date.toISOString().slice(0,10), end: '' });
  };

  const lockRoom = async () => {
    if (showAllRooms) { toast.error('Select a room to lock dates'); return; }
    if (!selectedRoomId) { toast.error('No room selected'); return; }
    if (!lockRange.start || !lockRange.end) { toast.error('Select start and end dates'); return; }
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${selectedRoomId}/lock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ startDate: lockRange.start, endDate: lockRange.end, reason: 'Locked by owner' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to lock');
      toast.success('Dates locked');
      setPendingRange({ start: null, end: null });
      setLockRange({ start: '', end: '' });
      fetchBookings();
      fetchClosedRanges();
      try {
        window.dispatchEvent(new CustomEvent('calendar:updated', { detail: { propertyId: propertyOverride, roomId: selectedRoomId } }));
      } catch (_) {}
    } catch (e) { toast.error(e.message); }
  };

  const unlockRoom = async () => {
    if (showAllRooms) { toast.error('Select a room to unlock dates'); return; }
    if (!selectedRoomId) { toast.error('No room selected'); return; }
    if (!lockRange.start || !lockRange.end) { toast.error('Select start and end dates'); return; }
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${selectedRoomId}/unlock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ startDate: lockRange.start, endDate: lockRange.end })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to unlock');
      toast.success('Dates unlocked');
      setPendingRange({ start: null, end: null });
      setLockRange({ start: '', end: '' });
      fetchBookings();
      try {
        window.dispatchEvent(new CustomEvent('calendar:updated', { detail: { propertyId: propertyOverride, roomId: selectedRoomId } }));
      } catch (_) {}
    } catch (e) { toast.error(e.message); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ended':
        return 'bg-[#fdf7f0] text-[#4b2a00] border-[#e0d5c7]';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const navigateWeek = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * 7));
      return newDate;
    });
  };

  const navigateDay = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + direction);
      return newDate;
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return (
      <div className="space-y-3 md:space-y-4 animate-fade-in-up">
        {/* Month Header */}
        <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">{monthName}</h2>
            {/* Month navigation buttons aligned beside the month name */}
            <div className="flex items-center space-x-2 ml-3">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32] transition-colors text-sm"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
          {/* Property selector for users with multiple properties */}
          <div className="flex items-center gap-2 md:gap-3 flex-nowrap overflow-x-auto py-1">
              <select
                className="px-3 py-2 md:px-4 md:py-3 rounded-xl bg-white border border-gray-300 text-[11px] md:text-sm"
                value={propertyOverride}
                onChange={(e)=> setPropertyOverride(e.target.value)}
                title="Select property"
              >
                {properties.length === 0 && (
                  <option value="">Select property</option>
                )}
                {properties.map(p => (
                  <option key={p._id} value={p._id}>{p.title || p.name || 'Property'}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-xl text-[11px] md:text-sm"
                value={currentDate.getMonth()}
                onChange={(e)=>{
                  const m = Number(e.target.value);
                  setCurrentDate(prev=> new Date(prev.getFullYear(), m, 1));
                }}
              >
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=>(
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-xl text-[11px] md:text-sm"
                value={currentDate.getFullYear()}
                onChange={(e)=>{
                  const y = Number(e.target.value);
                  setCurrentDate(prev=> new Date(y, prev.getMonth(), 1));
                }}
              >
                {(() => {
                  const base = new Date().getFullYear();
                  return Array.from({length: 101}, (_,k)=> base + k).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ));
                })()}
              </select>
            </div>
          </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 mb-2 md:mb-3">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="p-1.5 md:p-2 text-center font-semibold text-gray-600 text-[10px] md:text-xs bg-gray-50 rounded uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();
            const closed = date && isDateClosed(date);
            const selectedRoom = !showAllRooms && rooms.find(r => String(r._id || r.id) === String(selectedRoomId));
            
            return (
              <div
                key={index}
                className={`relative aspect-square md:min-h-[90px] p-1 md:p-2 rounded-lg flex flex-col ${date ? 'bg-white hover:bg-[#fdf7f0]' : 'bg-gray-100'} transition-all ${isSelected ? 'bg-[#f5ede1] shadow-sm' : ''} ${closed ? 'cal-cell--closed' : ''} ${isToday ? 'cal-cell--today' : ''}`}
                onClick={() => date && onMonthCellClick(date)}
              >
                {date && (
                  <>
                    <div className={`text-xs md:text-sm font-semibold mb-1 transition-colors ${
                      isToday ? 'text-[#a06b42]' : 'text-gray-900'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5 md:space-y-1 overflow-hidden">
                      {dayBookings.slice(0, 1).map(booking => (
                        <div
                          key={booking._id}
                          className={`text-[10px] md:text-[11px] p-1 rounded-md cursor-pointer transition-colors ${getStatusColor(booking.status).replace('border-', 'shadow-none ')}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingSelect && onBookingSelect(booking);
                          }}
                        >
                          <div className="font-medium truncate">{booking.guest?.firstName} {booking.guest?.lastName}</div>
                          <div className="text-[9px] md:text-[10px] opacity-75">RWF {booking.totalAmount?.toLocaleString()}</div>
                        </div>
                      ))}
                      {dayBookings.length > 1 && (
                        <div className="text-[9px] md:text-[10px] text-gray-600 text-center font-medium">+{dayBookings.length - 1} more</div>
                      )}
                    </div>
                    {/* Closed ribbon indicator */}
                    {closed && (
                      <div className="absolute top-1 right-1 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        {selectedRoom ? `Locked • ${selectedRoom.roomNumber || selectedRoom.name || 'Room'}` : 'Locked'}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="space-y-3 md:space-y-4">
        {/* Week Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32] transition-colors text-sm"
            >
              This Week
            </button>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {weekDays.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div key={index} className="space-y-2">
                <div className={`text-center p-2 rounded-lg ${
                  isToday ? 'bg-[#fdf7f0] text-[#a06b42]' : 'bg-gray-50 text-gray-700'
                }`}>
                  <div className="text-xs md:text-sm font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-base md:text-lg font-bold">{date.getDate()}</div>
                </div>
                <div className="space-y-2 min-h-[160px] md:min-h-[200px]">
                  {dayBookings.map(booking => (
                    <div
                      key={booking._id}
                      className={`p-2 rounded border ${getStatusColor(booking.status)} cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() => onBookingSelect && onBookingSelect(booking)}
                    >
                      <div className="text-xs md:text-sm font-medium">{booking.guest?.firstName} {booking.guest?.lastName}</div>
                      <div className="text-[10px] md:text-xs opacity-75">RWF {booking.totalAmount?.toLocaleString()}</div>
                      <div className="text-[10px] md:text-xs opacity-75">{booking.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();
    
    return (
      <div className="space-y-3 md:space-y-4">
        {/* Day Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">{formatDate(currentDate)}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32] transition-colors text-sm"
            >
              Today
            </button>
            <button
              onClick={() => navigateDay(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Day Bookings */}
        <div className="space-y-4">
          {dayBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaCalendarAlt className="text-3xl md:text-4xl mx-auto mb-4 text-[#e0d5c7]" />
              <p>No bookings for this day</p>
            </div>
          ) : (
            dayBookings.map(booking => (
              <div
                key={booking._id}
                className={`p-4 rounded-lg border ${getStatusColor(booking.status)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onBookingSelect && onBookingSelect(booking)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">{booking.guest?.firstName} {booking.guest?.lastName}</h3>
                    <p className="text-xs md:text-sm opacity-75">{booking.guest?.email}</p>
                    <p className="text-xs md:text-sm opacity-75">{booking.guest?.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm md:text-base">RWF {booking.totalAmount?.toLocaleString()}</div>
                    <div className="text-xs md:text-sm opacity-75">{booking.status}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="text-xs md:text-sm">Check-in: {new Date(booking.checkIn).toLocaleDateString()}</span>
                    <span className="text-xs md:text-sm">Check-out: {new Date(booking.checkOut).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded text-sm">
                      <FaEye />
                    </button>
                    <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded text-sm">
                      <FaEdit />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#e0d5c7] p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#4b2a00]">Booking Calendar</h1>
          <p className="text-[11px] md:text-xs text-gray-500">View, filter, and manage your bookings</p>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={() => setViewMode('month')}
            className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded border text-xs md:text-sm ${viewMode === 'month' ? 'bg-[#a06b42] text-white border-[#8f5a32]' : 'bg-white text-[#6b5744] hover:bg-[#fdf7f0] border-[#e0d5c7]'}`}
          >
            MONTH
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded border text-xs md:text-sm ${viewMode === 'week' ? 'bg-[#a06b42] text-white border-[#8f5a32]' : 'bg-white text-[#6b5744] hover:bg-[#fdf7f0] border-[#e0d5c7]'}`}
          >
            WEEK
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-2.5 py-1.5 md:px-3 md:py-1.5 rounded border text-xs md:text-sm ${viewMode === 'day' ? 'bg-[#a06b42] text-white border-[#8f5a32]' : 'bg-white text-[#6b5744] hover:bg-[#fdf7f0] border-[#e0d5c7]'}`}
          >
            DAY
          </button>
        </div>
      </div>

      {/* Owner controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="inline-flex items-center gap-2 text-xs md:text-sm">
          <input type="checkbox" className="rounded" checked={showAllRooms} onChange={(e)=> setShowAllRooms(e.target.checked)} />
          <span>Show all rooms</span>
        </label>
        <select
          disabled={showAllRooms}
          value={selectedRoomId}
          onChange={(e)=> setSelectedRoomId(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm border border-gray-300 rounded-xl disabled:opacity-50"
        >
          <option value="">Select room</option>
          {rooms.map(r => (
            <option key={r._id || r.id} value={r._id || r.id}>{r.roomNumber || r.name || r.roomType || 'Room'}</option>
          ))}
        </select>
        {!showAllRooms && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input type="date" value={lockRange.start} onChange={e=> setLockRange(s=>({...s, start: e.target.value}))} className="w-full sm:w-auto px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm border border-gray-300 rounded-xl" />
            <input type="date" value={lockRange.end} onChange={e=> setLockRange(s=>({...s, end: e.target.value}))} className="w-full sm:w-auto px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm border border-gray-300 rounded-xl" />
            <button onClick={lockRoom} className="w-full sm:w-auto px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm bg-red-600 text-white rounded hover:bg-red-700">Lock</button>
            <button onClick={unlockRoom} className="w-full sm:w-auto px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border rounded hover:bg-gray-50">Unlock</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#a06b42] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
          {/* Legend for consistent calendar state colors */}
          <div className="mt-4 cal-legend">
            <span><span className="dot booked"></span>Booked</span>
            <span><span className="dot closed"></span>Closed</span>
            <span><span className="dot today"></span>Today</span>
          </div>
        </>
      )}

      {/* Selected Date Info */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-[#fdf7f0] border border-[#e0d5c7] rounded-xl">
          <h3 className="font-semibold text-[#4b2a00] mb-2">
            Bookings for {formatDate(selectedDate)}
          </h3>
          <div className="space-y-2">
            {getBookingsForDate(selectedDate).map(booking => (
              <div key={booking._id} className="flex items-center justify-between text-sm">
                <span>{booking.guest?.firstName} {booking.guest?.lastName}</span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
