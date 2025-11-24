import React, { useEffect, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
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
  const { formatCurrencyRWF } = useLocale() || {};
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
  const [expandedAmenitiesRooms, setExpandedAmenitiesRooms] = useState({});
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [searchCheckIn, setSearchCheckIn] = useState('');
  const [searchCheckOut, setSearchCheckOut] = useState('');
  const [searchGuests, setSearchGuests] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityRooms, setAvailabilityRooms] = useState(null);

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
      const priceNight = Number(apartment.pricePerNight || 0);
      const formattedPriceNight = formatCurrencyRWF ? formatCurrencyRWF(priceNight) : `RWF ${priceNight.toLocaleString()}`;
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
        <div class="meta">${formattedPriceNight} per night</div>
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
          price: p.pricePerNight || p.price || 0,
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
              images: Array.isArray(room.images) ? room.images.map(makeAbsolute) : []
            };
          }) : [],
          amenities: processedAmenities,
          description: p.description || '',
          host: {
            name: p.host ? `${p.host.firstName} ${p.host.lastName}` : '—',
            avatar: null,
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
            checkIn: p.checkInTime || '3:00 PM',
            checkOut: p.checkOutTime || '11:00 AM',
            cancellation: p.cancellationPolicy || 'Free cancellation up to 24 hours before check-in',
            houseRules: Array.isArray(p.roomRules) && p.roomRules.length ? p.roomRules : []
          },
          lat: typeof p.latitude === 'number' ? p.latitude : null,
          lng: typeof p.longitude === 'number' ? p.longitude : null
        });
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setReviewsLoading(true);
        setReviewsError('');
        const res = await fetch(`${API_URL}/api/reviews/property/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to load reviews');
        if (!cancelled) {
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        }
      } catch (e) {
        if (!cancelled) {
          setReviewsError(e.message || 'Failed to load reviews');
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [API_URL, id]);

  const handleDatesAvailability = async () => {
    if (!searchCheckIn || !searchCheckOut || !searchGuests || Number(searchGuests) < 1) {
      toast.error('Please select check-in, check-out, and number of guests to see available rooms.');
      return;
    }

    try {
      setAvailabilityLoading(true);
      const res = await fetch(`${API_URL}/api/properties/${id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          checkIn: searchCheckIn,
          checkOut: searchCheckOut,
          guests: Number(searchGuests)
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to check availability');
      }

      const available = Array.isArray(data.availableRooms) ? data.availableRooms : [];
      setAvailabilityRooms(available);

      if (available.length === 0) {
        try { toast.dismiss(); } catch (_) {}
        const guestCount = Number(searchGuests);
        let maxCapacity = null;
        if (apartment && Array.isArray(apartment.rooms) && apartment.rooms.length > 0) {
          maxCapacity = apartment.rooms.reduce((max, room) => {
            const cap = Number(room.capacity || 1);
            return cap > max ? cap : max;
          }, 0);
        }

        if (maxCapacity && guestCount > maxCapacity) {
          toast(
            `This property can host up to ${maxCapacity} guest${maxCapacity > 1 ? 's' : ''} in a single room. Try reducing the number of guests or choosing another property.`,
            { icon: '\u2139\ufe0f' }
          );
        } else {
          toast('No rooms are available for these dates.', { icon: '\u2139\ufe0f' });
        }
      }
    } catch (e) {
      toast.error(e.message || 'Failed to check availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleReserveRoom = (room) => {
    if (!searchCheckIn || !searchCheckOut || !searchGuests || Number(searchGuests) < 1) {
      toast.error('Please select check-in, check-out, and number of guests before reserving a room.');
      return;
    }

    const roomId = room && (room._id || room.id || room.roomNumber);
    if (!roomId) {
      toast.error('Unable to identify this room. Please try a different room.');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const params = new URLSearchParams({
      checkIn: searchCheckIn,
      checkOut: searchCheckOut,
      guests: String(searchGuests),
      roomId: String(roomId)
    });

    navigate(`/booking/${id}?${params.toString()}`);
  };

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

  const roomsToDisplay = (() => {
    const baseRooms = Array.isArray(apartment.rooms) ? apartment.rooms : [];
    if (availabilityRooms === null) return baseRooms;
    if (!Array.isArray(availabilityRooms) || availabilityRooms.length === 0) return [];

    const idSet = new Set(
      (availabilityRooms || []).map((r) =>
        String(r._id || r.id || r.roomNumber || '')
      )
    );

    const filtered = baseRooms.filter((r) => {
      const key = String(r._id || r.id || r.roomNumber || '');
      return key && idSet.has(key);
    });

    return filtered;
  })();

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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full chip-primary text-sm">
                  <FaMapMarkerAlt className="text-primary" />
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
                          ? 'ring-2 ring-primary scale-105' 
                          : 'hover:scale-105 hover:ring-2 ring-primary'
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
                        <div className="absolute inset-0 bg-primary bg-opacity-20 flex items-center justify-center">
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
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-800">
                      Available Rooms
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FaBed className="text-blue-600" />
                      <span>
                        {roomsToDisplay.length}
                        {availabilityRooms !== null && searchCheckIn && searchCheckOut
                          ? ' room(s) available for your dates'
                          : ' room(s) configured'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          value={searchCheckIn}
                          onChange={(e) => setSearchCheckIn(e.target.value)}
                          className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <span className="text-gray-400 text-sm">-</span>
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          value={searchCheckOut}
                          onChange={(e) => setSearchCheckOut(e.target.value)}
                          className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="field w-24">
                        <FaUser className="icon-left" />
                        <input
                          type="number"
                          min={1}
                          value={searchGuests}
                          onChange={(e) => setSearchGuests(e.target.value)}
                          placeholder="Guests"
                          className="pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleDatesAvailability}
                        disabled={availabilityLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {availabilityLoading ? 'Checking…' : 'Show available rooms'}
                      </button>
                    </div>
                  </div>
                </div>
                {availabilityRooms !== null && roomsToDisplay.length === 0 ? (
                  <div className="border border-red-100 bg-red-50 rounded-xl p-4 text-sm text-red-700">
                    {searchCheckIn && searchCheckOut ? (
                      <span>
                        No rooms are available for{' '}
                        {new Date(searchCheckIn).toLocaleDateString()} to{' '}
                        {new Date(searchCheckOut).toLocaleDateString()}.
                      </span>
                    ) : (
                      <span>No rooms are available for the selected dates.</span>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roomsToDisplay.map((room, index) => (
                      <div 
                        key={index}
                        className={`group rounded-2xl p-4 cursor-pointer bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 relative ${
                          selectedRoom === index 
                            ? 'ring-2 ring-primary surface-secondary' 
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
                            <h4 className="font-semibold text-gray-800 text-lg group-hover:text-primary-700 transition-colors duration-300">
                              {room.roomNumber}
                            </h4>
                            <p className="text-sm text-gray-600 capitalize font-medium">
                              {room.roomType} Room
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary group-hover:text-primary-700 transition-colors duration-300">
                              {formatCurrencyRWF ? formatCurrencyRWF(room.pricePerNight || room.price || 0) : `RWF ${(room.pricePerNight || room.price || 0).toLocaleString()}`}
                            </div>
                            <div className="text-sm text-gray-500">per night</div>
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
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg btn-primary text-white transition-colors text-xs md:text-sm"
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
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                              availabilityRooms !== null && searchCheckIn && searchCheckOut
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {availabilityRooms !== null && searchCheckIn && searchCheckOut
                              ? '✓ Available for your dates'
                              : 'Select dates to check availability'}
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
                            {(expandedAmenitiesRooms[index] ? room.amenities : room.amenities.slice(0, 3)).map((amenity, amenityIndex) => (
                              <span 
                                key={amenityIndex}
                                className="px-3 py-1 chip-primary border border-subtle text-xs rounded-full font-medium transition-colors"
                              >
                                {amenity}
                              </span>
                            ))}
                            {room.amenities.length > 3 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedAmenitiesRooms((prev) => ({
                                    ...prev,
                                    [index]: !prev[index]
                                  }));
                                }}
                                className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 text-xs rounded-full font-medium hover:bg-purple-100 transition-colors focus:outline-none"
                              >
                                {expandedAmenitiesRooms[index]
                                  ? 'Show fewer'
                                  : `+${room.amenities.length - 3} more`}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Reserve Button */}
                        <div
                          className="mt-4 flex items-center justify-between"
                          data-interactive="true"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs text-gray-600">
                            {searchCheckIn && searchCheckOut ? (
                              <>
                                {new Date(searchCheckIn).toLocaleDateString()} -{' '}
                                {new Date(searchCheckOut).toLocaleDateString()}
                              </>
                            ) : (
                              'Choose your dates first'
                            )}
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-xs md:text-sm font-semibold hover:bg-blue-700 transition-colors"
                            onClick={() => handleReserveRoom(room)}
                          >
                            Reserve this room
                          </button>
                        </div>

                        {/* Selection Indicator */}
                        {selectedRoom === index && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-pulse">
                            <FaCheck className="text-white text-xs" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-5 md:p-6">
              <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
                <FaStar className="text-blue-600" />
                <h3 className="text-lg">Guest Reviews</h3>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {apartment.reviews > 0
                      ? `${apartment.reviews} stay${apartment.reviews === 1 ? '' : 's'} at this property`
                      : 'No reviews yet for this property'}
                  </p>
                  {apartment.reviews > 0 && (
                    <p className="text-xs text-gray-500">
                      Average rating {apartment.rating.toFixed(1)} / 5
                    </p>
                  )}
                </div>
                {apartment.reviews > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">{apartment.rating.toFixed(1)}</span>
                    <div className="hidden sm:flex">{renderStars(apartment.rating)}</div>
                  </div>
                )}
              </div>
              {reviewsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : reviewsError ? (
                <p className="text-sm text-red-500">{reviewsError}</p>
              ) : reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => {
                    const guest = review.guest || {};
                    const initials = (guest.fullName || `${guest.firstName || ''} ${guest.lastName || ''}` || 'G')
                      .trim()
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <div key={review._id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          {guest.profilePicture ? (
                            <img
                              src={guest.profilePicture}
                              alt={guest.fullName || 'Guest'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                              {initials || 'G'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {guest.fullName || 'Guest'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaStar className="text-yellow-400" />
                              <span className="text-sm font-medium text-gray-800">
                                {Number(review.rating || 0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="mt-1 text-sm text-gray-700 break-words">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {reviews.length > 3 && (
                    <p className="text-xs text-gray-500">
                      Showing 3 of {reviews.length} reviews.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No guest reviews yet. Be the first to share your experience.
                </p>
              )}
            </div>

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

            {apartment.lat != null && apartment.lng != null && (
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-5 md:p-6">
                <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
                  <FaMapMarkerAlt className="text-blue-600" />
                  <h3 className="text-lg">Location &amp; Area Info</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{apartment.location}</p>
                <div className="rounded-2xl overflow-hidden border border-gray-100 h-64 mb-3">
                  <iframe
                    title="Property location map"
                    src={`https://www.google.com/maps?q=${apartment.lat},${apartment.lng}&hl=en&z=14&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Map location is approximate and provided for orientation.
                </p>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8 space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">From</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrencyRWF
                    ? formatCurrencyRWF(apartment.pricePerNight || apartment.price || 0)
                    : `RWF ${(apartment.pricePerNight || apartment.price || 0).toLocaleString()}`}
                  <span className="text-sm font-normal text-gray-500 ml-1">/ night</span>
                </div>
                {searchCheckIn && searchCheckOut && (
                  <div className="mt-2 text-xs text-gray-600">
                    {new Date(searchCheckIn).toLocaleDateString()} - {new Date(searchCheckOut).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Check-in</span>
                  <span className="font-medium">
                    {searchCheckIn ? new Date(searchCheckIn).toLocaleDateString() : 'Select dates'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Check-out</span>
                  <span className="font-medium">
                    {searchCheckOut ? new Date(searchCheckOut).toLocaleDateString() : 'Select dates'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Guests</span>
                  <span className="font-medium">{searchGuests || 'Select guests'}</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                    return;
                  }
                  if (!searchCheckIn || !searchCheckOut) {
                    toast.error('Please select check-in and check-out dates before reserving a room.');
                    return;
                  }
                  if (selectedRoom === null || !roomsToDisplay[selectedRoom]) {
                    toast.error('Please choose a room below and click "Reserve this room".');
                    return;
                  }
                  handleReserveRoom(roomsToDisplay[selectedRoom]);
                }}
              >
                {isAuthenticated ? 'Reserve selected room' : 'Login to book'}
              </button>

              {/* Commission details are surfaced in Notifications for property owners; no monthly pricing shown here. */}
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
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <span className="text-gray-600">Bathroom</span>
                  <span className="font-medium capitalize text-gray-800">{detailsRoom.bathroomType || 'inside'}</span>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between shadow-sm col-span-2">
                  <span className="text-gray-600">Price / night</span>
                  <span className="font-bold text-blue-700">{formatCurrencyRWF ? formatCurrencyRWF(detailsRoom.pricePerNight || 0) : `RWF ${(detailsRoom.pricePerNight || 0).toLocaleString()}`}</span>
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

    </div>
  );
};

// Modal Portal is not used; simple in-page modal overlay

export default ApartmentDetails;