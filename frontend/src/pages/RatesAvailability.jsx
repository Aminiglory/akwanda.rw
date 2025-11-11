import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useSearchParams } from 'react-router-dom';
import { FaCalendar, FaDoorOpen, FaCopy, FaRuler, FaMoneyBillWave, FaGift, FaChartLine, FaUsers, FaGlobe, FaMobileAlt, FaCalendarTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RatesAvailability() {
  const { formatCurrencyRWF } = useLocale() || {};
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'calendar';
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(false);
  const [propertyData, setPropertyData] = useState(null);
  const [calendarData, setCalendarData] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [valueAdds, setValueAdds] = useState([]);
  const [pricingPerGuest, setPricingPerGuest] = useState(null);
  const [countryRates, setCountryRates] = useState([]);
  const [mobileRates, setMobileRates] = useState(null);
  const [dateRanges, setDateRanges] = useState({}); // Store date ranges per room
  const [availabilityStrategy, setAvailabilityStrategy] = useState({});
  const [seasonalRates, setSeasonalRates] = useState([]);
  const [activeMonth, setActiveMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [roomRanges, setRoomRanges] = useState({}); // { [roomId]: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } }
  const [dayModal, setDayModal] = useState(null); // { roomId, date: 'YYYY-MM-DD', events: [] }

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchPropertyDetails();
      if (view === 'calendar') {
        fetchCalendar();
      } else if (view === 'rate-plans') {
        fetchRatePlans();
      } else if (view === 'availability-planner') {
        fetchAvailabilityPlanner();
      }
    }
  }, [selectedProperty, view]);

  const fetchPropertyDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setPropertyData(data.property || data);
    } catch (e) {
      console.error('Failed to load property details:', e);
    }
  };

  const fmt = (d) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const daysInMonth = (base) => {
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Mon=0
    const days = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i=0;i<startWeekday;i++) cells.push(null);
    for (let d=1; d<=days; d++) cells.push(new Date(year, month, d));
    // pad to multiple of 7
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const isClosed = (room, dateStr) => {
    const closed = room.closedDates || [];
    return closed.some(c => c === dateStr || (c.date && c.date.startsWith(dateStr)));
  };

  const onDayClick = (room, dayDate) => {
    if (!dayDate) return;
    const dateStr = fmt(dayDate);
    // range selection: first click -> start, second -> end then open modal for actions
    const cur = roomRanges[room._id] || {};
    if (!cur.start || (cur.start && cur.end)) {
      setRoomRanges(prev => ({ ...prev, [room._id]: { start: dateStr, end: '' } }));
      setDateRanges(prev => ({ ...prev, [room._id]: { startDate: dateStr, endDate: '' } }));
      setDayModal({ roomId: room._id, date: dateStr, events: [] });
    } else if (!cur.end) {
      const start = cur.start <= dateStr ? cur.start : dateStr;
      const end = cur.start <= dateStr ? dateStr : cur.start;
      setRoomRanges(prev => ({ ...prev, [room._id]: { start, end } }));
      setDateRanges(prev => ({ ...prev, [room._id]: { startDate: start, endDate: end } }));
      setDayModal({ roomId: room._id, date: start, events: [], rangeEnd: end });
    }
  };

  const applyRangeAction = async (roomId, action) => {
    const range = roomRanges[roomId];
    if (!range?.start || !range?.end) { toast.error('Select start and end'); return; }
    if (action === 'open') await handleOpenDates(roomId);
    if (action === 'close') await handleCloseDates(roomId);
    setDayModal(null);
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setProperties(data.properties || []);
      if (data.properties?.length > 0) {
        setSelectedProperty(data.properties[0]._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/rates/calendar/${selectedProperty}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load calendar');
      const data = await res.json();
      setCalendarData(data.calendar || []);
    } catch (e) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const fetchRatePlans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/rates/plans/${selectedProperty}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load rate plans');
      const data = await res.json();
      setRatePlans(data.plans || []);
    } catch (e) {
      toast.error('Failed to load rate plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDates = async (roomId) => {
    const range = dateRanges[roomId];
    if (!range?.startDate || !range?.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/rates/bulk/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
          rooms: [{ propertyId: selectedProperty, roomId }]
        })
      });
      if (!res.ok) throw new Error('Failed to close dates');
      toast.success('Dates closed successfully');
      fetchPropertyDetails();
      try {
        window.dispatchEvent(new CustomEvent('calendar:updated', { detail: { propertyId: selectedProperty, roomId } }));
      } catch (_) {}
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleOpenDates = async (roomId) => {
    const range = dateRanges[roomId];
    if (!range?.startDate || !range?.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/rates/bulk/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
          rooms: [{ propertyId: selectedProperty, roomId }]
        })
      });
      if (!res.ok) throw new Error('Failed to open dates');
      toast.success('Dates opened successfully');
      fetchPropertyDetails();
      try {
        window.dispatchEvent(new CustomEvent('calendar:updated', { detail: { propertyId: selectedProperty, roomId } }));
      } catch (_) {}
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleUpdateRestrictions = async (roomId, minStay, maxStay) => {
    try {
      const res = await fetch(`${API_URL}/api/rates/bulk/restrictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          minStay,
          maxStay,
          rooms: [{ propertyId: selectedProperty, roomId }]
        })
      });
      if (!res.ok) throw new Error('Failed to update restrictions');
      toast.success('Restrictions updated successfully');
      fetchPropertyDetails();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleCopyYearlyRates = async (sourceYear, targetYear) => {
    try {
      const res = await fetch(`${API_URL}/api/rates/copy-yearly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: selectedProperty,
          sourceYear,
          targetYear
        })
      });
      if (!res.ok) throw new Error('Failed to copy rates');
      const data = await res.json();
      toast.success(data.message || 'Rates copied successfully');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleUpdatePricingPerGuest = async (roomId, extraGuestFee) => {
    try {
      const res = await fetch(`${API_URL}/api/rates/pricing-per-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: selectedProperty,
          roomId,
          additionalGuestCharge: extraGuestFee
        })
      });
      if (!res.ok) throw new Error('Failed to update pricing');
      toast.success('Pricing per guest updated successfully');
      fetchPropertyDetails();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSaveCountryRates = async (countryRates) => {
    try {
      const res = await fetch(`${API_URL}/api/rates/country-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: selectedProperty,
          countryRates
        })
      });
      if (!res.ok) throw new Error('Failed to save country rates');
      toast.success('Country rates saved successfully');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleSaveMobileRates = async (mobileDiscount) => {
    try {
      const res = await fetch(`${API_URL}/api/rates/mobile-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: selectedProperty,
          mobileDiscount
        })
      });
      if (!res.ok) throw new Error('Failed to save mobile rates');
      toast.success('Mobile rates saved successfully');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const fetchAvailabilityPlanner = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/rates/availability-planner/${selectedProperty}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load availability planner');
      const data = await res.json();
      setAvailabilityStrategy(data.strategy || {});
      setSeasonalRates(data.seasonalRates || []);
    } catch (e) {
      toast.error('Failed to load availability planner');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailabilityStrategy = async (strategy, rates) => {
    try {
      const res = await fetch(`${API_URL}/api/rates/availability-planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: selectedProperty,
          strategy,
          seasonalRates: rates
        })
      });
      if (!res.ok) throw new Error('Failed to save availability strategy');
      const data = await res.json();
      toast.success(data.message || 'Availability strategy saved successfully');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'calendar':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#4b2a00]">
              <FaCalendar className="text-[#a06b42]" /> Pricing and booking calendar
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button onClick={() => setActiveMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="px-3 py-1 rounded text-sm bg-[#f5f0e8] border border-[#d4c4b0] text-[#4b2a00] hover:bg-[#e8dcc8]">Prev</button>
                  <div className="font-semibold text-[#4b2a00]">{activeMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                  <button onClick={() => setActiveMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="px-3 py-1 rounded text-sm bg-[#f5f0e8] border border-[#d4c4b0] text-[#4b2a00] hover:bg-[#e8dcc8]">Next</button>
                </div>
                {calendarData.map((room, idx) => {
                  const cells = daysInMonth(activeMonth);
                  const sel = roomRanges[room._id] || {};
                  return (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#4b2a00]">{room.roomType} <span className="text-sm text-gray-500">• {formatCurrencyRWF ? formatCurrencyRWF(room.rate || 0) : `RWF ${(room.rate || 0).toLocaleString()}`}/night</span></h3>
                        <div className="text-xs text-gray-600">Min {room.minStay} • Max {room.maxStay} • Closed {room.closedDates?.length || 0}</div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-xs text-gray-600 mb-1">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="text-center py-1">{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((d, i) => {
                          const dateStr = d ? fmt(d) : '';
                          const closed = d && isClosed(room, dateStr);
                          const inSel = d && sel.start && sel.end && dateStr >= sel.start && dateStr <= sel.end;
                          return (
                            <button
                              key={i}
                              disabled={!d}
                              onClick={() => onDayClick(room, d)}
                              className={`h-9 md:h-8 rounded border text-xs flex items-center justify-center ${!d ? 'bg-transparent border-transparent' : closed ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-gray-200 hover:bg-[#f5f0e8]'} ${inSel ? 'ring-2 ring-[#a06b42] bg-[#f5f0e8] border-[#d4c4b0]' : ''}`}
                            >
                              {d ? d.getDate() : ''}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-rose-100 rounded border border-rose-200"></span>Closed</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-[#e8dcc8] rounded border border-[#d4c4b0]"></span>Selected range</span>
                        <div className="ml-auto flex gap-2">
                          <button onClick={() => handleOpenDates(room._id)} className="px-2 py-1 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">Open</button>
                          <button onClick={() => handleCloseDates(room._id)} className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded">Close</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {dayModal && (
              <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center" role="dialog" aria-modal="true">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{new Date(dayModal.date).toLocaleDateString()}</div>
                    <button onClick={() => setDayModal(null)} className="text-gray-600 hover:text-gray-900">Close</button>
                  </div>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="text-xs text-gray-500">Room: {calendarData.find(r => r._id === dayModal.roomId)?.roomType || ''}</div>
                    {dayModal.events?.length ? (
                      dayModal.events.map((ev, i) => <div key={i} className="p-2 rounded bg-gray-50 border">{ev.title}</div>)
                    ) : (
                      <div className="p-2 rounded bg-gray-50 border text-gray-600 text-xs">No specific activities recorded for this day.</div>
                    )}
                  </div>
                  {roomRanges[dayModal.roomId]?.start && roomRanges[dayModal.roomId]?.end && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => applyRangeAction(dayModal.roomId, 'open')} className="px-3 py-2 bg-green-600 text-white rounded">Open Selected</button>
                      <button onClick={() => applyRangeAction(dayModal.roomId, 'close')} className="px-3 py-2 bg-red-600 text-white rounded">Close Selected</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'mobile-rates':
        const [mobileDiscount, setMobileDiscount] = React.useState(Number(mobileRates?.discount || 10));
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaMobileAlt /> Mobile Rates
            </h2>
            <p className="text-gray-600 mb-4">Offer a special discount for guests booking via mobile devices to boost conversions.</p>
            <div className="max-w-md p-4 border rounded">
              <label className="block text-sm font-medium mb-2">Mobile Discount (%)</label>
              <input type="number" min="0" max="90" value={mobileDiscount} onChange={(e)=> setMobileDiscount(Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
              <button onClick={()=> handleSaveMobileRates(mobileDiscount)} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </div>
        );

      case 'open-close':
        const [selectedRoomForCalendar, setSelectedRoomForCalendar] = React.useState(null);
        const [currentMonth, setCurrentMonth] = React.useState(new Date());
        
        // Generate calendar days for the current month
        const generateCalendarDays = () => {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const daysInMonth = lastDay.getDate();
          const startingDayOfWeek = firstDay.getDay();
          
          const days = [];
          // Add empty cells for days before the first day of the month
          for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
          }
          // Add all days of the month
          for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
          }
          return days;
        };
        
        const isDateClosed = (date, room) => {
          if (!date || !room?.closedDates) return false;
          const dateStr = date.toISOString().split('T')[0];
          return room.closedDates.some(closedDate => {
            const closed = new Date(closedDate).toISOString().split('T')[0];
            return closed === dateStr;
          });
        };
        
        const goToPreviousMonth = () => {
          setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
        };
        
        const goToNextMonth = () => {
          setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
        };
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaDoorOpen className="text-[#a06b42]" /> Open/Close Rooms
            </h2>
            <p className="text-gray-600 mb-6">Manage room availability by opening or closing specific dates.</p>
            
            {!propertyData?.rooms || propertyData.rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No rooms available. Please add rooms to your property first.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Date Range Selection for Bulk Operations */}
                <div className="bg-[#f5f0e8] border border-[#e0d5c7] rounded-lg p-4">
                  <h3 className="font-semibold text-[#4b2a00] mb-3">📅 Bulk Date Management</h3>
                  <p className="text-sm text-[#4b2a00] mb-3">Select date ranges to open or close multiple dates at once</p>
                  
                  {propertyData.rooms.map((room, idx) => (
                    <div key={idx} className="bg-white border rounded-lg p-4 mb-3">
                      <h4 className="font-semibold mb-2 text-gray-800">{room.roomType} - {room.roomNumber}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Start Date</label>
                          <input 
                            type="date" 
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42]"
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setDateRanges(prev => ({
                              ...prev,
                              [room._id]: { ...prev[room._id], startDate: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">End Date</label>
                          <input 
                            type="date" 
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42]"
                            min={dateRanges[room._id]?.startDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => setDateRanges(prev => ({
                              ...prev,
                              [room._id]: { ...prev[room._id], endDate: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenDates(room._id)}
                          className="flex-1 px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <FaDoorOpen /> Open Dates
                        </button>
                        <button 
                          onClick={() => handleCloseDates(room._id)}
                          className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <FaCalendarTimes /> Close Dates
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Currently closed dates: <span className="font-semibold text-red-600">{room.closedDates?.length || 0}</span>
                        </span>
                        <button 
                          onClick={() => setSelectedRoomForCalendar(selectedRoomForCalendar === room._id ? null : room._id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {selectedRoomForCalendar === room._id ? 'Hide Calendar' : 'View Calendar'}
                        </button>
                      </div>
                      
                      {/* Calendar View */}
                      {selectedRoomForCalendar === room._id && (
                        <div className="mt-4 border-t pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <button 
                              onClick={goToPreviousMonth}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                            >
                              ← Prev
                            </button>
                            <h4 className="font-semibold text-gray-800">
                              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </h4>
                            <button 
                              onClick={goToNextMonth}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                            >
                              Next →
                            </button>
                          </div>
                          
                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {/* Day headers */}
                            {dayNames.map(day => (
                              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                                {day}
                              </div>
                            ))}
                            
                            {/* Calendar days */}
                            {generateCalendarDays().map((date, idx) => {
                              if (!date) {
                                return <div key={`empty-${idx}`} className="aspect-square" />;
                              }
                              
                              const isClosed = isDateClosed(date, room);
                              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                              const isToday = date.toDateString() === new Date().toDateString();
                              
                              return (
                                <div
                                  key={idx}
                                  className={`
                                    aspect-square flex items-center justify-center text-sm rounded-lg cursor-pointer
                                    ${isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                                    ${isClosed && !isPast ? 'bg-rose-100 text-rose-700 font-semibold' : ''}
                                    ${!isClosed && !isPast ? 'bg-[#f5f0e8] text-[#4b2a00] hover:bg-[#e8dcc8]' : ''}
                                    ${isToday ? 'ring-2 ring-[#a06b42]' : ''}
                                  `}
                                  title={isClosed ? 'Closed' : 'Available'}
                                >
                                  {date.getDate()}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Legend */}
                          <div className="mt-4 flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 bg-[#f5f0e8] border border-[#d4c4b0] rounded"></div>
                              <span>Available</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 bg-rose-100 border border-rose-200 rounded"></div>
                              <span>Closed</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
                              <span>Past</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 border-2 border-[#a06b42] rounded"></div>
                              <span>Today</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Quick Actions */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">💡 Quick Tips</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use date ranges to quickly close multiple dates for maintenance or holidays</li>
                    <li>• View the calendar to see which dates are currently closed</li>
                    <li>• Green dates are available for booking, red dates are closed</li>
                    <li>• You can reopen closed dates anytime by selecting the date range and clicking "Open Dates"</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        );

      case 'copy-yearly':
        const [sourceYear, setSourceYear] = React.useState(new Date().getFullYear());
        const [targetYear, setTargetYear] = React.useState(new Date().getFullYear() + 1);
        
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaCopy /> Copy Yearly Rates
            </h2>
            <p className="text-gray-600 mb-6">Copy rates from one year to another to save time.</p>
            <div className="border rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source Year</label>
                  <select 
                    value={sourceYear}
                    onChange={(e) => setSourceYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[2024, 2025, 2026, 2027].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Year</label>
                  <select 
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[2025, 2026, 2027, 2028].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                onClick={() => handleCopyYearlyRates(sourceYear, targetYear)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copy Rates from {sourceYear} to {targetYear}
              </button>
              <p className="text-xs text-gray-500 mt-3">
                This will copy all rate settings, seasonal pricing, and restrictions from {sourceYear} to {targetYear}.
              </p>
            </div>
          </div>
        );

      case 'restrictions':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaRuler /> Dynamic Restriction Rules
            </h2>
            <p className="text-gray-600 mb-4">Set minimum and maximum stay requirements.</p>
            {propertyData?.rooms?.map((room, idx) => {
              const [minStay, setMinStay] = React.useState(room.minStay || 1);
              const [maxStay, setMaxStay] = React.useState(room.maxStay || 30);
              
              return (
                <div key={idx} className="border rounded-lg p-4 mb-3">
                  <h3 className="font-semibold mb-3">{room.roomType} - {room.roomNumber}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Min Stay (nights)</label>
                      <input 
                        type="number" 
                        value={minStay} 
                        onChange={(e) => setMinStay(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-sm" 
                        min="1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Max Stay (nights)</label>
                      <input 
                        type="number" 
                        value={maxStay} 
                        onChange={(e) => setMaxStay(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-sm" 
                        min="1" 
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={() => handleUpdateRestrictions(room._id, minStay, maxStay)}
                        className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'rate-plans':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaMoneyBillWave /> Rate Plans
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-4">
                {ratePlans.map((plan, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                    <p className="text-lg font-bold text-green-600 mt-2">RWF {plan.baseRate?.toLocaleString()}/night</p>
                    <div className="mt-3 space-y-2">
                      {plan.rooms?.map((room, ridx) => (
                        <div key={ridx} className="text-sm flex justify-between">
                          <span>{room.roomType}</span>
                          <span className="font-medium">RWF {room.rate?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'value-adds':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaGift /> Value Adds
            </h2>
            <p className="text-gray-600 mb-4">Add extra services or amenities to increase booking value.</p>
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Breakfast</h3>
                  <span className="text-green-600 font-bold">+RWF 5,000</span>
                </div>
                <p className="text-sm text-gray-600">Continental breakfast included</p>
                <label className="flex items-center mt-2">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Enable for all bookings</span>
                </label>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Airport Transfer</h3>
                  <span className="text-green-600 font-bold">+RWF 15,000</span>
                </div>
                <p className="text-sm text-gray-600">One-way airport pickup</p>
                <label className="flex items-center mt-2">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Enable for all bookings</span>
                </label>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Late Checkout</h3>
                  <span className="text-green-600 font-bold">+RWF 10,000</span>
                </div>
                <p className="text-sm text-gray-600">Checkout until 6 PM</p>
                <label className="flex items-center mt-2">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Enable for all bookings</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'availability-planner':
        const [peakSeasonStart, setPeakSeasonStart] = React.useState('');
        const [peakSeasonEnd, setPeakSeasonEnd] = React.useState('');
        const [peakRateIncrease, setPeakRateIncrease] = React.useState(20);
        const [offSeasonStart, setOffSeasonStart] = React.useState('');
        const [offSeasonEnd, setOffSeasonEnd] = React.useState('');
        const [offSeasonDiscount, setOffSeasonDiscount] = React.useState(15);
        const [minOccupancy, setMinOccupancy] = React.useState(60);
        const [localSeasonalRates, setLocalSeasonalRates] = React.useState(seasonalRates);
        
        const addSeasonalRate = (type) => {
          const newRate = {
            type,
            startDate: type === 'peak' ? peakSeasonStart : offSeasonStart,
            endDate: type === 'peak' ? peakSeasonEnd : offSeasonEnd,
            adjustment: type === 'peak' ? peakRateIncrease : -offSeasonDiscount
          };
          
          if (!newRate.startDate || !newRate.endDate) {
            toast.error('Please select both start and end dates');
            return;
          }
          
          const updated = [...localSeasonalRates, newRate];
          setLocalSeasonalRates(updated);
          toast.success(`${type === 'peak' ? 'Peak' : 'Off'} season added`);
        };
        
        const removeSeasonalRate = (index) => {
          const updated = localSeasonalRates.filter((_, i) => i !== index);
          setLocalSeasonalRates(updated);
        };
        
        const saveStrategy = () => {
          const strategy = {
            minOccupancyTarget: minOccupancy,
            lastUpdated: new Date().toISOString()
          };
          handleSaveAvailabilityStrategy(strategy, localSeasonalRates);
        };
        
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaChartLine /> Availability Planner
            </h2>
            <p className="text-gray-600 mb-6">Plan your availability strategy for peak and off-peak seasons.</p>
            
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-6">
                {/* Peak Season */}
                <div className="border rounded-lg p-4 bg-orange-50">
                  <h3 className="font-semibold text-lg mb-3 text-orange-800">🔥 Peak Season Strategy</h3>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-700">Start Date</label>
                      <input 
                        type="date" 
                        value={peakSeasonStart}
                        onChange={(e) => setPeakSeasonStart(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700">End Date</label>
                      <input 
                        type="date" 
                        value={peakSeasonEnd}
                        onChange={(e) => setPeakSeasonEnd(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700">Rate Increase (%)</label>
                      <input 
                        type="number" 
                        value={peakRateIncrease}
                        onChange={(e) => setPeakRateIncrease(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => addSeasonalRate('peak')}
                    className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Add Peak Season Period
                  </button>
                </div>

                {/* Off Season */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-lg mb-3 text-blue-800">❄️ Off-Season Strategy</h3>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-700">Start Date</label>
                      <input 
                        type="date" 
                        value={offSeasonStart}
                        onChange={(e) => setOffSeasonStart(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700">End Date</label>
                      <input 
                        type="date" 
                        value={offSeasonEnd}
                        onChange={(e) => setOffSeasonEnd(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-700">Discount (%)</label>
                      <input 
                        type="number" 
                        value={offSeasonDiscount}
                        onChange={(e) => setOffSeasonDiscount(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => addSeasonalRate('off')}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Off-Season Period
                  </button>
                </div>

                {/* Occupancy Target */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">🎯 Occupancy Target</h3>
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-700">Minimum Occupancy Goal:</label>
                    <input 
                      type="number" 
                      value={minOccupancy}
                      onChange={(e) => setMinOccupancy(Number(e.target.value))}
                      className="px-3 py-2 border rounded w-24" 
                      min="0"
                      max="100"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    System will suggest rate adjustments to maintain this occupancy level
                  </p>
                </div>

                {/* Active Seasonal Rates */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">📅 Active Seasonal Periods</h3>
                  <div className="space-y-2">
                    {localSeasonalRates.map((rate, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded ${rate.type === 'peak' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                        <div>
                          <span className="font-medium">
                            {rate.type === 'peak' ? '🔥 Peak' : '❄️ Off'} Season
                          </span>
                          <span className="text-sm text-gray-600 ml-3">
                            {rate.startDate} to {rate.endDate}
                          </span>
                          <span className="text-sm font-semibold ml-3">
                            {rate.adjustment > 0 ? '+' : ''}{rate.adjustment}%
                          </span>
                        </div>
                        <button 
                          onClick={() => removeSeasonalRate(idx)}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {localSeasonalRates.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No seasonal periods configured</p>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <button 
                  onClick={saveStrategy}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Save Availability Strategy
                </button>
              </div>
            )}
          </div>
        );

      case 'pricing-per-guest':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaUsers /> Pricing Per Guest
            </h2>
            <p className="text-gray-600 mb-4">Set additional charges for extra guests beyond base capacity.</p>
            {propertyData?.rooms?.map((room, idx) => {
              const [extraFee, setExtraFee] = React.useState(room.additionalGuestCharge || room.extraGuestFee || 5000);
              
              return (
                <div key={idx} className="border rounded-lg p-4 mb-3">
                  <h3 className="font-semibold mb-3">{room.roomType} - {room.roomNumber}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Base Capacity</label>
                      <input 
                        type="number" 
                        value={room.capacity || 2} 
                        readOnly 
                        className="w-full px-2 py-1 border rounded text-sm bg-gray-50" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Extra Guest Fee (RWF)</label>
                      <input 
                        type="number" 
                        value={extraFee}
                        onChange={(e) => setExtraFee(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={() => handleUpdatePricingPerGuest(room._id, extraFee)}
                        className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Guests beyond {room.capacity || 2} will be charged RWF {extraFee.toLocaleString()} per night
                  </p>
                </div>
              );
            })}
          </div>
        );

      case 'country-rates':
        const [newCountry, setNewCountry] = React.useState('Rwanda');
        const [newDiscount, setNewDiscount] = React.useState(0);
        const [activeRules, setActiveRules] = React.useState([
          { country: 'Rwanda', rate: -15 },
          { country: 'East Africa', rate: -10 }
        ]);
        
        const addCountryRule = () => {
          if (!newDiscount) {
            toast.error('Please enter a discount/markup percentage');
            return;
          }
          const newRules = [...activeRules, { country: newCountry, rate: newDiscount }];
          setActiveRules(newRules);
          handleSaveCountryRates(newRules);
          setNewDiscount(0);
        };
        
        const removeCountryRule = (index) => {
          const newRules = activeRules.filter((_, i) => i !== index);
          setActiveRules(newRules);
          handleSaveCountryRates(newRules);
        };
        
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaGlobe /> Country Rates
            </h2>
            <p className="text-gray-600 mb-4">Set different rates for guests from specific countries or regions.</p>
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Country/Region</label>
                    <select 
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option>Rwanda</option>
                      <option>East Africa</option>
                      <option>Europe</option>
                      <option>North America</option>
                      <option>Asia</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Discount/Markup (%)</label>
                    <input 
                      type="number" 
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(Number(e.target.value))}
                      placeholder="-10 or +20" 
                      className="w-full px-2 py-1 border rounded text-sm" 
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={addCountryRule}
                      className="w-full px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <h3 className="font-semibold mb-2 text-sm">Active Country Rules</h3>
                <div className="space-y-2">
                  {activeRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        {rule.country}: {rule.rate > 0 ? '+' : ''}{rule.rate}%
                      </span>
                      <button 
                        onClick={() => removeCountryRule(idx)}
                        className="text-red-600 text-xs hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {activeRules.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">No country-specific rates set</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a view</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Rates & Availability</h1>
        
        {/* Property Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Property</label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg"
          >
            {properties.map(p => (
              <option key={p._id} value={p._id}>{p.title || p.name}</option>
            ))}
          </select>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
