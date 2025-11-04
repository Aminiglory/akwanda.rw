import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaRocket, FaStar, FaDollarSign, FaCalendarAlt, FaChartLine, FaBriefcase, FaLightbulb } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function BoostPerformance() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'opportunity';
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState([]);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchOpportunities();
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setProperties(data.properties || []);
        if (data.properties && data.properties.length > 0) {
          setSelectedProperty(data.properties[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const property = data.property;
        const opps = [];

        // Check for opportunities
        if (!property.images || property.images.length < 10) {
          opps.push({
            id: 1,
            title: 'Add More Photos',
            description: 'Properties with 10+ photos get 45% more bookings',
            impact: 'High',
            action: 'Add Photos',
            icon: FaLightbulb
          });
        }

        if (!property.description || property.description.length < 100) {
          opps.push({
            id: 2,
            title: 'Improve Description',
            description: 'Detailed descriptions increase conversion by 30%',
            impact: 'Medium',
            action: 'Edit Description',
            icon: FaLightbulb
          });
        }

        if (!property.amenities || property.amenities.length < 5) {
          opps.push({
            id: 3,
            title: 'Add More Amenities',
            description: 'List all amenities to attract more guests',
            impact: 'Medium',
            action: 'Add Amenities',
            icon: FaLightbulb
          });
        }

        if (property.pricePerNight > 100000) {
          opps.push({
            id: 4,
            title: 'Consider Price Adjustment',
            description: 'Your price is above market average',
            impact: 'High',
            action: 'Review Pricing',
            icon: FaDollarSign
          });
        }

        setOpportunities(opps);
      }
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOpportunity = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Opportunity Centre</h2>
        <p>Discover ways to improve your property performance</p>
      </div>

      {opportunities.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <FaStar className="text-6xl text-yellow-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Great Job!</h3>
          <p className="text-gray-600">Your property is fully optimized. No opportunities at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {opportunities.map((opp) => {
            const Icon = opp.icon;
            return (
              <div key={opp.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Icon className="text-2xl text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{opp.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        opp.impact === 'High' ? 'bg-red-100 text-red-800' :
                        opp.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {opp.impact} Impact
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{opp.description}</p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      {opp.action}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderCommissionFree = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-2xl font-bold mb-6">Commission-Free Bookings</h3>
      <div className="space-y-6">
        <div className="p-6 bg-green-50 rounded-lg border border-green-200">
          <h4 className="text-lg font-semibold text-green-900 mb-2">Share Your Direct Booking Link</h4>
          <p className="text-gray-700 mb-4">Get 0% commission on bookings made through your direct link</p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={`https://akwanda.rw/property/${selectedProperty}`}
              readOnly
              className="flex-1 px-4 py-2 border rounded-lg bg-white"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://akwanda.rw/property/${selectedProperty}`);
                toast.success('Link copied!');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Copy Link
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <p className="text-3xl font-bold text-green-600">0%</p>
            <p className="text-sm text-gray-600">Commission</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-3xl font-bold text-blue-600">100%</p>
            <p className="text-sm text-gray-600">Your Earnings</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-3xl font-bold text-purple-600">∞</p>
            <p className="text-sm text-gray-600">Potential</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGenius = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center space-x-3 mb-6">
        <FaStar className="text-3xl text-yellow-400" />
        <h3 className="text-2xl font-bold">Genius Partner Programme</h3>
      </div>
      <div className="space-y-6">
        <p className="text-gray-700">Offer exclusive discounts to Genius members and increase your visibility</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold mb-2">Benefits</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Higher search ranking</li>
              <li>• More bookings</li>
              <li>• Genius badge</li>
              <li>• Increased visibility</li>
            </ul>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Requirements</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• 10% discount for Genius</li>
              <li>• Maintain 4+ rating</li>
              <li>• Quick response time</li>
              <li>• Complete profile</li>
            </ul>
          </div>
        </div>
        <button className="w-full px-4 py-3 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500">
          Join Genius Programme
        </button>
      </div>
    </div>
  );

  const renderLongStays = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-2xl font-bold mb-6">Long Stays Toolkit</h3>
      <div className="space-y-6">
        <p className="text-gray-700">Attract guests looking for extended stays with special discounts</p>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">7+ nights discount</span>
              <input type="number" placeholder="%" className="w-20 px-3 py-1 border rounded" />
            </div>
            <p className="text-sm text-gray-600">Recommended: 10-15%</p>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">30+ nights discount</span>
              <input type="number" placeholder="%" className="w-20 px-3 py-1 border rounded" />
            </div>
            <p className="text-sm text-gray-600">Recommended: 20-30%</p>
          </div>
        </div>
        <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Save Long Stay Discounts
        </button>
      </div>
    </div>
  );

  const renderPreferred = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center space-x-3 mb-6">
        <FaStar className="text-3xl text-blue-600" />
        <h3 className="text-2xl font-bold">Preferred Partner Programme</h3>
      </div>
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-gray-700 mb-4">
            Join our elite Preferred Partner Programme and unlock exclusive benefits, priority support, and enhanced visibility.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ Priority customer support</li>
            <li>✓ Featured placement in search results</li>
            <li>✓ Exclusive marketing opportunities</li>
            <li>✓ Advanced analytics and insights</li>
            <li>✓ Dedicated account manager</li>
          </ul>
        </div>
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Eligibility Requirements:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Minimum 4.5 star rating</li>
            <li>• At least 50 completed bookings</li>
            <li>• Less than 5% cancellation rate</li>
            <li>• Active for at least 6 months</li>
          </ul>
        </div>
        <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
          Apply for Preferred Partner Status
        </button>
      </div>
    </div>
  );

  const renderWorkFriendly = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center space-x-3 mb-6">
        <FaBriefcase className="text-3xl text-purple-600" />
        <h3 className="text-2xl font-bold">Work-Friendly Programme</h3>
      </div>
      <div className="space-y-6">
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-gray-700 mb-4">
            Attract remote workers and digital nomads by highlighting your work-friendly amenities and features.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ High-speed WiFi certification</li>
            <li>✓ Dedicated workspace areas</li>
            <li>✓ Business center access</li>
            <li>✓ Extended stay discounts</li>
            <li>✓ Flexible check-in/out times</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <p className="text-sm text-gray-600">WiFi Speed</p>
            <p className="text-2xl font-bold text-purple-600">100+ Mbps</p>
          </div>
          <div className="p-4 border rounded">
            <p className="text-sm text-gray-600">Workspace Rating</p>
            <p className="text-2xl font-bold text-purple-600">4.8/5</p>
          </div>
        </div>
        <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
          Enable Work-Friendly Badge
        </button>
      </div>
    </div>
  );

  const renderUnitDiff = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center space-x-3 mb-6">
        <FaLightbulb className="text-3xl text-orange-500" />
        <h3 className="text-2xl font-bold">Unit Differentiation Tool</h3>
      </div>
      <div className="space-y-6">
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-gray-700 mb-4">
            Highlight unique features of each room or unit to help guests make informed decisions and increase bookings.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { name: 'Ocean View Suite', unique: 'Panoramic sea views, Private balcony', bookings: 45 },
            { name: 'Garden Room', unique: 'Ground floor access, Pet-friendly', bookings: 32 },
            { name: 'Executive Suite', unique: 'King bed, Workspace, Premium amenities', bookings: 38 }
          ].map((unit, idx) => (
            <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{unit.name}</h4>
                <span className="text-sm text-gray-500">{unit.bookings} bookings</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Unique Features: {unit.unique}</p>
              <button className="text-sm text-blue-600 hover:text-blue-700">Edit Differentiation</button>
            </div>
          ))}
        </div>
        <button className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold">
          Add New Unit Features
        </button>
      </div>
    </div>
  );

  const renderVisibility = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-2xl font-bold mb-6">Visibility Booster</h3>
      <div className="space-y-6">
        <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">
          <h4 className="text-xl font-bold mb-2">Premium Placement</h4>
          <p className="mb-4">Appear at the top of search results for 30 days</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">RWF 50,000/month</span>
            <button className="px-6 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100">
              Upgrade Now
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <p className="text-3xl font-bold text-purple-600">3x</p>
            <p className="text-sm text-gray-600">More Views</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-3xl font-bold text-blue-600">2x</p>
            <p className="text-sm text-gray-600">More Bookings</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-3xl font-bold text-green-600">Top</p>
            <p className="text-sm text-gray-600">Position</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Boost Performance</h1>
          <p className="text-gray-600">Maximize your property's potential with these tools</p>
        </div>

        {/* Property Selector */}
        {properties.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Property</label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border rounded-lg"
            >
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* View Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'opportunity', label: 'Opportunity Centre' },
              { key: 'commission-free', label: 'Commission-Free' },
              { key: 'genius', label: 'Genius Programme' },
              { key: 'preferred', label: 'Preferred Partner' },
              { key: 'long-stays', label: 'Long Stays' },
              { key: 'visibility', label: 'Visibility Booster' },
              { key: 'work-friendly', label: 'Work-Friendly' },
              { key: 'unit-diff', label: 'Unit Differentiation' }
            ].map((tab) => (
              <a
                key={tab.key}
                href={`?view=${tab.key}`}
                className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  view === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {view === 'opportunity' && renderOpportunity()}
            {view === 'commission-free' && renderCommissionFree()}
            {view === 'genius' && renderGenius()}
            {view === 'preferred' && renderPreferred()}
            {view === 'long-stays' && renderLongStays()}
            {view === 'visibility' && renderVisibility()}
            {view === 'work-friendly' && renderWorkFriendly()}
            {view === 'unit-diff' && renderUnitDiff()}
          </>
        )}
      </div>
    </div>
  );
}
