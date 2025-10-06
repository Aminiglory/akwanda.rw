import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CarsList() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ location: '', type: '', q: '' });

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
      setCars(data.cars || []);
    } catch (e) { /* show minimal */ console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadCars(); }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Car Rentals</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="px-3 py-2 border rounded" placeholder="Location" value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
        <select className="px-3 py-2 border rounded" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          {['economy','compact','mid-size','full-size','luxury','suv','minivan'].map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <input className="px-3 py-2 border rounded" placeholder="Search brand/model" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
        <button onClick={loadCars} className="px-4 py-2 bg-blue-600 text-white rounded">Search</button>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cars.map(c => (
            <Link key={c._id} to={`/cars/${c._id}`} className="bg-white rounded-lg shadow hover:shadow-md transition p-3">
              <div className="w-full h-40 bg-gray-100 rounded overflow-hidden">
                {c.images?.[0] ? <img src={`${API_URL}${c.images[0]}`} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="mt-2">
                <div className="font-semibold">{c.vehicleName} • {c.brand} {c.model}</div>
                <div className="text-sm text-gray-600">{c.location} • {c.vehicleType} • {c.transmission}</div>
                <div className="text-sm font-medium mt-1">{c.pricePerDay} {c.currency}/day</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
