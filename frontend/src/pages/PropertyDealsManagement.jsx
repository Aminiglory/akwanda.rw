import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaPlus, FaFire, FaChartLine } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const PropertyDealsManagement = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/properties/mine`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setProperties(data.properties || []);
        if (data.properties?.length > 0) {
          setSelectedProperty(data.properties[0]._id);
        }
      }
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaFire className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No Properties Yet</h2>
          <p className="text-gray-600 mb-4">Create a property first to manage deals</p>
          <a
            href="/list-property"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Add Your First Property
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <FaFire className="inline-block mr-3 text-orange-500" />
            Deals & Promotions
          </h1>
          <p className="text-gray-600">Create and manage special offers for your properties</p>
        </div>

        {/* Property Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Property
          </label>
          <select
            value={selectedProperty || ''}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {properties.map(prop => (
              <option key={prop._id} value={prop._id}>
                {prop.title} - {prop.city}
              </option>
            ))}
          </select>
        </div>

        {/* Deals Manager Component */}
        {selectedProperty && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <DealsManagerContent propertyId={selectedProperty} />
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified inline deals manager
const DealsManagerContent = ({ propertyId }) => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals();
  }, [propertyId]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/deals/property/${propertyId}`);
      const data = await res.json();
      if (res.ok) {
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Active Deals</h2>
        <button
          onClick={() => window.location.href = `/owner/deals/create?property=${propertyId}`}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaPlus />
          <span>Create Deal</span>
        </button>
      </div>

      {deals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FaFire className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Deals Yet</h3>
          <p className="text-gray-600 mb-4">Create your first deal to attract more bookings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map(deal => (
            <div key={deal._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span
                  className="text-xs px-2 py-1 rounded-full text-white font-semibold"
                  style={{ backgroundColor: deal.badgeColor || '#FF6B6B' }}
                >
                  {deal.title}
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {deal.discountType === 'percentage' ? `${deal.discountValue}%` : `$${deal.discountValue}`} OFF
              </div>
              <div className="text-sm text-gray-600">
                {deal.tagline || deal.description}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-semibold">{deal.views || 0}</div>
                  <div className="text-gray-600">Views</div>
                </div>
                <div>
                  <div className="font-semibold">{deal.clicks || 0}</div>
                  <div className="text-gray-600">Clicks</div>
                </div>
                <div>
                  <div className="font-semibold">{deal.bookings || 0}</div>
                  <div className="text-gray-600">Bookings</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyDealsManagement;
