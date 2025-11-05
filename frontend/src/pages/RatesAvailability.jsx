import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaCalendar, FaDoorOpen, FaCopy, FaRuler, FaMoneyBillWave, FaGift, FaChartLine, FaUsers, FaGlobe, FaMobileAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RatesAvailability() {
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
      setPropertyData(data);
    } catch (e) {
      console.error('Failed to load property details:', e);
    }
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
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaCalendar /> Availability Calendar
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-4">
                {calendarData.map((room, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h3 className="font-semibold">{room.roomType}</h3>
                    <p className="text-sm text-gray-600">Rate: RWF {room.rate?.toLocaleString()}/night</p>
                    <p className="text-sm text-gray-600">Min Stay: {room.minStay} nights | Max Stay: {room.maxStay} nights</p>
                    <p className="text-sm text-gray-600">Closed Dates: {room.closedDates?.length || 0}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'open-close':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaDoorOpen /> Open/Close Rooms
            </h2>
            <p className="text-gray-600 mb-4">Manage room availability by opening or closing specific dates.</p>
            {propertyData?.rooms?.map((room, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-3">
                <h3 className="font-semibold mb-2">{room.roomType} - {room.roomNumber}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Start Date</label>
                    <input 
                      type="date" 
                      className="w-full px-2 py-1 border rounded text-sm"
                      onChange={(e) => setDateRanges(prev => ({
                        ...prev,
                        [room._id]: { ...prev[room._id], startDate: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">End Date</label>
                    <input 
                      type="date" 
                      className="w-full px-2 py-1 border rounded text-sm"
                      onChange={(e) => setDateRanges(prev => ({
                        ...prev,
                        [room._id]: { ...prev[room._id], endDate: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={() => handleOpenDates(room._id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Open Dates
                  </button>
                  <button 
                    onClick={() => handleCloseDates(room._id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Close Dates
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Closed dates: {room.closedDates?.length || 0}</p>
              </div>
            ))}
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

      case 'mobile-rates':
        const [mobileEnabled, setMobileEnabled] = React.useState(true);
        const [discountType, setDiscountType] = React.useState('Percentage');
        const [discountValue, setDiscountValue] = React.useState(5);
        
        const saveMobileSettings = () => {
          if (!mobileEnabled) {
            handleSaveMobileRates(0);
          } else {
            handleSaveMobileRates(discountValue);
          }
        };
        
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaMobileAlt /> Mobile Rates
            </h2>
            <p className="text-gray-600 mb-4">Offer special discounts for bookings made through mobile app.</p>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Mobile App Discount</h3>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={mobileEnabled}
                    onChange={(e) => setMobileEnabled(e.target.checked)}
                    className="mr-2" 
                  />
                  <span className="text-sm">Enable</span>
                </label>
              </div>
              {mobileEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Discount Type</label>
                      <select 
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className="w-full px-3 py-2 border rounded mt-1"
                      >
                        <option>Percentage</option>
                        <option>Fixed Amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Discount Value {discountType === 'Percentage' ? '(%)' : '(RWF)'}
                      </label>
                      <input 
                        type="number" 
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded mt-1" 
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">
                      💡 Current mobile discount: <strong>
                        {discountType === 'Percentage' 
                          ? `${discountValue}% off` 
                          : `RWF ${discountValue.toLocaleString()} off`}
                      </strong> all bookings made via mobile app
                    </p>
                  </div>
                </>
              )}
              {!mobileEnabled && (
                <div className="p-3 bg-gray-50 rounded text-center">
                  <p className="text-sm text-gray-600">Mobile discount is currently disabled</p>
                </div>
              )}
              <button 
                onClick={saveMobileSettings}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Mobile Rate Settings
              </button>
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
