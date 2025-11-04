import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaChartLine, FaUsers, FaCalendarAlt, FaStar, FaMapMarkerAlt, FaTrophy } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AnalyticsDashboard() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'dashboard';
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    totalViews: 0,
    totalBookings: 0,
    conversionRate: 0,
    averageRating: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    viewsData: [],
    bookingsData: [],
    revenueData: []
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchAnalyticsData();
    }
  }, [selectedProperty, view]);

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

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}/stats`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setAnalyticsData({
          totalViews: data.views || 0,
          totalBookings: data.bookings || 0,
          conversionRate: data.conversionRate || 0,
          averageRating: data.averageRating || 0,
          totalRevenue: data.revenue || 0,
          occupancyRate: data.occupancyRate || 0,
          viewsData: data.viewsData || [],
          bookingsData: data.bookingsData || [],
          revenueData: data.revenueData || []
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalViews.toLocaleString()}</p>
            </div>
            <FaChartLine className="text-3xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalBookings}</p>
            </div>
            <FaCalendarAlt className="text-3xl text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.conversionRate.toFixed(1)}%</p>
            </div>
            <FaTrophy className="text-3xl text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.averageRating.toFixed(1)}/5</p>
            </div>
            <FaStar className="text-3xl text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">RWF {analyticsData.totalRevenue.toLocaleString()}</p>
            </div>
            <FaChartLine className="text-3xl text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.occupancyRate.toFixed(1)}%</p>
            </div>
            <FaUsers className="text-3xl text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Chart visualization coming soon...
        </div>
      </div>
    </div>
  );

  const renderDemand = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-6">Demand for Your Location</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <FaMapMarkerAlt className="text-2xl text-blue-600" />
            <div>
              <p className="font-medium">High Demand Period</p>
              <p className="text-sm text-gray-600">December - February</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            +45% Bookings
          </span>
        </div>
        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <FaMapMarkerAlt className="text-2xl text-yellow-600" />
            <div>
              <p className="font-medium">Medium Demand Period</p>
              <p className="text-sm text-gray-600">March - May</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            +20% Bookings
          </span>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <FaMapMarkerAlt className="text-2xl text-gray-600" />
            <div>
              <p className="font-medium">Low Demand Period</p>
              <p className="text-sm text-gray-600">June - August</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
            Normal
          </span>
        </div>
      </div>
    </div>
  );

  const renderPace = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-6">Your Pace of Bookings</h3>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">This Month</span>
            <span className="text-sm font-medium">{analyticsData.totalBookings} bookings</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Last Month</span>
            <span className="text-sm font-medium">{Math.floor(analyticsData.totalBookings * 0.8)} bookings</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-green-600 h-3 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Insight:</strong> Your booking pace has increased by 25% compared to last month. Keep up the great work!
          </p>
        </div>
      </div>
    </div>
  );

  const renderSales = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-6">Sales Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Average Booking Value</p>
          <p className="text-2xl font-bold">RWF {(analyticsData.totalRevenue / (analyticsData.totalBookings || 1)).toLocaleString()}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Total Guests</p>
          <p className="text-2xl font-bold">{analyticsData.totalBookings * 2}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Repeat Guests</p>
          <p className="text-2xl font-bold">{Math.floor(analyticsData.totalBookings * 0.3)}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Average Stay Duration</p>
          <p className="text-2xl font-bold">3.5 nights</p>
        </div>
      </div>
    </div>
  );

  const renderBookerInsights = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-6">Booker Insights</h3>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Top Guest Demographics</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Families</span>
              <span className="text-sm font-medium">45%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Couples</span>
              <span className="text-sm font-medium">35%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Solo Travelers</span>
              <span className="text-sm font-medium">20%</span>
            </div>
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Booking Lead Time</h4>
          <p className="text-sm text-gray-600">Average: 14 days in advance</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your property performance and insights</p>
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
            {['dashboard', 'demand', 'pace', 'sales', 'booker', 'performance'].map((tab) => (
              <a
                key={tab}
                href={`?view=${tab}`}
                className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  view === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </a>
            ))}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        ) : (
          <>
            {view === 'dashboard' && renderDashboard()}
            {view === 'demand' && renderDemand()}
            {view === 'pace' && renderPace()}
            {view === 'sales' && renderSales()}
            {view === 'booker' && renderBookerInsights()}
            {view === 'performance' && renderDashboard()}
          </>
        )}
      </div>
    </div>
  );
}
