import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaCalendar, FaDoorOpen, FaCopy, FaRuler, FaMoneyBillWave, FaGift, FaChartLine, FaUsers, FaGlobe, FaMobileAlt, FaCalendarTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RatesAvailability() {
  const { formatCurrencyRWF } = useLocale() || {};
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawView = searchParams.get('view') || 'calendar';
  const allowedViews = new Set([
    'calendar',
    'open-close',
    'pricing-per-guest',
    'mobile-rates',
    'copy-yearly',
    'rate-plans',
    'availability-planner'
  ]);
  const view = allowedViews.has(rawView) ? rawView : 'calendar';
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
  const [singleClickMode, setSingleClickMode] = useState(true); // Toggle between single-click and range selection
  const [pricingCalendarView, setPricingCalendarView] = useState('monthly');
  const [bulkEditRoom, setBulkEditRoom] = useState(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkRange, setBulkRange] = useState({ start: '', end: '' });
  const [bulkWeekdays, setBulkWeekdays] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true });
  const [bulkRate, setBulkRate] = useState('');
  const [bulkMinStay, setBulkMinStay] = useState('');
  const [bulkMaxStay, setBulkMaxStay] = useState('');
  const [listBookings, setListBookings] = useState([]);
  
  // State for switch case views (moved to top level to follow Rules of Hooks)
  const [mobileDiscount, setMobileDiscount] = useState(10);
  const [selectedRoomForCalendar, setSelectedRoomForCalendar] = useState(null);
  // Note: using activeMonth (line 28) instead of currentMonth to avoid duplicate
  const [sourceYear, setSourceYear] = useState(new Date().getFullYear());
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const [peakSeasonStart, setPeakSeasonStart] = useState('');
  const [peakSeasonEnd, setPeakSeasonEnd] = useState('');
  const [peakRateIncrease, setPeakRateIncrease] = useState(20);
  const [offSeasonStart, setOffSeasonStart] = useState('');
  const [offSeasonEnd, setOffSeasonEnd] = useState('');
  const [offSeasonDiscount, setOffSeasonDiscount] = useState(15);
  const [minOccupancy, setMinOccupancy] = useState(60);
  const [localSeasonalRates, setLocalSeasonalRates] = useState([]);
  const [newCountry, setNewCountry] = useState('Rwanda');
  const [newDiscount, setNewDiscount] = useState(0);
  const [activeRules, setActiveRules] = useState([
    { country: 'Rwanda', rate: -15 },
    { country: 'East Africa', rate: -10 }
  ]);
  const [addOnServicesDraft, setAddOnServicesDraft] = useState([]);
  const [addOnCatalog, setAddOnCatalog] = useState([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    roomType: '',
    pricePerNight: '',
    capacity: 1,
    unitCount: 1,
    bathroomType: 'inside',
    beds: {
      twin: 0,
      full: 0,
      queen: 0,
      king: 0,
      bunk: 0,
      sofa: 0,
      futon: 0
    }
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/add-ons/catalog`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.items)) {
          setAddOnCatalog(data.items);
        } else {
          setAddOnCatalog([]);
        }
      } catch (_) {
        setAddOnCatalog([]);
      }
    })();
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

  // Load bookings for list view matrix (Rooms to sell / Net booked)
  useEffect(() => {
    const loadListBookings = async () => {
      try {
        if (!selectedProperty || view !== 'calendar' || pricingCalendarView !== 'list') return;
        const month = activeMonth.getMonth() + 1;
        const year = activeMonth.getFullYear();
        const res = await fetch(`${API_URL}/api/bookings?propertyId=${selectedProperty}&month=${month}&year=${year}`, {
          credentials: 'include'
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.bookings)) {
          setListBookings(data.bookings);
        } else {
          setListBookings([]);
        }
      } catch (_) {
        setListBookings([]);
      }
    };
    loadListBookings();
  }, [selectedProperty, view, pricingCalendarView, activeMonth]);

  // Keep add-on services draft in sync with loaded property data
  useEffect(() => {
    if (propertyData && Array.isArray(propertyData.addOnServices)) {
      setAddOnServicesDraft(propertyData.addOnServices);
    } else {
      setAddOnServicesDraft([]);
    }
  }, [propertyData]);

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
    if (!closed.length) return false;

    return closed.some((c) => {
      if (!c) return false;

      // Legacy shapes: plain string "YYYY-MM-DD" or { date: 'YYYY-MM-DD...' }
      if (typeof c === 'string') {
        return c === dateStr;
      }
      if (typeof c.date === 'string') {
        return c.date.startsWith(dateStr);
      }

      // New range shape from /api/rates/calendar: { startDate: Date, endDate: Date }
      if (c.startDate && c.endDate) {
        try {
          const s = new Date(c.startDate);
          const e = new Date(c.endDate);
          if (isNaN(s) || isNaN(e)) return false;
          const target = new Date(dateStr + 'T00:00:00Z');
          // Treat closed range as [start, end) in local-day terms
          const ts = new Date(s.getFullYear(), s.getMonth(), s.getDate());
          const te = new Date(e.getFullYear(), e.getMonth(), e.getDate());
          return target >= ts && target < te;
        } catch {
          return false;
        }
      }

      return false;
    });
  };

  const onDayClick = async (room, dayDate) => {
    if (!dayDate) return;
    const dateStr = fmt(dayDate);
    // calendarData items come from /api/rates/calendar and use roomId, not _id
    const roomId = room.roomId || room._id;
    
    if (singleClickMode) {
      // Single-click mode: instantly toggle lock/unlock like Booking.com
      const isCurrentlyClosed = isClosed(room, dateStr);
      const action = isCurrentlyClosed ? 'open' : 'close';
      
      try {
        // Backend expects a startDate and endDate range; for a single day,
        // we lock/unlock [date, nextDate)
        const startDate = dateStr;
        const next = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1);
        const endDate = fmt(next);

        const endpoint = action === 'close'
          ? `${API_URL}/api/properties/${selectedProperty}/rooms/${roomId}/lock`
          : `${API_URL}/api/properties/${selectedProperty}/rooms/${roomId}/unlock`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ startDate, endDate })
        });

        if (res.ok) {
          toast.success(`Date ${action === 'close' ? 'locked 🔒' : 'unlocked 🔓'}`);
          // Refresh calendar to show changes immediately
          await fetchCalendar();
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update date');
        }
      } catch (e) {
        console.error('Calendar update error:', e);
        toast.error(`Failed to ${action} date. Please try again.`);
      }
    } else {
      // Range selection mode: original behavior
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
    }
  };

  const applyRangeAction = async (roomId, action) => {
    const range = roomRanges[roomId];
    if (!range?.start || !range?.end) { toast.error('Select start and end'); return; }
    if (action === 'open') await handleOpenDates(roomId);
    if (action === 'close') await handleCloseDates(roomId);
    setDayModal(null);
  };

  const openBulkEdit = (room) => {
    setBulkEditRoom(room);
    setBulkEditOpen(true);
    const todayStr = fmt(new Date());
    setBulkRange(r => ({ start: r.start || todayStr, end: r.end || todayStr }));
  };

  const closeBulkEdit = () => {
    setBulkEditOpen(false);
    setBulkEditRoom(null);
  };

  const applyBulkOpenClose = async (mode) => {
    if (!bulkEditRoom) return;
    const roomId = bulkEditRoom._id;
    if (!bulkRange.start || !bulkRange.end) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (bulkRange.end < bulkRange.start) {
      toast.error('End date must be after start date');
      return;
    }
    setDateRanges(prev => ({
      ...prev,
      [roomId]: {
        startDate: bulkRange.start,
        endDate: bulkRange.end
      }
    }));
    if (mode === 'open') await handleOpenDates(roomId);
    if (mode === 'close') await handleCloseDates(roomId);
    closeBulkEdit();
  };

  const applyBulkRestrictions = async () => {
    if (!bulkEditRoom) return;
    const roomId = bulkEditRoom._id;
    const minStay = bulkMinStay !== '' ? Number(bulkMinStay) : null;
    const maxStay = bulkMaxStay !== '' ? Number(bulkMaxStay) : null;
    if (minStay != null && maxStay != null && maxStay < minStay) {
      toast.error('Maximum stay must be greater than or equal to minimum stay');
      return;
    }
    await handleUpdateRestrictions(roomId, minStay, maxStay);
    closeBulkEdit();
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

  const handleSaveAddOnServices = async (services) => {
    if (!selectedProperty) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addOnServices: services })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to save add-on services');
      toast.success('Add-on services saved');
      fetchPropertyDetails();
    } catch (e) {
      toast.error(e.message || 'Failed to save add-on services');
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

  const handleUpdatePricingPerGuest = async (roomId, extraGuestFee, maxGuests) => {
    try {
      const res = await fetch(`${API_URL}/api/rates/pricing-per-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: selectedProperty,
          roomId,
          additionalGuestCharge: extraGuestFee,
          maxGuests: maxGuests != null ? Number(maxGuests) : undefined
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

  const handleOpenAddRoomModal = () => {
    if (!selectedProperty) {
      toast.error('Please select a property first');
      return;
    }
    setNewRoom({
      roomNumber: '',
      roomType: '',
      pricePerNight: '',
      capacity: 1,
      unitCount: 1,
      bathroomType: 'inside',
      beds: {
        twin: 0,
        full: 0,
        queen: 0,
        king: 0,
        bunk: 0,
        sofa: 0,
        futon: 0
      }
    });
    setShowAddRoomModal(true);
  };

  const handleCreateRoom = async () => {
    try {
      if (!selectedProperty) {
        toast.error('No property selected');
        return;
      }

      const trimmedNumber = String(newRoom.roomNumber || '').trim();
      const trimmedType = String(newRoom.roomType || '').trim();
      const price = Number(newRoom.pricePerNight);
      const capacity = Number(newRoom.capacity);
      const unitCount = Math.max(1, Number(newRoom.unitCount) || 1);

      if (!trimmedNumber || !trimmedType) {
        toast.error('Please enter room number and room type');
        return;
      }
      if (isNaN(price) || price <= 0) {
        toast.error('Please enter a valid price per night');
        return;
      }
      if (isNaN(capacity) || capacity <= 0) {
        toast.error('Please enter a valid capacity');
        return;
      }

      if (!propertyData || !Array.isArray(propertyData.rooms)) {
        toast.error('Property rooms are not loaded yet. Please try again.');
        return;
      }

      const existingRooms = propertyData.rooms || [];
      const newRoomDoc = {
        roomNumber: trimmedNumber,
        roomType: trimmedType,
        pricePerNight: price,
        capacity,
        unitCount,
        amenities: [],
        images: [],
        isAvailable: true,
        closedDates: [],
        beds: newRoom.beds || {
          twin: 0,
          full: 0,
          queen: 0,
          king: 0,
          bunk: 0,
          sofa: 0,
          futon: 0
        },
        bathroomType: newRoom.bathroomType || 'inside'
      };

      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rooms: [...existingRooms, newRoomDoc] })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add room');
      }

      toast.success('Room added successfully');
      setShowAddRoomModal(false);
      // Refresh property details and calendar so the new room appears
      await fetchPropertyDetails();
      if (view === 'calendar') {
        await fetchCalendar();
      }
    } catch (e) {
      toast.error(e.message || 'Could not add room');
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
              <div className="text-center py-8 text-sm text-[#6b5744]">Loading availability strategy...</div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="px-3 py-1 rounded text-sm bg-[#f5f0e8] border border-[#d4c4b0] text-[#4b2a00] hover:bg-[#e8dcc8]">Prev</button>
                    <div className="font-semibold text-[#4b2a00]">{activeMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                    <button onClick={() => setActiveMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="px-3 py-1 rounded text-sm bg-[#f5f0e8] border border-[#d4c4b0] text-[#4b2a00] hover:bg-[#e8dcc8]">Next</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Click mode:</span>
                    <button
                      onClick={() => setSingleClickMode(!singleClickMode)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        singleClickMode 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}
                    >
                      {singleClickMode ? '🔒 Single Click Lock/Unlock' : '📅 Range Selection'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#6b5744]">View:</span>
                    <select
                      value={pricingCalendarView}
                      onChange={(e) => setPricingCalendarView(e.target.value)}
                      className="px-3 py-1.5 rounded-full border border-[#d4c4b0] bg-[#fdf7f0] text-[#4b2a00]"
                    >
                      <option value="monthly">Monthly view</option>
                      <option value="yearly">Yearly view</option>
                      <option value="list">List view</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedProperty) return;
                        navigate(`/owner/property?view=room-details&property=${selectedProperty}`);
                      }}
                      className="px-3 py-1.5 rounded-full border border-[#d4c4b0] bg-white text-[#4b2a00] hover:bg-[#f5f0e8]"
                    >
                      Manage rooms
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddRoomModal}
                      className="px-3 py-1.5 rounded-full border border-[#a06b42] bg-[#a06b42] text-white hover:bg-[#8f5a32]"
                    >
                      Add room
                    </button>
                  </div>
                </div>

                {showAddRoomModal && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                      <h3 className="text-lg font-semibold text-[#4b2a00] mb-4">Add new room</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Room number / name</label>
                          <input
                            type="text"
                            value={newRoom.roomNumber}
                            onChange={(e) => setNewRoom(r => ({ ...r, roomNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a06b42] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Room type</label>
                          <input
                            type="text"
                            value={newRoom.roomType}
                            onChange={(e) => setNewRoom(r => ({ ...r, roomType: e.target.value }))}
                            placeholder="e.g. Deluxe double room"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a06b42] focus:border-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Price/night (RWF)</label>
                            <input
                              type="number"
                              min="0"
                              value={newRoom.pricePerNight}
                              onChange={(e) => setNewRoom(r => ({ ...r, pricePerNight: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a06b42] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
                            <input
                              type="number"
                              min="1"
                              value={newRoom.capacity}
                              onChange={(e) => setNewRoom(r => ({ ...r, capacity: Number(e.target.value) || 1 }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a06b42] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Number of rooms of this type</label>
                            <input
                              type="number"
                              min="1"
                              value={newRoom.unitCount}
                              onChange={(e) => setNewRoom(r => ({ ...r, unitCount: Math.max(1, Number(e.target.value) || 1) }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a06b42] focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Bathroom type</label>
                          <select
                            value={newRoom.bathroomType}
                            onChange={(e) => setNewRoom(r => ({ ...r, bathroomType: e.target.value }))}
                            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a06b42] focus:border-transparent"
                          >
                            <option value="inside">Inside (private bathroom)</option>
                            <option value="shared">Shared bathroom</option>
                          </select>
                        </div>
                        <div className="mt-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">Beds</div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(newRoom.beds || {}).map(([type, count]) => (
                              <div key={type} className="flex items-center justify-between border rounded-lg px-2 py-2 md:px-3">
                                <span className="capitalize text-[11px] text-gray-700">{type} bed(s)</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="px-2 py-1 md:px-3 md:py-1 border rounded text-xs"
                                    onClick={() => setNewRoom(r => ({
                                      ...r,
                                      beds: { ...r.beds, [type]: Math.max(0, (r.beds?.[type] || 0) - 1) }
                                    }))}
                                    aria-label={`Decrease ${type} beds`}
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center text-xs">{count}</span>
                                  <button
                                    type="button"
                                    className="px-2 py-1 md:px-3 md:py-1 border rounded text-xs"
                                    onClick={() => setNewRoom(r => ({
                                      ...r,
                                      beds: { ...r.beds, [type]: (r.beds?.[type] || 0) + 1 }
                                    }))}
                                    aria-label={`Increase ${type} beds`}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex justify-end gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => setShowAddRoomModal(false)}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateRoom}
                          className="px-4 py-2 rounded-lg bg-[#a06b42] text-white hover:bg-[#8f5a32]"
                        >
                          Save room
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {pricingCalendarView === 'monthly' && (
                  <>
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
                                  className={`h-9 md:h-8 rounded border text-xs flex items-center justify-center transition-all duration-200 ${
                                    !d ? 'bg-transparent border-transparent' : 
                                    closed ? 'bg-red-200 border-red-400 text-red-900 hover:bg-red-300 font-semibold' : 
                                    'bg-green-100 border-green-300 text-green-900 hover:bg-green-200'
                                  } ${inSel ? 'ring-2 ring-[#a06b42] bg-[#f5f0e8] border-[#d4c4b0]' : ''} ${
                                    singleClickMode && d ? 'cursor-pointer hover:scale-105' : ''
                                  }`}
                                  title={d && singleClickMode ? (closed ? 'Click to unlock date' : 'Click to lock date') : ''}
                                >
                                  {d ? (
                                    <div className="flex flex-col items-center">
                                      <span>{d.getDate()}</span>
                                    </div>
                                  ) : ''}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-red-200 rounded border border-red-400"></span>Locked (Closed)</span>
                            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-green-100 rounded border border-green-300"></span>Unlocked (Open)</span>
                            {!singleClickMode && (
                              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-[#e8dcc8] rounded border border-[#d4c4b0]"></span>Selected range</span>
                            )}
                            <div className="ml-auto flex gap-2">
                              <button onClick={() => handleOpenDates(room._id)} className="px-2 py-1 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">Open</button>
                              <button onClick={() => handleCloseDates(room._id)} className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded">Close</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {pricingCalendarView === 'list' && (
                  <div className="border border-[#e0d5c7] rounded-xl overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-[#fdf7f0] text-[#4b2a00]">
                        <tr>
                          <th className="px-3 py-2 text-left w-48">Room</th>
                          {daysInMonth(activeMonth).filter(Boolean).map((d) => (
                            <th key={d.toISOString()} className="px-2 py-2 text-center whitespace-nowrap border-l border-[#e0d5c7]">
                              <div>{d.getDate()}</div>
                              <div className="text-[10px] text-gray-500">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {calendarData.map((room) => {
                          const days = daysInMonth(activeMonth).filter(Boolean);
                          // rates calendar returns roomId field; fall back to _id if present
                          const roomId = room.roomId || room._id;
                          // Prefer explicit unitCount from room data; fall back to capacity or 1
                          const totalUnits = (() => {
                            const uc = Number(room.unitCount);
                            if (!Number.isNaN(uc) && uc > 0) return uc;
                            const cap = Number(room.capacity || 1);
                            return cap > 0 ? cap : 1;
                          })();
                          const getBookedForDay = (d) => {
                            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
                            return listBookings.filter(b => {
                              if (String(b.property?._id || b.property) !== String(selectedProperty)) return false;
                              if (roomId && b.room && String(b.room) !== String(roomId)) return false;
                              const ci = new Date(b.checkIn);
                              const co = new Date(b.checkOut);
                              return ci < dayEnd && co > dayStart;
                            }).length;
                          };
                          return (
                          <React.Fragment key={room._id}>
                            <tr className="border-t border-[#f0e6d9] bg-[#fdf7f0]">
                              <td className="px-3 py-2 text-[11px] text-[#4b2a00] sticky left-0 z-10">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold">{room.roomType}</div>
                                    <div className="text-[10px] text-gray-500">Closed dates: {room.closedDates?.length || 0}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openBulkEdit(room)}
                                    className="ml-2 px-3 py-1 rounded-full bg-[#003580] text-white text-[11px] hover:bg-[#00265a] whitespace-nowrap"
                                  >
                                    Bulk edit
                                  </button>
                                </div>
                              </td>
                              {days.map((d) => {
                                const dateStr = fmt(d);
                                const closed = isClosed(room, dateStr);
                                const cls = closed ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-[#e9f7ec] border-[#b7dfc5] text-[#245430]';
                                return (
                                  <td
                                    key={d.toISOString()}
                                    className={`px-1 py-1 text-center border-l border-[#f0e6d9] ${cls}`}
                                  >
                                    <button
                                      type="button"
                                      disabled={!singleClickMode}
                                      onClick={() => singleClickMode && onDayClick(room, d)}
                                      className={`w-full h-full flex flex-col items-center justify-center ${singleClickMode ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                                      title={singleClickMode ? (closed ? 'Click to unlock date' : 'Click to lock date') : ''}
                                    >
                                      <span className="text-[10px] font-semibold">{closed ? 'Closed' : 'Open'}</span>
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr className="border-t border-[#f0e6d9]">
                              <td className="px-3 py-2 text-[11px] text-gray-600 sticky left-0 bg-white z-10">
                                <div className="font-semibold mb-1">Rooms to sell</div>
                                <div className="text-[10px] text-gray-500">Approximate units available per day</div>
                              </td>
                              {days.map((d) => {
                                const dateStr = fmt(d);
                                const closed = isClosed(room, dateStr);
                                const booked = getBookedForDay(d);
                                // Rooms to sell = total units minus net booked, but never below 0; if closed, force 0
                                const remaining = closed ? 0 : Math.max(0, totalUnits - booked);
                                return (
                                  <td key={d.toISOString()} className="px-1 py-1 text-center border-l border-[#f0e6d9]">
                                    <div className="text-[10px] text-gray-800 font-medium">{remaining}</div>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr className="border-t border-[#f0e6d9]">
                              <td className="px-3 py-2 text-[11px] text-gray-600 sticky left-0 bg-white z-10">
                                <div className="font-semibold mb-1">Net booked</div>
                                <div className="text-[10px] text-gray-500">Confirmed + in-house bookings</div>
                              </td>
                              {days.map((d) => {
                                const booked = getBookedForDay(d);
                                return (
                                  <td key={d.toISOString()} className="px-1 py-1 text-center border-l border-[#f0e6d9]">
                                    <div className="text-[10px] text-gray-800 font-medium">{booked}</div>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr className="border-t border-[#f0e6d9]">
                              <td className="px-3 py-2 text-[11px] text-gray-600 sticky left-0 bg-white z-10">
                                <div className="font-semibold mb-1">Standard rate</div>
                                <div className="text-[10px] text-gray-500">Base price per night</div>
                              </td>
                              {days.map((d) => (
                                <td key={d.toISOString()} className="px-1 py-1 text-center border-l border-[#f0e6d9]">
                                  <div className="text-[10px] text-[#4b2a00] font-medium">
                                    {formatCurrencyRWF ? formatCurrencyRWF(room.rate || 0) : `RWF ${(room.rate || 0).toLocaleString()}`}
                                  </div>
                                </td>
                              ))}
                            </tr>
                            <tr className="border-t border-[#f0e6d9]">
                              <td className="px-3 py-2 text-[11px] text-gray-600 sticky left-0 bg-white z-10">
                                <div className="font-semibold mb-1">Minimum length of stay</div>
                              </td>
                              {days.map((d) => (
                                <td key={d.toISOString()} className="px-1 py-1 text-center border-l border-[#f0e6d9]">
                                  <div className="text-[10px] text-gray-700">{room.minStay || 1} night(s)</div>
                                </td>
                              ))}
                            </tr>
                          </React.Fragment>
                          );
                        })}
                        {calendarData.length === 0 && (
                          <tr>
                            <td colSpan={daysInMonth(activeMonth).filter(Boolean).length + 1} className="px-4 py-8 text-center text-gray-500">
                              No rooms loaded for this property.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {pricingCalendarView === 'yearly' && (
                  (() => {
                    const year = activeMonth.getFullYear();
                    const months = Array.from({ length: 12 }, (_, i) => i);
                    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    const hasClosedOn = (d) => {
                      const dateStr = fmt(d);
                      return calendarData.some(room => isClosed(room, dateStr));
                    };
                    const buildMonthMatrix = (y, m) => {
                      const first = new Date(y, m, 1);
                      const last = new Date(y, m + 1, 0);
                      const offset = (first.getDay() + 6) % 7;
                      const days = [];
                      for (let i = 0; i < offset; i++) days.push(null);
                      for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
                      return days;
                    };
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[11px] text-gray-600">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveMonth(m => new Date(m.getFullYear() - 1, m.getMonth(), 1))}
                              className="px-2 py-1 text-xs rounded border border-[#e0d5c7] bg-white hover:bg-[#f5ede1]"
                            >
                              ◀ {year - 1}
                            </button>
                            <div className="px-3 py-1.5 rounded-full bg-[#f5ede1] text-[#4b2a00] text-sm font-semibold">{year}</div>
                            <button
                              type="button"
                              onClick={() => setActiveMonth(m => new Date(m.getFullYear() + 1, m.getMonth(), 1))}
                              className="px-2 py-1 text-xs rounded border border-[#e0d5c7] bg-white hover:bg-[#f5ede1]"
                            >
                              {year + 1} ▶
                            </button>
                          </div>
                          <div className="hidden sm:flex items-center gap-3">
                            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#e9f7ec] border border-[#b7dfc5]"></span> Open</span>
                            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#fdeeee] border border-[#f5b5b5]"></span> Closed</span>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          {months.map((m) => {
                            const cells = buildMonthMatrix(year, m);
                            return (
                              <div key={m} className="border border-[#e0d5c7] rounded-xl bg-white overflow-hidden">
                                <div className="px-3 py-2 bg-[#fdf7f0] text-[#4b2a00] text-sm font-semibold border-b border-[#e0d5c7] flex items-center justify-between">
                                  <span>{monthNames[m]}</span>
                                </div>
                                <div className="grid grid-cols-7 text-[10px] text-gray-500 px-2 pt-2">
                                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                                    <div key={d} className="text-center pb-1">{d}</div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-7 text-[10px] px-2 pb-2 gap-y-1">
                                  {cells.map((d, i) => {
                                    if (!d) return <div key={i} />;
                                    const closed = hasClosedOn(d);
                                    const baseClasses = 'h-6 flex items-center justify-center rounded-sm border text-[10px]';
                                    const cls = closed
                                      ? 'bg-[#fdeeee] border-[#f5b5b5] text-[#7a1f1f]'
                                      : 'bg-[#e9f7ec] border-[#b7dfc5] text-[#245430]';
                                    return (
                                      <div key={i} className={`${baseClasses} ${cls}`}>
                                        {d.getDate()}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {bulkEditOpen && bulkEditRoom && (
              <div className="fixed inset-0 z-[9999] flex justify-end">
                <div className="absolute inset-0 bg-black/40" onClick={closeBulkEdit} />
                <div className="relative w-full max-w-md h-full bg-white shadow-xl overflow-y-auto">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#4b2a00]">Bulk edit</h3>
                    <button onClick={closeBulkEdit} className="text-gray-500 hover:text-gray-800 text-sm">Close</button>
                  </div>
                  <div className="px-6 py-4 space-y-6 text-sm">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">From</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={bulkRange.start}
                            onChange={(e) => setBulkRange(r => ({ ...r, start: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">Up to and including</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={bulkRange.end}
                            onChange={(e) => setBulkRange(r => ({ ...r, end: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Which days of the week do you want to apply changes to?</p>
                        <div className="flex flex-wrap gap-2">
                          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                            <label key={d} className="inline-flex items-center gap-1 text-[11px]">
                              <input
                                type="checkbox"
                                checked={bulkWeekdays[d]}
                                onChange={(e) => setBulkWeekdays(prev => ({ ...prev, [d]: e.target.checked }))}
                              />
                              <span>{d}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#e0d5c7] rounded-lg">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#4b2a00] bg-[#fdf7f0] border-b border-[#e0d5c7]"
                      >
                        <span>Rooms to sell & availability</span>
                      </button>
                      <div className="px-4 py-3 space-y-3 text-sm">
                        <p className="text-[11px] text-gray-600">Open or close this room type for the selected dates.</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => applyBulkOpenClose('open')}
                            className="flex-1 px-3 py-2 rounded-full bg-[#e9f7ec] text-[#245430] text-xs font-medium border border-[#b7dfc5] hover:bg-[#d6f0de]"
                          >
                            Open selected dates
                          </button>
                          <button
                            type="button"
                            onClick={() => applyBulkOpenClose('close')}
                            className="flex-1 px-3 py-2 rounded-full bg-[#fdeeee] text-[#7a1f1f] text-xs font-medium border border-[#f5b5b5] hover:bg-[#f8d7d7]"
                          >
                            Close selected dates
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#e0d5c7] rounded-lg">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#4b2a00] bg-[#fdf7f0] border-b border-[#e0d5c7]"
                      >
                        <span>Prices</span>
                      </button>
                      <div className="px-4 py-3 space-y-3 text-sm">
                        <p className="text-[11px] text-gray-600">Set the base price per night for this room type.</p>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={bulkRate}
                            onChange={(e) => setBulkRate(e.target.value)}
                            placeholder="Enter rate in RWF"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!bulkEditRoom) return;
                              const rate = Number(bulkRate);
                              if (!rate || rate <= 0) { toast.error('Enter a valid rate'); return; }
                              try {
                                const res = await fetch(`${API_URL}/api/rates/bulk/set-rate`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({
                                    rate,
                                    rooms: [{ propertyId: selectedProperty, roomId: bulkEditRoom._id }]
                                  })
                                });
                                if (!res.ok) throw new Error('Failed to set rate');
                                toast.success('Rate updated');
                                fetchCalendar();
                              } catch (e) {
                                toast.error(e.message || 'Failed to set rate');
                              }
                            }}
                            className="px-3 py-2 rounded-full bg-[#a06b42] text-white text-xs font-medium hover:bg-[#8f5a32]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#e0d5c7] rounded-lg">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#4b2a00] bg-[#fdf7f0] border-b border-[#e0d5c7]"
                      >
                        <span>Restrictions</span>
                      </button>
                      <div className="px-4 py-3 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">Minimum stay (nights)</label>
                            <input
                              type="number"
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              value={bulkMinStay}
                              onChange={(e) => setBulkMinStay(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">Maximum stay (nights)</label>
                            <input
                              type="number"
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              value={bulkMaxStay}
                              onChange={(e) => setBulkMaxStay(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={applyBulkRestrictions}
                            className="flex-1 px-3 py-2 rounded-full bg-[#a06b42] text-white text-xs font-medium hover:bg-[#8f5a32]"
                          >
                            Save restrictions
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBulkMinStay(''); setBulkMaxStay(''); }}
                            className="flex-1 px-3 py-2 rounded-full border border-gray-300 text-xs font-medium hover:bg-gray-50"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
        // State moved to top level - using mobileDiscount from component state
        return (
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaMobileAlt className="text-[#a06b42]" /> Mobile rates
            </h2>
            <p className="text-sm text-[#6b5744] mb-5">Offer a special discount for guests booking via mobile devices to boost conversions.</p>
            <div className="max-w-md p-4 rounded-2xl border border-[#e0d5c7] bg-[#fdf7f0]">
              <label className="block text-xs font-semibold text-[#6b5744] mb-2 uppercase tracking-wide">Mobile discount (%)</label>
              <input
                type="number"
                min="0"
                max="90"
                value={mobileDiscount}
                onChange={(e)=> setMobileDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#e0d5c7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] bg-white"
              />
              <button
                onClick={()=> handleSaveMobileRates(mobileDiscount)}
                className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm transition-colors"
              >
                Save mobile rates
              </button>
            </div>
          </div>
        );

      case 'open-close':
        // State moved to top level - using selectedRoomForCalendar and activeMonth from component state
        
        // Generate calendar days for the current month
        const generateCalendarDays = () => {
          const year = activeMonth.getFullYear();
          const month = activeMonth.getMonth();
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
          setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1));
        };
        
        const goToNextMonth = () => {
          setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1));
        };
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        return (
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaDoorOpen className="text-[#a06b42]" /> Open/close rooms
            </h2>
            <p className="text-sm text-[#6b5744] mb-6">Manage room availability by opening or closing specific dates across your property.</p>
            
            {!propertyData?.rooms || propertyData.rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No rooms available. Please add rooms to your property first.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Date Range Selection for Bulk Operations */}
                <div className="bg-[#f5f0e8] border border-[#e0d5c7] rounded-2xl p-4">
                  <h3 className="font-semibold text-[#4b2a00] mb-1 text-sm md:text-base flex items-center gap-2">
                    <span>📅 Bulk date management</span>
                  </h3>
                  <p className="text-xs md:text-sm text-[#6b5744] mb-3">Select date ranges to open or close multiple dates at once.</p>
                  
                  {propertyData.rooms.map((room, idx) => (
                    <div key={idx} className="bg-white border border-[#e0d5c7] rounded-xl p-4 mb-3">
                      <h4 className="font-semibold mb-2 text-[#4b2a00] text-sm md:text-base">{room.roomType} - {room.roomNumber}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[11px] text-[#6b5744] block mb-1 uppercase tracking-wide">Start date</label>
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
                          <label className="text-[11px] text-[#6b5744] block mb-1 uppercase tracking-wide">End date</label>
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
                          className="flex-1 px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded-full text-xs md:text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <FaDoorOpen /> Open Dates
                        </button>
                        <button 
                          onClick={() => handleCloseDates(room._id)}
                          className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs md:text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <FaCalendarTimes /> Close Dates
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-[#6b5744]">
                          Currently closed dates: <span className="font-semibold text-rose-700">{room.closedDates?.length || 0}</span>
                        </span>
                        <button 
                          onClick={() => setSelectedRoomForCalendar(selectedRoomForCalendar === room._id ? null : room._id)}
                          className="text-[#a06b42] hover:text-[#8f5a32] font-medium"
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
                              className="px-3 py-1 bg-[#f5f0e8] hover:bg-[#e8dcc8] rounded-full text-xs md:text-sm"
                            >
                              ← Prev
                            </button>
                            <h4 className="font-semibold text-gray-800">
                              {monthNames[activeMonth.getMonth()]} {activeMonth.getFullYear()}
                            </h4>
                            <button 
                              onClick={goToNextMonth}
                              className="px-3 py-1 bg-[#f5f0e8] hover:bg-[#e8dcc8] rounded-full text-xs md:text-sm"
                            >
                              Next →
                            </button>
                          </div>
                          
                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {/* Day headers */}
                            {dayNames.map(day => (
                              <div key={day} className="text-center text-[11px] font-semibold text-[#6b5744] py-2">
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
                          <div className="mt-4 flex items-center gap-4 text-xs text-[#6b5744]">
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
        // State moved to top level - using sourceYear and targetYear from component state
        
        return (
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaCopy className="text-[#a06b42]" /> Copy yearly rates
            </h2>
            <p className="text-sm text-[#6b5744] mb-5">Duplicate your existing rate setup from one year to another to save time.</p>
            <div className="rounded-2xl border border-[#e0d5c7] bg-[#fdf7f0] p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6b5744] mb-1 uppercase tracking-wide">Source year</label>
                  <select 
                    value={sourceYear}
                    onChange={(e) => setSourceYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#e0d5c7] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42]"
                  >
                    {[2024, 2025, 2026, 2027].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6b5744] mb-1 uppercase tracking-wide">Target year</label>
                  <select 
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#e0d5c7] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42]"
                  >
                    {[2025, 2026, 2027, 2028].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                onClick={() => handleCopyYearlyRates(sourceYear, targetYear)}
                className="w-full px-4 py-2 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-semibold shadow-sm transition-colors"
              >
                Copy rates from {sourceYear} to {targetYear}
              </button>
              <p className="text-xs text-[#8a745e] mt-3">
                This will copy all rate settings, seasonal pricing, and restrictions from {sourceYear} to {targetYear}.
              </p>
            </div>
          </div>
        );

      case 'restrictions':
        return (
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaRuler className="text-[#a06b42]" /> Dynamic restriction rules
            </h2>
            <p className="text-sm text-[#6b5744] mb-4">Set minimum and maximum stay requirements per room type.</p>
            {propertyData?.rooms?.map((room, idx) => (
                <div key={idx} className="border border-[#e0d5c7] rounded-xl p-4 mb-3 bg-[#fdf7f0]">
                  <h3 className="font-semibold mb-3 text-[#4b2a00] text-sm md:text-base">{room.roomType} - {room.roomNumber}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-[#6b5744] block mb-1 uppercase tracking-wide">Min stay (nights)</label>
                      <input 
                        type="number" 
                        defaultValue={room.minStay || 1}
                        id={`minStay-${room._id}`}
                        className="w-full px-2 py-1 border border-[#e0d5c7] rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42]" 
                        min="1" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#6b5744] block mb-1 uppercase tracking-wide">Max stay (nights)</label>
                      <input 
                        type="number" 
                        defaultValue={room.maxStay || 30}
                        id={`maxStay-${room._id}`}
                        className="w-full px-2 py-1 border border-[#e0d5c7] rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42]" 
                        min="1" 
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={() => {
                          const minStay = Number(document.getElementById(`minStay-${room._id}`).value);
                          const maxStay = Number(document.getElementById(`maxStay-${room._id}`).value);
                          handleUpdateRestrictions(room._id, minStay, maxStay);
                        }}
                        className="w-full px-3 py-1 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs md:text-sm font-medium shadow-sm transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        );

      case 'rate-plans':
        return (
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#4b2a00]">
              <FaMoneyBillWave className="text-[#a06b42]" /> Rate plans
            </h2>
            {loading ? (
              <div className="text-center py-8 text-sm text-[#6b5744]">Loading rate plans...</div>
            ) : (
              <div className="space-y-4">
                {ratePlans.map((plan, idx) => (
                  <div key={idx} className="border border-[#e0d5c7] rounded-2xl p-5 bg-[#fdf7f0]">
                    <h3 className="font-semibold text-[#4b2a00] text-sm md:text-base">{plan.name}</h3>
                    <p className="text-sm text-[#6b5744] mt-1">{plan.description}</p>
                    <p className="text-lg font-bold text-[#4b2a00] mt-3">RWF {plan.baseRate?.toLocaleString()}/night</p>
                    <div className="mt-3 space-y-2">
                      {plan.rooms?.map((room, ridx) => (
                        <div key={ridx} className="text-sm flex justify-between text-[#6b5744]">
                          <span>{room.roomType}</span>
                          <span className="font-semibold text-[#4b2a00]">RWF {room.rate?.toLocaleString()}</span>
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
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaGift className="text-[#a06b42]" /> Value adds
            </h2>
            <p className="text-sm text-[#6b5744] mb-5">
              Configure which additional services are available for this property. Prices are negotiable and handled outside the system.
            </p>
            <div className="space-y-3 mt-4">
              {(addOnCatalog.length ? addOnCatalog : [
                { key: 'standard_breakfast', name: 'Standard breakfast', description: 'Basic breakfast with local options', defaultPrice: 5000, defaultScope: 'per-booking' },
                { key: 'premium_breakfast', name: 'Premium breakfast', description: 'Extended breakfast with hot dishes', defaultPrice: 8000, defaultScope: 'per-booking' },
                { key: 'airport_transfer', name: 'Airport transfer', description: 'One-way airport pick-up or drop-off', defaultPrice: 15000, defaultScope: 'per-booking' },
                { key: 'late_checkout', name: 'Late checkout', description: 'Stay in the room beyond normal checkout time', defaultPrice: 10000, defaultScope: 'per-booking' },
                { key: 'daily_cleaning', name: 'Daily cleaning', description: 'Daily housekeeping beyond the standard', defaultPrice: 7000, defaultScope: 'per-night' }
              ]).map((opt) => {
                const existing = addOnServicesDraft.find(s => s.key === opt.key) || {};
                const enabled = existing.enabled ?? false;
                const price = existing.price != null ? existing.price : (opt.defaultPrice || 0);
                const scope = existing.scope || opt.defaultScope || 'per-booking';
                const selectedItems = existing.includedItems || {};
                return (
                  <div key={opt.key} className="border border-[#e0d5c7] rounded-2xl p-4 bg-[#fdf7f0]">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#4b2a00] text-sm md:text-base">{opt.name}</div>
                        {opt.description && (
                          <p className="text-sm text-[#6b5744]">{opt.description}</p>
                        )}
                        <p className="text-[11px] text-[#8a745e] mt-1">
                          Turn services on or off and specify which items are actually offered at this property.
                        </p>
                      </div>
                      <label className="flex items-center ml-0 sm:ml-4">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={enabled}
                          onChange={(e) => {
                            const next = addOnServicesDraft.filter(s => s.key !== opt.key);
                            next.push({
                              key: opt.key,
                              name: opt.name,
                              enabled: e.target.checked,
                              price,
                              scope,
                              includedItems: selectedItems
                            });
                            setAddOnServicesDraft(next);
                          }}
                        />
                        <span className="text-sm">Enable</span>
                      </label>
                    </div>
                    {/* Pricing and charge type fields intentionally hidden: add-ons are negotiable and do not show fixed values here. */}
                    {Array.isArray(opt.includedItems) && opt.includedItems.length > 0 && (
                      <div className="mt-3 border-t border-[#e0d5c7] pt-2">
                        <div className="text-[11px] text-[#6b5744] font-semibold mb-1 uppercase tracking-wide">
                          Included items (select what this property offers)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                          {opt.includedItems.map((item) => {
                            const checked = selectedItems[item.key] ?? item.defaultIncluded ?? false;
                            return (
                              <label key={item.key} className="inline-flex items-center gap-2 text-[#4b2a00]">
                                <input
                                  type="checkbox"
                                  className="h-3 w-3"
                                  checked={checked}
                                  onChange={(e) => {
                                    const nextIncluded = { ...selectedItems, [item.key]: e.target.checked };
                                    const next = addOnServicesDraft.filter(s => s.key !== opt.key);
                                    next.push({
                                      key: opt.key,
                                      name: opt.name,
                                      enabled,
                                      price,
                                      scope,
                                      includedItems: nextIncluded
                                    });
                                    setAddOnServicesDraft(next);
                                  }}
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleSaveAddOnServices(addOnServicesDraft)}
                className="px-4 py-2 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-semibold shadow-sm transition-colors"
              >
                Save add-on services
              </button>
            </div>
          </div>
        );

      case 'availability-planner':
        // State moved to top level - using seasonal rate states from component state
        
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
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaChartLine className="text-[#a06b42]" /> Availability planner
            </h2>
            <p className="text-sm text-[#6b5744] mb-6">Plan your availability strategy for peak and off-peak seasons.</p>
            
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-6">
                {/* Peak Season */}
                <div className="border border-[#e0d5c7] rounded-2xl p-4 bg-[#fdf7f0]">
                  <h3 className="font-semibold text-sm md:text-base mb-3 text-[#4b2a00] flex items-center gap-2">
                    <span>🔥 Peak season strategy</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-[#6b5744]">Start date</label>
                      <input 
                        type="date" 
                        value={peakSeasonStart}
                        onChange={(e) => setPeakSeasonStart(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6b5744]">End date</label>
                      <input 
                        type="date" 
                        value={peakSeasonEnd}
                        onChange={(e) => setPeakSeasonEnd(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6b5744]">Rate increase (%)</label>
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
                    className="w-full px-3 py-2 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm transition-colors"
                  >
                    Add peak season period
                  </button>
                </div>

                {/* Off Season */}
                <div className="border border-[#e0d5c7] rounded-2xl p-4 bg-[#fdf7f0]">
                  <h3 className="font-semibold text-sm md:text-base mb-3 text-[#4b2a00] flex items-center gap-2">
                    <span>❄️ Off-season strategy</span>
                  </h3>
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
                      <label className="text-xs text-[#6b5744]">Discount (%)</label>
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
                    className="w-full px-3 py-2 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm transition-colors"
                  >
                    Add off-season period
                  </button>
                </div>

                {/* Occupancy Target */}
                <div className="border border-[#e0d5c7] rounded-2xl p-4 bg-white">
                  <h3 className="font-semibold mb-3 text-sm md:text-base text-[#4b2a00]">🎯 Occupancy target</h3>
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-[#6b5744]">Minimum occupancy goal:</label>
                    <input 
                      type="number" 
                      value={minOccupancy}
                      onChange={(e) => setMinOccupancy(Number(e.target.value))}
                      className="px-3 py-2 border border-[#e0d5c7] rounded w-24 text-sm focus:outline-none focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42]" 
                      min="0"
                      max="100"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                  <p className="text-xs text-[#8a745e] mt-2">
                    System will suggest rate adjustments to maintain this occupancy level.
                  </p>
                </div>

                {/* Active Seasonal Rates */}
                <div className="border-t border-[#e0d5c7] pt-4">
                  <h3 className="font-semibold mb-3 text-sm md:text-base text-[#4b2a00]">📅 Active seasonal periods</h3>
                  <div className="space-y-2">
                    {localSeasonalRates.map((rate, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-[#f5f0e8] border border-[#e0d5c7]">
                        <div>
                          <span className="font-medium text-[#4b2a00]">
                            {rate.type === 'peak' ? '🔥 Peak' : '❄️ Off'} Season
                          </span>
                          <span className="text-sm text-[#6b5744] ml-3">
                            {rate.startDate} to {rate.endDate}
                          </span>
                          <span className="text-sm font-semibold ml-3 text-[#4b2a00]">
                            {rate.adjustment > 0 ? '+' : ''}{rate.adjustment}%
                          </span>
                        </div>
                        <button 
                          onClick={() => removeSeasonalRate(idx)}
                          className="text-rose-700 text-sm hover:text-rose-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {localSeasonalRates.length === 0 && (
                      <p className="text-sm text-[#8a745e] text-center py-4">No seasonal periods configured.</p>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <button 
                  onClick={saveStrategy}
                  className="w-full px-4 py-3 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white font-semibold shadow-sm transition-colors"
                >
                  Save availability strategy
                </button>
              </div>
            )}
          </div>
        );

      case 'pricing-per-guest':
        return (
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaUsers className="text-[#a06b42]" /> Pricing per guest
            </h2>
            <p className="text-sm text-[#6b5744] mb-4">Set additional charges for extra guests and define the maximum guests allowed per room.</p>
            {propertyData?.rooms?.map((room, idx) => (
                <div key={idx} className="border border-[#e0d5c7] rounded-2xl p-4 mb-3 bg-[#fdf7f0]">
                  <h3 className="font-semibold mb-1 text-[#4b2a00] text-sm md:text-base">{room.roomType} - {room.roomNumber}</h3>
                  <div className="text-xs text-[#6b5744] mb-3">
                    Base price per night: <span className="font-medium">{formatCurrencyRWF ? formatCurrencyRWF(room.pricePerNight || 0) : `RWF ${(room.pricePerNight || 0).toLocaleString()}`}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <label className="text-xs text-[#6b5744]">Base capacity</label>
                      <input 
                        type="number" 
                        value={room.capacity || 2} 
                        readOnly 
                        className="w-full px-2 py-1 border rounded text-sm bg-gray-50" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6b5744]">Max guests</label>
                      <input 
                        type="number" 
                        id={`maxGuests-${room._id}`}
                        defaultValue={room.maxGuests ?? ''}
                        min={room.capacity || 1}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#6b5744]">Extra guest fee (RWF)</label>
                      <input 
                        type="number" 
                        defaultValue={room.additionalGuestCharge || room.extraGuestFee || 5000}
                        id={`extraFee-${room._id}`}
                        className="w-full px-2 py-1 border rounded text-sm" 
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={() => {
                          const extraFeeEl = document.getElementById(`extraFee-${room._id}`);
                          const maxGuestsEl = document.getElementById(`maxGuests-${room._id}`);
                          const extraFee = Number(extraFeeEl?.value || 0);
                          const maxGuestsVal = maxGuestsEl?.value !== '' ? Number(maxGuestsEl.value) : null;
                          handleUpdatePricingPerGuest(room._id, extraFee, maxGuestsVal);
                        }}
                        className="w-full px-3 py-1 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs md:text-sm font-medium shadow-sm transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#8a745e] mt-2">
                    Guests beyond {room.capacity || 2} will be charged the extra guest fee per night up to the maximum guests you set.
                  </p>
                </div>
              ))}
          </div>
        );

      case 'country-rates':
        // State moved to top level - using country rate states from component state
        
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
          <div className="bg-white rounded-2xl border border-[#e0d5c7] shadow-sm p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#4b2a00]">
              <FaGlobe className="text-[#a06b42]" /> Country rates
            </h2>
            <p className="text-sm text-[#6b5744] mb-4">Set different rates for guests from specific countries or regions.</p>
            <div className="space-y-3">
              <div className="border border-[#e0d5c7] rounded-2xl p-4 bg-[#fdf7f0]">
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
