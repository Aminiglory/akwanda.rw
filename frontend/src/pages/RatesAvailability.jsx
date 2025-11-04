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
      }
    }
  }, [selectedProperty, view]);

  const fetchPropertyDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setPropertyData(data);
      }
    } catch (e) {
      console.error('Failed to load property details:', e);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setProperties(data.properties || []);
        if (data.properties?.length > 0) {
          setSelectedProperty(data.properties[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/rates/calendar/${selectedProperty}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setCalendarData(data.calendar || []);
      }
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
      const data = await res.json();
      if (res.ok) {
        setRatePlans(data.plans || []);
      }
    } catch (e) {
      toast.error('Failed to load rate plans');
    } finally {
      setLoading(false);
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
                    <input type="date" className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">End Date</label>
                    <input type="date" className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 bg-green-600 text-white rounded text-sm">Open Dates</button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded text-sm">Close Dates</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Closed dates: {room.closedDates?.length || 0}</p>
              </div>
            ))}
          </div>
        );

      case 'copy-yearly':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaCopy /> Copy Yearly Rates
            </h2>
            <p className="text-gray-600">Copy rates from one year to another to save time.</p>
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm">Feature coming soon - Copy rates between years</p>
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
            {propertyData?.rooms?.map((room, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-3">
                <h3 className="font-semibold mb-3">{room.roomType} - {room.roomNumber}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Min Stay (nights)</label>
                    <input type="number" defaultValue={room.minStay || 1} className="w-full px-2 py-1 border rounded text-sm" min="1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Max Stay (nights)</label>
                    <input type="number" defaultValue={room.maxStay || 30} className="w-full px-2 py-1 border rounded text-sm" min="1" />
                  </div>
                  <div className="flex items-end">
                    <button className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm">Update</button>
                  </div>
                </div>
              </div>
            ))}
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
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaChartLine /> Availability Planner
            </h2>
            <p className="text-gray-600">Plan your availability strategy for peak and off-peak seasons.</p>
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm">Feature coming soon - Strategic availability planning</p>
            </div>
          </div>
        );

      case 'pricing-per-guest':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaUsers /> Pricing Per Guest
            </h2>
            <p className="text-gray-600 mb-4">Set additional charges for extra guests beyond base capacity.</p>
            {propertyData?.rooms?.map((room, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-3">
                <h3 className="font-semibold mb-3">{room.roomType} - {room.roomNumber}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Base Capacity</label>
                    <input type="number" value={room.capacity || 2} readOnly className="w-full px-2 py-1 border rounded text-sm bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Extra Guest Fee (RWF)</label>
                    <input type="number" defaultValue={room.extraGuestFee || 5000} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex items-end">
                    <button className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm">Save</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'country-rates':
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
                    <select className="w-full px-2 py-1 border rounded text-sm">
                      <option>Rwanda</option>
                      <option>East Africa</option>
                      <option>Europe</option>
                      <option>North America</option>
                      <option>Asia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Discount/Markup (%)</label>
                    <input type="number" placeholder="-10 or +20" className="w-full px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex items-end">
                    <button className="w-full px-3 py-1 bg-green-600 text-white rounded text-sm">Add Rule</button>
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <h3 className="font-semibold mb-2 text-sm">Active Country Rules</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Rwanda residents: -15%</span>
                    <button className="text-red-600 text-xs">Remove</button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">East Africa: -10%</span>
                    <button className="text-red-600 text-xs">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mobile-rates':
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
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Enable</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Discount Type</label>
                  <select className="w-full px-3 py-2 border rounded mt-1">
                    <option>Percentage</option>
                    <option>Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Discount Value</label>
                  <input type="number" defaultValue={5} className="w-full px-3 py-2 border rounded mt-1" />
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">💡 Current mobile discount: <strong>5% off</strong> all bookings made via mobile app</p>
              </div>
              <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded">Save Mobile Rate Settings</button>
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
