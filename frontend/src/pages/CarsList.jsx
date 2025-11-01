import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCar, FaMapMarkerAlt, FaUsers, FaGasPump, FaCog, FaStar } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CarsList() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ location: '', type: '', q: '' });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Mock data for demonstration
  const mockCars = [
    {
      _id: '1',
      vehicleName: 'Toyota RAV4',
      brand: 'Toyota',
      model: 'RAV4',
      type: 'suv',
      pricePerDay: 85000,
      location: 'Kigali',
      capacity: 5,
      transmission: 'Automatic',
      fuelType: 'Petrol',
      images: ['https://images.unsplash.com/photo-1549317336-206569e8475c?w=500&h=300&fit=crop'],
      rating: 4.8,
      reviews: 156
    },
    {
      _id: '2',
      vehicleName: 'Honda Civic',
      brand: 'Honda',
      model: 'Civic',
      type: 'compact',
      pricePerDay: 65000,
      location: 'Kigali',
      capacity: 5,
      transmission: 'Automatic',
      fuelType: 'Petrol',
      images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&h=300&fit=crop'],
      rating: 4.6,
      reviews: 89
    },
    {
      _id: '3',
      vehicleName: 'BMW X5',
      brand: 'BMW',
      model: 'X5',
      type: 'luxury',
      pricePerDay: 150000,
      location: 'Kigali',
      capacity: 7,
      transmission: 'Automatic',
      fuelType: 'Petrol',
      images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500&h=300&fit=crop'],
      rating: 4.9,
      reviews: 234
    },
    {
      _id: '4',
      vehicleName: 'Nissan Sentra',
      brand: 'Nissan',
      model: 'Sentra',
      type: 'economy',
      pricePerDay: 45000,
      location: 'Kigali',
      capacity: 5,
      transmission: 'Manual',
      fuelType: 'Petrol',
      images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=500&h=300&fit=crop'],
      rating: 4.4,
      reviews: 67
    },
    {
      _id: '5',
      vehicleName: 'Mercedes-Benz E-Class',
      brand: 'Mercedes-Benz',
      model: 'E-Class',
      type: 'luxury',
      pricePerDay: 180000,
      location: 'Kigali',
      capacity: 5,
      transmission: 'Automatic',
      fuelType: 'Petrol',
      images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=500&h=300&fit=crop'],
      rating: 4.9,
      reviews: 189
    },
    {
      _id: '6',
      vehicleName: 'Toyota Hiace',
      brand: 'Toyota',
      model: 'Hiace',
      type: 'minivan',
      pricePerDay: 95000,
      location: 'Kigali',
      capacity: 12,
      transmission: 'Manual',
      fuelType: 'Diesel',
      images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop'],
      rating: 4.5,
      reviews: 112
    }
  ];

  async function loadCars() {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (filters.location) qs.set('location', filters.location);
      if (filters.type) qs.set('type', filters.type);
      if (filters.q) qs.set('q', filters.q);
      const res = await fetch(`${API_URL}/api/cars?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load cars');
      setCars(data.cars || mockCars);
    } catch (e) { 
      // Use mock data if API fails
      setCars(mockCars);
    }
    finally { setLoading(false); }
  }

  useEffect(() => { loadCars(); }, []);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Car Rentals</h1>
          <p className="text-gray-600 text-lg">Find the perfect vehicle for your journey</p>
        </div>

        {/* Search Filters */}
        <div className="modern-card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
              <input 
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ring-primary focus:border-transparent transition-all duration-300" 
                placeholder="Location" 
                value={filters.location} 
                onChange={e => setFilters({ ...filters, location: e.target.value })} 
              />
            </div>
            <select 
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ring-primary focus:border-transparent transition-all duration-300" 
              value={filters.type} 
              onChange={e => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All types</option>
              {['economy','compact','mid-size','full-size','luxury','suv','minivan'].map(x => (
                <option key={x} value={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</option>
              ))}
            </select>
            <input 
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ring-primary focus:border-transparent transition-all duration-300" 
              placeholder="Search brand/model" 
              value={filters.q} 
              onChange={e => setFilters({ ...filters, q: e.target.value })} 
            />
            <button 
              onClick={loadCars} 
              className="px-6 py-3 btn-primary text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Search Cars
            </button>
          </div>
          {/* View mode toggle (large screens) */}
          <div className="hidden lg:flex items-center gap-2 mt-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`${viewMode==='grid' ? 'btn-primary text-white' : 'bg-gray-100 text-gray-700'} px-3 py-2 rounded-lg`}
              title="Grid view"
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`${viewMode==='table' ? 'btn-primary text-white' : 'bg-gray-100 text-gray-700'} px-3 py-2 rounded-lg`}
              title="Table view (large screens)"
            >
              Table
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[var(--ak-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cars...</p>
          </div>
        ) : (
          (viewMode === 'table' ? (
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--ak-secondary-200)] text-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3">Vehicle</th>
                    <th className="text-left px-4 py-3">Brand/Model</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Location</th>
                    <th className="text-left px-4 py-3">Price/day</th>
                    <th className="text-left px-4 py-3">Rating</th>
                    <th className="text-left px-4 py-3">Capacity</th>
                    <th className="text-left px-4 py-3">Fuel</th>
                    <th className="text-left px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cars.map((c) => (
                    <tr key={c._id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={c.images?.[0]} alt={c.vehicleName} className="w-14 h-14 rounded-lg object-cover" />
                          <div className="font-semibold text-gray-900 line-clamp-1">{c.vehicleName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.brand} {c.model}</td>
                      <td className="px-4 py-3 capitalize text-gray-700">{c.type}</td>
                      <td className="px-4 py-3 text-gray-700">{c.location}</td>
                      <td className="px-4 py-3 font-semibold text-primary-700">RWF {Number(c.pricePerDay || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">{Number(c.rating || 0).toFixed(1)} ({c.reviews})</td>
                      <td className="px-4 py-3 text-gray-700">{c.capacity}</td>
                      <td className="px-4 py-3 text-gray-700">{c.fuelType}</td>
                      <td className="px-4 py-3">
                        <Link to={`/cars/${c._id}`} className="btn-primary text-white px-3 py-1.5 rounded-lg">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map(c => (
                <Link key={c._id} to={`/cars/${c._id}`} className="modern-card-elevated overflow-hidden hover:scale-105 transition-all duration-300">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={c.images?.[0] || 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=500&h=300&fit=crop'} 
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" 
                      alt={c.vehicleName}
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
                      RWF {c.pricePerDay?.toLocaleString()}/day
                    </div>
                    <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {c.type?.charAt(0).toUpperCase() + c.type?.slice(1)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{c.vehicleName}</h3>
                    <p className="text-gray-600 mb-3">{c.brand} {c.model}</p>
                    
                    {/* Rating */}
                    <div className="flex items-center mb-4">
                      <div className="flex items-center mr-2">
                        {renderStars(c.rating)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {c.rating} ({c.reviews} reviews)
                      </span>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <FaUsers className="mr-2 text-primary" />
                        {c.capacity} seats
                      </div>
                      <div className="flex items-center">
                        <FaCog className="mr-2 text-primary" />
                        {c.transmission}
                      </div>
                      <div className="flex items-center">
                        <FaGasPump className="mr-2 text-primary" />
                        {c.fuelType}
                      </div>
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="mr-2 text-primary" />
                        {c.location}
                      </div>
                    </div>

                    {/* Book Button */}
                    <button className="w-full btn-primary text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg">
                      View Details & Book
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
