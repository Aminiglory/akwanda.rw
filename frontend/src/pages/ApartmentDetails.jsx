import React, { useEffect, useState } from 'react';
import { CardGridSkeleton, ListItemSkeleton } from '../components/Skeletons';
import RoomCalendarPanel from '../components/RoomCalendarPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import toast from 'react-hot-toast';
import {
  FaBed,
  FaBath,
  FaWifi,
  FaCar,
  FaUtensils,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaStar,
  FaHeart,
  FaShare,
  FaPhone,
  FaEnvelope,
  FaSwimmingPool,
  FaTv,
  FaBook,
  FaShieldAlt,
  FaCoffee,
  FaParking,
  FaBus,
  FaKey,
  FaHome,
  FaDoorOpen,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaImages
} from 'react-icons/fa';

const ApartmentDetails = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [apartment, setApartment] = useState(null);
  const [showEmailShare, setShowEmailShare] = useState(false);
  const [shareToEmail, setShareToEmail] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [sharing, setSharing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarRoom, setCalendarRoom] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsRoom, setDetailsRoom] = useState(null);

  // Deals state
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [showDealsModal, setShowDealsModal] = useState(false);

  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\/g, '/');
    if (!s.startsWith('http')) {
      if (!s.startsWith('/')) s = `/${s}`;
      return `${API_URL}${s}`;
    }
    return s;
  };

  const sendShareByEmail = async () => {
    if (!apartment) return;
    const to = (shareToEmail || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { toast.error('Enter a valid email'); return; }
    try {
      setSharing(true);
      const subject = `Check this apartment: ${apartment.title}`;
      const primaryImg = Array.isArray(apartment.images) && apartment.images.length ? apartment.images[0] : '';
      const priceNight = Number(apartment.pricePerNight || 0).toLocaleString();
      const detailsUrl = window.location.href;
      const noteHtml = shareNote ? `<p style="margin:16px 0;color:#374151;line-height:1.5">${shareNote.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : '';
      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${subject}</title>
  <style>
    .card{max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb}
    .hdr{padding:16px 20px;background:#0ea5e9;color:#fff;font-weight:700;font-size:18px}
    .img{width:100%;height:auto;display:block}
    .body{padding:20px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu}
    .pill{display:inline-flex;align-items:center;background:#eef2ff;color:#3730a3;border-radius:9999px;padding:4px 10px;font-size:12px;margin-right:8px}
    .btn{display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:600}
    .meta{color:#374151;font-size:14px;margin:6px 0}
  </style>
  </head>
  <body style="background:#f3f4f6;padding:24px">
    <div class="card">
      <div class="hdr">Akwanda.rw • Apartment Recommendation</div>
      ${primaryImg ? `<img class="img" src="${primaryImg}" alt="${apartment.title}" />` : ''}
      <div class="body">
        <h1 style="margin:0 0 6px 0;font-size:22px;color:#111827">${apartment.title}</h1>
        <div class="meta">${apartment.location}</div>
        <div class="meta">RWF ${priceNight} per night</div>
        <div style="margin:10px 0 14px 0">
          <span class="pill">${apartment.bedrooms} Bedrooms</span>
          <span class="pill">${apartment.bathrooms} Bathrooms</span>
        </div>
        ${noteHtml}
        <div style="margin-top:16px">
          <a class="btn" href="${detailsUrl}" target="_blank" rel="noopener">View Apartment</a>
        </div>
        <p style="color:#6b7280;font-size:12px;margin-top:18px">Shared via Akwanda.rw</p>
      </div>
    </div>
  </body>
</html>
`;
      const res = await fetch(`${API_URL}/api/share/email`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html })
      });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        throw new Error(d.message || 'Failed to send email');
      }
      toast.success('Shared via email');
      setShowEmailShare(false);
      setShareToEmail('');
      setShareNote('');
    } catch (e) { toast.error(e.message); } finally { setSharing(false); }
  };

  // Favorite persistence helpers
  useEffect(() => {
    try {
      const uid = (user && (user._id || user.id)) ? String(user._id || user.id) : 'guest';
      const raw = localStorage.getItem(`favorites:${uid}`);
      const list = raw ? JSON.parse(raw) : [];
      setIsFavorited(Array.isArray(list) ? list.includes(String(id)) : false);
    } catch { /* ignore */ }
  }, [id, user]);

  const toggleFavorite = () => {
    try {
      const uid = (user && (user._id || user.id)) ? String(user._id || user.id) : 'guest';
      const key = `favorites:${uid}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const sId = String(id);
      let next;
      if (Array.isArray(list) && list.includes(sId)) {
        next = list.filter(x => String(x) !== sId);
        setIsFavorited(false);
        toast.success('Removed from Favorites');
      } else {
        next = Array.isArray(list) ? [...list, sId] : [sId];
        setIsFavorited(true);
        toast.success('Saved to Favorites');
      }
      localStorage.setItem(key, JSON.stringify(Array.from(new Set(next))));
    } catch (e) {
      toast.error('Could not update favorites');
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: apartment?.title || 'Property',
        text: `Check out this ${apartment?.type || 'property'} on Akwanda`,
        url: window.location.href
      };
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard');
      } else {
        // Fallback: select-copy
        const input = document.createElement('input');
        input.value = shareData.url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        toast.success('Link copied');
      }
    } catch (e) {
      toast.error('Unable to share');
    }
  };

  // Load property details
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load property');

        const p = data.property || data;
        const amenityIcons = {
          'wifi': FaWifi,
          'WiFi': FaWifi,
          'parking': FaCar,
          'Parking': FaCar,
          'kitchen': FaUtensils,
          'Kitchen': FaUtensils,
          'pool': FaSwimmingPool,
          'Pool': FaSwimmingPool,
          'tv': FaTv,
          'TV': FaTv,
          'air_conditioning': FaBook,
          'security': FaShieldAlt,
          'coffee': FaCoffee,
          'balcony': FaHome
        };

        const processedAmenities = Array.isArray(p.amenities) ? p.amenities.map((a) => ({
          icon: amenityIcons[a] || FaHome,
          name: a
        })) : [];

        setApartment({
          id: p._id,
          title: p.title,
          location: `${p.address}, ${p.city}`,
          price: (p.pricePerNight || p.price || 0) * 30,
          pricePerNight: p.pricePerNight || p.price || 0,
          rating: p.ratings?.length ? (p.ratings.reduce((s, r) => s + r.rating, 0) / p.ratings.length) : 0,
          reviews: p.ratings?.length || 0,
          type: p.category || 'Apartment',
          size: p.size || '—',
          bedrooms: p.bedrooms ?? 0,
          bathrooms: p.bathrooms ?? 0,
          images: Array.isArray(p.images) && p.images.length ? p.images.map(makeAbsolute) : [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'
          ],
          rooms: Array.isArray(p.rooms) ? p.rooms.map((room) => {
            const roomPricePerNight = room.pricePerNight || room.price || 0;
            return {
              ...room,
              pricePerNight: roomPricePerNight,
              pricePerMonth: room.pricePerMonth || roomPricePerNight * 30,
              images: Array.isArray(room.images) ? room.images.map(makeAbsolute) : []
            };
          }) : [],
          amenities: processedAmenities,
          description: p.description || '',
          host: {
            name: p.host ? `${p.host.firstName} ${p.host.lastName}` : '—',
            avatar: null,
            // Host panel will use apartment.rating and apartment.reviews from Property.ratings[]
            email: p.host?.email,
            phone: p.host?.phone,
            id: p.host?._id || p.host?.id,
            joinYear: (() => {
              try {
                const d = p.host?.createdAt ? new Date(p.host.createdAt) : null;
                return d && !isNaN(d.getTime()) ? d.getFullYear() : null;
              } catch { return null; }
            })()
          },
          features: {
            checkIn: '3:00 PM',
            checkOut: '11:00 AM',
            cancellation: 'Free cancellation up to 24 hours before check-in',
            houseRules: Array.isArray(p.houseRules) && p.houseRules.length ? p.houseRules : []
          }
        });
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [id]);

  // Fetch deals for this property once the id is known
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!id) return;
      try {
        setDealsLoading(true);
        const res = await fetch(`${API_URL}/api/deals/property/${id}`);
        const data = await res.json();
        if (!ignore && res.ok) {
          const list = Array.isArray(data.deals) ? data.deals : [];
          setDeals(list);
          // restore selection from localStorage if any
          try {
            const saved = localStorage.getItem(`deal:selected:${id}`);
            if (saved && list.some(d => d._id === saved)) setSelectedDealId(saved);
          } catch {}
        }
      } catch (e) {
        // silent fail
      } finally {
        if (!ignore) setDealsLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id, API_URL]);

  // Auto-expand the first room for bookers so the calendar is visible immediately
  useEffect(() => {
    if (apartment && Array.isArray(apartment.rooms) && apartment.rooms.length > 0 && selectedRoom === null) {
      setSelectedRoom(0);
    }
  }, [apartment, selectedRoom]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => {
      const full = i < Math.floor(rating);
      const half = !full && i < rating;
      return (
        <FaStar
          key={i}
          className={
            full
              ? 'text-yellow-400'
              : half
              ? 'text-yellow-300'
              : 'text-gray-300'
          }
          style={half ? { clipPath: 'inset(0 50% 0 0)' } : {}}
        />
      );
    });
  };

  if (!apartment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-8">
          {/* Header skeleton */}
          <div className="rounded-2xl bg-white shadow p-4 md:p-5 mb-6">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-7 w-3/4 bg-gray-200 rounded mb-3 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Gallery skeleton */}
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="h-96 bg-gray-200 animate-pulse" />
                <div className="p-4 grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Overview skeleton */}
              <div className="bg-white rounded-2xl shadow p-6 space-y-3">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
                <div className="space-y-2 mt-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Rooms skeleton */}
              <CardGridSkeleton count={2} />
            </div>

            {/* Sidebar skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow p-6 space-y-4 sticky top-8">
                <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-transparent">
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-md ring-1 ring-black/5 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-shadow">
            <div className="min-w-0">
              {/* Breadcrumbs */}
              <div className="mb-1 text-xs md:text-sm text-gray-500 flex items-center gap-2">
                <span className="hover:text-gray-700 cursor-pointer">Apartments</span>
                <span>›</span>
                <span className="hover:text-gray-700 cursor-pointer">{(apartment.location || '').split(',').slice(-1)[0]?.trim() || 'Location'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl leading-tight font-bold text-gray-900 tracking-tight truncate capitalize">{apartment.title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-sm">
                  <FaMapMarkerAlt className="text-blue-600" />
                  <span className="truncate max-w-[60vw] md:max-w-none">{apartment.location}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                  <span className="flex items-center gap-0.5">
                    {renderStars(apartment.rating)}
                  </span>
                  <span className="font-medium">
                    {apartment.rating.toFixed(1)}
                  </span>
                  <span className="opacity-70">· {apartment.reviews} Reviews</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  Verified Listing
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="p-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Share" aria-label="Share">
                <FaShare className="text-lg" />
              </button>
              <button onClick={()=> setShowEmailShare(true)} className="p-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Share via Email" aria-label="Share via Email">
                <FaEnvelope className="text-lg" />
              </button>
              <button
                onClick={toggleFavorite}
                className={`p-3 rounded-full transition-colors ${isFavorited ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                title={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
                aria-label={isFavorited ? 'Unfavorite' : 'Favorite'}
              >
                <FaHeart className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Apartment Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enhanced Image Gallery */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl overflow-hidden transition-shadow animate-fade-in-up">
              {/* Gallery Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70">
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <FaImages className="text-blue-600" />
                  <span>Property Gallery</span>
                </div>
                <span className="text-xs text-gray-600">{Array.isArray(apartment.images) ? apartment.images.length : 0} Images</span>
              </div>
              <div className="relative group">
                <img
                  loading="lazy"
                  src={apartment.images[selectedImage]}
                  alt={apartment.title}
                  className="w-full h-96 object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop';
                  }}
                />
                
                {/* Navigation Arrows */}
                {apartment.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage(selectedImage === 0 ? apartment.images.length - 1 : selectedImage - 1)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <FaChevronLeft />
                    </button>
                    <button
                      onClick={() => setSelectedImage(selectedImage === apartment.images.length - 1 ? 0 : selectedImage + 1)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <FaChevronRight />
                    </button>
                  </>
                )}
                
                {/* Image Counter */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {selectedImage + 1} / {apartment.images.length}
                </div>
                
                {/* Favorite Button Overlay */}
                <button
                  onClick={toggleFavorite}
                  className={`absolute top-4 right-4 p-3 rounded-full transition-all duration-300 ${
                    isFavorited
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-white bg-opacity-80 text-gray-600 hover:bg-opacity-100'
                  }`}
                >
                  <FaHeart className={`text-xl ${isFavorited ? 'animate-pulse' : ''}`} />
                </button>
              </div>
              
              {/* Thumbnail Gallery */}
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {apartment.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative h-20 rounded-lg overflow-hidden transition-all duration-300 group/thumb ${
                        selectedImage === index 
                          ? 'ring-2 ring-blue-500 scale-105' 
                          : 'hover:scale-105 hover:ring-2 hover:ring-blue-300'
                      }`}
                    >
                      <img
                        loading="lazy"
                        src={image}
                        alt={`View ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=150&fit=crop';
                        }}
                      />
                      {selectedImage === index && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <FaCheck className="text-white text-lg" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Property Overview */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 text-gray-900 font-semibold">
                    <FaHome className="text-blue-600" />
                    <h2 className="text-xl md:text-2xl font-bold truncate">{apartment.type}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-gray-600 text-sm">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                      <FaBed />
                      <span className="whitespace-nowrap">{apartment.bedrooms} Bedrooms</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                      <FaBath />
                      <span className="whitespace-nowrap">{apartment.bathrooms} Bathrooms</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                      <span className="whitespace-nowrap">{apartment.size}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    {renderStars(apartment.rating)}
                    <span className="text-gray-700 font-medium">{apartment.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{apartment.reviews} Reviews</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-2">
                  About This {apartment.type}
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4 break-words">
                  {apartment.description}
                </p>
                {/* Property Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <FaDoorOpen className="text-blue-600" />
                    <span className="text-gray-700">Check-In: {apartment.features?.checkIn}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <FaKey className="text-blue-600" />
                    <span className="text-gray-700">Check-Out: {apartment.features?.checkOut}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <FaShieldAlt className="text-blue-600" />
                    <span className="text-gray-700">{apartment.features?.cancellation}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <FaHome className="text-blue-600" />
                    <span className="text-gray-700">Entire Place</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms Showcase */}
            {apartment.rooms && apartment.rooms.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                    Available Rooms
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FaBed className="text-blue-600" />
                    <span>{apartment.rooms.length} Rooms Available</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {apartment.rooms.map((room, index) => (
                    <div 
                      key={index}
                      className={`group rounded-2xl p-4 cursor-pointer bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 relative ${
                        selectedRoom === index 
                          ? 'ring-2 ring-blue-200 bg-blue-50' 
                          : ''
                      }`}
                      onClick={(e) => {
                        if (e.target.closest('[data-interactive="true"]')) return;
                        setSelectedRoom(selectedRoom === index ? null : index);
                      }}
                    >
                      {/* Room Header with Animation */}
                      <button
                        type="button"
                        className="w-full text-left flex items-start justify-between mb-3 focus:outline-none"
                        aria-expanded={selectedRoom === index}
                        aria-controls={`room-panel-${index}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedRoom(selectedRoom === index ? null : index); }}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 text-lg group-hover:text-blue-700 transition-colors duration-300">
                            {room.roomNumber}
                          </h4>
                          <p className="text-sm text-gray-600 capitalize font-medium">
                            {room.roomType} Room
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
                            RWF {(() => {
                              const roomPricePerNight = room.pricePerNight || room.price || 0;
                              const monthlyPrice = room.pricePerMonth || (roomPricePerNight * 30);
                              return monthlyPrice.toLocaleString();
                            })()}
                          </div>
                          <div className="text-sm text-gray-500">per month</div>
                          <div className="text-xs text-gray-400">
                            RWF {(room.pricePerNight || room.price || 0).toLocaleString()}/night
                          </div>
                        </div>
                      </button>
                      {/* Quick actions: open modals (calendar/details) */}
                      <div
                        className="flex items-center gap-2 mb-3"
                        data-interactive="true"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label="View availability"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs md:text-sm"
                          onClick={() => { setCalendarRoom(room); setIsCalendarOpen(true); }}
                          title="View availability"
                        >
                          <FaCalendarAlt />
                          <span className="hidden md:inline">Availability</span>
                        </button>
                        <button
                          type="button"
                          aria-label="View details"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-xs md:text-sm"
                          onClick={() => { setDetailsRoom(room); setIsDetailsOpen(true); }}
                          title="View details"
                        >
                          <FaHome />
                          <span className="hidden md:inline">Details</span>
                        </button>
                      </div>
                      
                      {/* Room Info with Icons */}
                      <div className="flex items-center space-x-3 text-xs text-gray-600 mb-3" data-interactive="true" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                          <FaUser className="mr-1 text-blue-600" />
                          <span className="font-medium">{room.capacity} guest{room.capacity > 1 ? 's' : ''}</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                          room.isAvailable 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}>
                          {room.isAvailable ? '✓ Available' : '✗ Unavailable'}
                        </div>
                      </div>

                      {/* Room Images with Enhanced Gallery */}
                      {Array.isArray(room.images) && room.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mb-4" data-interactive="true" onClick={(e) => e.stopPropagation()}>
                          {room.images.slice(0, 4).map((image, imgIndex) => {
                            const src = makeAbsolute(image);
                            return (
                              <button key={imgIndex} type="button" className="overflow-hidden rounded-lg focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <img
                                  loading="lazy"
                                  src={src}
                                  alt={`${room.roomNumber} - Image ${imgIndex + 1}`}
                                  className="w-full aspect-square object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=150&fit=crop';
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                          <FaBed className="mx-auto mb-2 text-2xl" />
                          <p className="text-sm">No images available for this room</p>
                        </div>
                      )}

                      {/* Room Amenities with Enhanced Design */}
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {room.amenities.slice(0, 3).map((amenity, amenityIndex) => (
                            <span 
                              key={amenityIndex}
                              className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs rounded-full font-medium hover:bg-blue-100 transition-colors"
                            >
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 3 && (
                            <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 text-xs rounded-full font-medium hover:bg-purple-100 transition-colors">
                              +{room.amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Removed in-card expanded details; details and availability open in modals */}

                      {/* Selection Indicator */}
                      {selectedRoom === index && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                          <FaCheck className="text-white text-xs" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-5 md:p-6">
              <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
                <FaShieldAlt className="text-blue-600" />
                <h3 className="text-lg">What This Place Offers</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {apartment.amenities.map((amenity, index) => {
                  const IconComponent = amenity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors min-w-0"
                    >
                      <IconComponent className="text-blue-600 text-xl shrink-0" />
                      <span className="text-gray-700 truncate">{amenity.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* House Rules */}
            {Array.isArray(apartment.features?.houseRules) && apartment.features.houseRules.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-5 md:p-6">
                <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
                  <FaBook className="text-blue-600" />
                  <h3 className="text-lg">House Rules</h3>
                </div>
                <div className="space-y-2">
                  {apartment.features.houseRules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-2 w-2 h-2 bg-blue-600 rounded-full shrink-0"></div>
                      <span className="text-gray-700 break-words">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Meet Your Host
              </h3>
              <div className="flex items-start space-x-4">
                {apartment.host.avatar ? (
                  <img
                    src={apartment.host.avatar}
                    alt={apartment.host.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                    {(apartment.host.name?.trim?.()?.[0] || 'H').toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 text-lg">
                    {apartment.host.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2 flex-wrap">
                    <div className="flex items-center">
                      {renderStars(apartment.rating)}
                      <span className="ml-1">{Number(apartment.rating || 0).toFixed(1)}</span>
                      <span className="ml-2 text-gray-500">({apartment.reviews} review{apartment.reviews === 1 ? '' : 's'})</span>
                    </div>
                    {apartment.host.joinYear && (
                      <span>Host since {apartment.host.joinYear}</span>
                    )}
                  </div>
                  
                  {/* Host Contact Info */}
                  <div className="space-y-1 text-sm text-gray-600">
                    {apartment.host.email && (
                      <div className="flex items-center space-x-2">
                        <FaEnvelope className="text-blue-600" />
                        <span>{apartment.host.email}</span>
                      </div>
                    )}
                    {apartment.host.phone && (
                      <div className="flex items-center space-x-2">
                        <FaPhone className="text-blue-600" />
                        <span>{apartment.host.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  {apartment.host.phone && (
                    <a 
                      href={`tel:${apartment.host.phone}`}
                      className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                      title="Call host"
                    >
                      <FaPhone />
                    </a>
                  )}
                  {apartment.host.email && (
                    <a 
                      href={`mailto:${apartment.host.email}`}
                      className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                      title="Email host"
                    >
                      <FaEnvelope />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  RWF {apartment.price?.toLocaleString() || '0'}
                </div>
                <span className="text-gray-600">per month</span>
              </div>

              {/* Deals & Promotions (desktop inline) */}
              <div className="hidden sm:block">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">Deals & Promotions</h4>
                  {dealsLoading && <span className="text-xs text-gray-500">Loading…</span>}
                </div>
                {(!dealsLoading && deals.length === 0) ? (
                  <div className="text-xs text-gray-500">No active deals</div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-auto pr-1">
                    {deals.map((d) => (
                      <label key={d._id} className="flex items-start gap-2 p-2 rounded-lg border hover:border-blue-300 cursor-pointer">
                        <input
                          type="radio"
                          name="deal"
                          checked={selectedDealId === d._id}
                          onChange={async () => {
                            setSelectedDealId(d._id);
                            try { localStorage.setItem(`deal:selected:${id}`, d._id); } catch {}
                            try { await fetch(`${API_URL}/api/deals/${d._id}/click`, { method: 'POST' }); } catch {}
                          }}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-white text-[11px]" style={{ backgroundColor: d.badgeColor || '#FF6B6B' }}>{d.badge || 'Deal'}</span>
                            <span className="truncate">{d.title}</span>
                          </div>
                          <div className="text-xs text-gray-600 truncate">{d.tagline || d.description}</div>
                          <div className="text-xs font-medium text-blue-700 mt-0.5">
                            {d.discountType === 'percentage' ? `${d.discountValue}% off` : d.discountType === 'fixed_amount' ? `Save RWF ${Number(d.discountValue||0).toLocaleString()}` : `Free night x${d.discountValue}`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile: open deal picker modal */}
              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowDealsModal(true)}
                  className="w-full mb-4 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 py-3 rounded-xl font-semibold"
                >
                  {selectedDealId ? 'Change deal' : 'Choose a deal'}
                </button>
              </div>

              <button
                type="button"
                disabled={!isAuthenticated}
                onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    navigate('/login');
                  } else {
                    const qp = selectedDealId ? `?dealId=${encodeURIComponent(selectedDealId)}` : '';
                    navigate(`/booking/${id}${qp}`);
                  }
                }}
                className={`w-full ${
                  isAuthenticated
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-300'
                } text-white py-4 rounded-xl font-semibold transition-all duration-300 ${
                  isAuthenticated
                    ? 'hover:scale-105 shadow-lg hover:shadow-xl'
                    : ''
                }`}
              >
                {isAuthenticated ? 'Start Booking Process' : 'Login to Book'}
              </button>

              <div className="mt-6 pt-6 border-t space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Monthly rent</span>
                  <span className="font-medium">RWF {apartment.price?.toLocaleString() || '0'}</span>
                </div>
                {/* Commission details are surfaced in Notifications for property owners */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setIsCalendarOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white/95 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh]">
            {/* Mobile-friendly floating close button */}
            <button
              type="button"
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white shadow-md ring-1 ring-black/5 md:hidden"
              onClick={() => setIsCalendarOpen(false)}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50/70 sticky top-0 z-10">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <FaCalendarAlt className="text-blue-600" />
                <span>Room Availability</span>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setIsCalendarOpen(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 56px)' }}>
              {calendarRoom && (
                <RoomCalendarPanel
                  propertyId={apartment.id}
                  room={calendarRoom}
                  readOnly={true}
                  compact={false}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {isDetailsOpen && detailsRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setIsDetailsOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white/95 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50/70">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <FaHome className="text-blue-600" />
                <span>Room Details • {detailsRoom.roomNumber}</span>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(detailsRoom.images || []).slice(0,6).map((img, i) => (
                  <img key={i} src={makeAbsolute(img)} alt={`Room ${i+1}`} className="w-full h-28 md:h-40 object-cover rounded-xl shadow-sm" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <span className="text-gray-600">Type</span>
                  <span className="font-medium capitalize text-gray-800">{detailsRoom.roomType}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <span className="text-gray-600">Capacity</span>
                  <span className="font-medium text-gray-800">{detailsRoom.capacity} guests</span>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <span className="text-gray-600">Price / month</span>
                  <span className="font-bold text-blue-700">RWF {(detailsRoom.pricePerMonth || (detailsRoom.pricePerNight||0)*30).toLocaleString()}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <span className="text-gray-600">Price / night</span>
                  <span className="font-medium text-gray-800">RWF {(detailsRoom.pricePerNight||0).toLocaleString()}</span>
                </div>
              </div>
              {Array.isArray(detailsRoom.amenities) && detailsRoom.amenities.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-2">
                    {detailsRoom.amenities.map((a, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-50 text-gray-700 text-xs rounded-full font-medium shadow-sm">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deals Modal (mobile) */}
      {showDealsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDealsModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
              <div className="text-gray-900 font-semibold">Choose a deal</div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setShowDealsModal(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              {dealsLoading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : deals.length === 0 ? (
                <div className="text-sm text-gray-600">No active deals for this property.</div>
              ) : (
                <div className="space-y-2">
                  {deals.map((d) => (
                    <label key={d._id} className={`flex items-start gap-2 p-3 rounded-xl border ${selectedDealId === d._id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'} active:bg-blue-50`}>
                      <input
                        type="radio"
                        name="deal-mobile"
                        checked={selectedDealId === d._id}
                        onChange={() => setSelectedDealId(d._id)}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-white text-[11px]" style={{ backgroundColor: d.badgeColor || '#FF6B6B' }}>{d.badge || 'Deal'}</span>
                          <span className="truncate">{d.title}</span>
                        </div>
                        <div className="text-xs text-gray-600 truncate">{d.tagline || d.description}</div>
                        <div className="text-xs font-medium text-blue-700 mt-0.5">
                          {d.discountType === 'percentage' ? `${d.discountValue}% off` : d.discountType === 'fixed_amount' ? `Save RWF ${Number(d.discountValue||0).toLocaleString()}` : `Free night x${d.discountValue}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-white flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-lg border" onClick={() => setShowDealsModal(false)}>Cancel</button>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                disabled={!selectedDealId}
                onClick={async () => {
                  try { if (selectedDealId) localStorage.setItem(`deal:selected:${id}`, selectedDealId); } catch {}
                  try { if (selectedDealId) await fetch(`${API_URL}/api/deals/${selectedDealId}/click`, { method: 'POST' }); } catch {}
                  setShowDealsModal(false);
                }}
              >
                Apply deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal Portal is not used; simple in-page modal overlay

export default ApartmentDetails;

/* Deals Modal (mobile) */
// Placed after export to keep component code above focused; rendered conditionally earlier