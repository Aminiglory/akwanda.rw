import React, { useState, useEffect } from 'react';
import { FaFire, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const TestDeals = () => {
  const [properties, setProperties] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch properties
      const propRes = await fetch(`${API_URL}/api/properties`);
      const propData = await propRes.json();
      setProperties(propData.properties || []);

      // Fetch all deals (public endpoint)
      const dealsPromises = (propData.properties || []).map(p =>
        fetch(`${API_URL}/api/deals/property/${p._id}`).then(r => r.json())
      );
      const dealsResults = await Promise.all(dealsPromises);
      const allDeals = dealsResults.flatMap(r => r.deals || []);
      setDeals(allDeals);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const seedDeals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/seed/seed-demo-deals`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Created ${data.count} demo deals!`);
        fetchData();
      } else {
        toast.error(data.message || 'Failed to seed deals');
      }
    } catch (error) {
      toast.error('Failed to seed deals');
    } finally {
      setLoading(false);
    }
  };

  const clearDeals = async () => {
    if (!confirm('Are you sure you want to delete all deals?')) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/seed/clear-all-deals`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Deleted ${data.deletedCount} deals`);
        fetchData();
      } else {
        toast.error('Failed to clear deals');
      }
    } catch (error) {
      toast.error('Failed to clear deals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            <FaFire className="inline-block mr-3 text-orange-500" />
            Deals Testing Dashboard
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{properties.length}</div>
              <div className="text-sm text-gray-600">Total Properties</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{deals.length}</div>
              <div className="text-sm text-gray-600">Active Deals</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {properties.filter(p => p.activeDealsCount > 0).length}
              </div>
              <div className="text-sm text-gray-600">Properties with Deals</div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={seedDeals}
              disabled={loading}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <FaCheckCircle />
              <span>{loading ? 'Creating...' : 'Seed Demo Deals'}</span>
            </button>
            
            <button
              onClick={clearDeals}
              disabled={loading}
              className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <FaTimesCircle />
              <span>{loading ? 'Clearing...' : 'Clear All Deals'}</span>
            </button>

            <button
              onClick={fetchData}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Properties with Deals */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Properties with Deals</h2>
          
          {properties.length === 0 ? (
            <p className="text-gray-600">No properties found. Create properties first.</p>
          ) : (
            <div className="space-y-4">
              {properties.map(property => {
                const propertyDeals = deals.filter(d => String(d.property) === String(property._id));
                
                return (
                  <div key={property._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{property.title}</h3>
                        <p className="text-sm text-gray-600">{property.city}</p>
                      </div>
                      <div className="text-right">
                        {propertyDeals.length > 0 ? (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {propertyDeals.length} {propertyDeals.length === 1 ? 'Deal' : 'Deals'}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                            No Deals
                          </span>
                        )}
                      </div>
                    </div>

                    {propertyDeals.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {propertyDeals.map(deal => (
                          <div key={deal._id} className="bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-center">
                              <div>
                                <span
                                  className="text-xs px-2 py-1 rounded text-white font-semibold mr-2"
                                  style={{ backgroundColor: deal.badgeColor }}
                                >
                                  {deal.title}
                                </span>
                                <span className="text-sm text-gray-600">{deal.tagline}</span>
                              </div>
                              <div className="text-lg font-bold text-green-600">
                                {deal.discountValue}% OFF
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              Valid: {new Date(deal.validFrom).toLocaleDateString()} - {new Date(deal.validUntil).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">📋 Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click "Seed Demo Deals" to create test deals for your properties</li>
            <li>Go to <a href="/apartments" className="underline font-semibold">/apartments</a> to see deal badges on property cards</li>
            <li>Go to <a href="/deals" className="underline font-semibold">/deals</a> to see the deals landing page</li>
            <li>Check browser console for any errors</li>
            <li>Use "Clear All Deals" to remove test data when done</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TestDeals;
