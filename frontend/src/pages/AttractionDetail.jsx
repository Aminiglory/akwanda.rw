import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';
import Map, { Marker } from 'react-map-gl';
import { applyGoogleLikeStyle } from '../utils/mapboxGoogleLikeStyle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

const getVideoEmbedUrl = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) === false) return null;

  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) return s;
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch (_) {
    return null;
  }

  return s;
};

export default function AttractionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrencyRWF, t } = useLocale() || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [availabilityInfo, setAvailabilityInfo] = useState(null);
  const [viewerId, setViewerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'mtn_mobile_money'
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || 'pk.eyJ1IjoiYW5zd2Vyam9obnNvbjYiLCJhIjoiY21qbnlkOXRlMnpwZTNlcXp0dDlpemNueCJ9.aa3QMnrPR9XxsI9tFhq4Q';
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    visitDate: '',
    timeSlot: '',
    tickets: 1,
    notes: ''
  });

  const [contact, setContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const tSafe = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const v = t(key);
    if (!v || v === key) return fallback;
    return v;
  };

  const yesNo = (v) => {
    if (String(v).toLowerCase() === 'yes') return tSafe('attractionWizard.common.yes', 'Yes');
    if (String(v).toLowerCase() === 'no') return tSafe('attractionWizard.common.no', 'No');
    return v;
  };

  const formatDay = (d) => {
    const key = String(d || '').toLowerCase();
    if (!key) return '';
    return tSafe(`attractionDetail.days.${key}`, key);
  };

  const timeSlots = useMemo(() => {
    const raw = item?.timeSlots;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
    const s = String(raw).trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).map(x => x.trim()).filter(Boolean);
    } catch (_) {
      // ignore
    }
    return s
      .split(/\r?\n|,|\|/)
      .map(x => String(x).trim())
      .filter(Boolean);
  }, [item?.timeSlots]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/attractions/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '');
        setItem(data.attraction || data);
      } catch (e) { setItem(null); } finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const u = data?.user;
        if (!u) return;
        if (u._id) setViewerId(String(u._id));
        setContact(prev => ({
          ...prev,
          firstName: u.firstName || prev.firstName,
          lastName: u.lastName || prev.lastName,
          email: u.email || prev.email,
          phone: u.phone || prev.phone,
        }));
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  async function checkAvailability() {
    if (!form.visitDate) return toast.error(tSafe('attractionDetail.toasts.selectVisitDate', 'Select visit date'));
    try {
      setChecking(true);
      const res = await fetch(`${API_URL}/api/attractions/${id}/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitDate: form.visitDate,
          tickets: Number(form.tickets || 1),
          timeSlot: String(form.timeSlot || '').trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not check availability');
      setAvailabilityInfo(data);
      if (!data?.available) {
        setAvailable(false);
        const reason = String(data?.reason || '').toLowerCase();
        if (reason === 'closed') {
          toast.error(tSafe('attractionDetail.toasts.closedOnSelectedDate', 'Not available: closed on selected date'));
        } else if (reason === 'slot_required') {
          toast.error(tSafe('attractionDetail.toasts.slotRequired', 'Not available: please select a time slot'));
        } else if (reason === 'invalid_slot') {
          toast.error(tSafe('attractionDetail.toasts.invalidSlot', 'Not available: selected time slot is not valid'));
        } else if (reason === 'capacity') {
          const remaining = Number(data?.remaining);
          if (Number.isFinite(remaining)) {
            const msg = tSafe(
              'attractionDetail.toasts.capacityRemaining',
              `Not available: only ${Math.max(0, remaining)} tickets remaining for this slot`
            );
            toast.error(String(msg).replace('{remaining}', String(Math.max(0, remaining))));
          } else {
            toast.error(tSafe('attractionDetail.toasts.notEnoughCapacity', 'Not available: not enough remaining capacity'));
          }
        } else {
          toast.error(tSafe('attractionDetail.toasts.notAvailable', 'Not available'));
        }
      } else {
        setAvailable(true);
        toast.success(tSafe('attractionDetail.toasts.available', 'Available'));
      }
    } catch (e) { toast.error(e.message); } finally { setChecking(false); }
  }

  async function createBooking() {
    if (!form.visitDate) return toast.error(tSafe('attractionDetail.toasts.selectVisitDate', 'Select visit date'));
    try {
      setBooking(true);
      const res = await fetch(`${API_URL}/api/attraction-bookings`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attractionId: id,
          visitDate: form.visitDate,
          timeSlot: String(form.timeSlot || '').trim(),
          tickets: Number(form.tickets || 1),
          notes: form.notes,
          contactPhone: contact.phone,
          paymentMethod,
        })
      });
      if (res.status === 401) { toast.error(tSafe('attractionDetail.toasts.pleaseLogin', 'Please login')); navigate('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || tSafe('attractionDetail.toasts.bookingFailed', 'Booking failed'));
      if (paymentMethod === 'mtn_mobile_money' && data?.booking?._id) {
        toast.success(tSafe('attractionDetail.toasts.redirectingToPayment', 'Redirecting to payment...'));
        navigate('/mtn-payment', {
          state: {
            attractionBookingId: data.booking._id,
            amount: Number(data.booking.totalAmount || 0),
            description: `Attraction booking for ${item?.name || 'your trip'}`,
            customerName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            customerEmail: contact.email || '',
            phoneNumber: contact.phone || '',
            redirectPath: `/attraction-booking-confirmation/${data.booking._id}`
          }
        });
        return;
      }
      toast.success(tSafe('attractionDetail.toasts.bookingCreated', 'Booking created'));
      if (data?.booking?._id) {
        navigate(`/attraction-booking-confirmation/${data.booking._id}`);
      } else {
        navigate('/attractions');
      }
    } catch (e) { toast.error(e.message); } finally { setBooking(false); }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-6">{tSafe('attractionDetail.loading', 'Loading...')}</div>;
  if (!item) return <div className="max-w-6xl mx-auto px-4 py-6">{tSafe('attractionDetail.notFound', 'Not found')}</div>;

  const imgUrl = (u) => makeAbsolute(u) || '';

  const unitPrice = Number(item.price || 0);
  const qty = Math.max(1, Number(form.tickets || 1));
  const total = unitPrice * qty;
  const totalLabel = formatCurrencyRWF ? formatCurrencyRWF(total) : `RWF ${Number(total || 0).toLocaleString()}`;

  const videoUrl = getVideoEmbedUrl(item?.video);
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const ownerId = item?.owner ? String(item.owner) : '';
  const isOwnerViewing = viewerId && ownerId && viewerId === ownerId;

  const categoryLabel = item?.category
    ? (typeof t === 'function'
      ? tSafe(`attractionWizard.categories.${item.category}`, String(item.category))
      : String(item.category))
    : '';

  const operatingDays = Array.isArray(item?.operatingHours?.days)
    ? item.operatingHours.days.map(formatDay).filter(Boolean)
    : [];

  const quickFacts = [
    { label: tSafe('attractionDetail.labels.category', 'Category'), value: categoryLabel },
    { label: tSafe('attractionDetail.labels.city', 'City'), value: item?.city },
    { label: tSafe('attractionDetail.labels.country', 'Country'), value: item?.country },
    { label: tSafe('attractionDetail.labels.duration', 'Duration'), value: item?.duration },
    { label: tSafe('attractionDetail.labels.capacity', 'Capacity'), value: item?.capacity },
    { label: tSafe('attractionDetail.labels.minGuests', 'Minimum guests'), value: item?.minGuests },
    { label: tSafe('attractionDetail.labels.minAge', 'Minimum age'), value: item?.minAge },
    { label: tSafe('attractionDetail.labels.bookingRequired', 'Booking required'), value: yesNo(item?.bookingRequired) },
    { label: tSafe('attractionDetail.labels.guideAvailable', 'Guide available'), value: yesNo(item?.guideAvailable) },
    { label: tSafe('attractionDetail.labels.audioGuideLanguages', 'Audio guide languages'), value: item?.audioGuideLanguages },
    { label: tSafe('attractionDetail.labels.safetyEquipment', 'Safety equipment'), value: item?.safetyEquipment },
    { label: tSafe('attractionDetail.labels.seasonality', 'Seasonality'), value: item?.seasonality },
  ].filter(({ value }) => value != null && String(value).trim() !== '');

  const locationDetails = [
    { label: tSafe('attractionDetail.labels.address', 'Address / meeting point'), value: item?.location },
    { label: tSafe('attractionDetail.labels.gps', 'GPS'), value: item?.gps },
    { label: tSafe('attractionDetail.labels.landmarks', 'Landmarks'), value: item?.landmarks },
    { label: tSafe('attractionDetail.labels.directions', 'Directions'), value: item?.directions },
    { label: tSafe('attractionDetail.labels.latitude', 'Latitude'), value: Number.isFinite(lat) ? String(lat) : '' },
    { label: tSafe('attractionDetail.labels.longitude', 'Longitude'), value: Number.isFinite(lng) ? String(lng) : '' },
  ].filter(({ value }) => value != null && String(value).trim() !== '');

  const policies = [
    { label: tSafe('attractionDetail.labels.paymentMethods', 'Payment methods'), value: item?.paymentMethods },
    { label: tSafe('attractionDetail.labels.cancellationPolicy', 'Cancellation policy'), value: item?.cancellationPolicy },
    { label: tSafe('attractionDetail.labels.refundPolicy', 'Refund policy'), value: item?.refundPolicy },
  ].filter(({ value }) => value != null && String(value).trim() !== '');

  const rulesInfo = [
    { label: tSafe('attractionDetail.labels.rules', 'Rules'), value: item?.rules },
    { label: tSafe('attractionDetail.labels.dressCode', 'Dress code'), value: item?.dressCode },
    { label: tSafe('attractionDetail.labels.safetyInstructions', 'Safety instructions'), value: item?.safetyInstructions },
    { label: tSafe('attractionDetail.labels.liability', 'Liability'), value: item?.liability },
  ].filter(({ value }) => value != null && String(value).trim() !== '');

  const contactDetails = [
    { label: tSafe('attractionDetail.labels.contactName', 'Contact name'), value: item?.contactName },
    { label: tSafe('attractionDetail.labels.contactPhone', 'Contact phone'), value: item?.contactPhone, type: 'phone' },
    { label: tSafe('attractionDetail.labels.contactEmail', 'Contact email'), value: item?.contactEmail, type: 'email' },
    { label: tSafe('attractionDetail.labels.contactWebsite', 'Website'), value: item?.contactWebsite, type: 'url' },
    { label: tSafe('attractionDetail.labels.contactEmergency', 'Emergency contact'), value: item?.contactEmergency },
  ].filter(({ value }) => value != null && String(value).trim() !== '');

  const nextFromStep1 = () => {
    if (!form.visitDate) { toast.error(tSafe('attractionDetail.toasts.selectVisitDate', 'Select visit date')); return; }
    if (Array.isArray(availabilityInfo?.slots) && availabilityInfo.slots.length > 0 && !String(form.timeSlot || '').trim()) {
      toast.error(tSafe('attractionDetail.toasts.selectTimeSlot', 'Select a time slot'));
      return;
    }
    if (Number(form.tickets || 1) < 1) { toast.error(tSafe('attractionDetail.toasts.ticketsMin1', 'Tickets must be at least 1')); return; }
    setStep(2);
  };

  const nextFromStep2 = () => {
    if (!String(contact.phone || '').trim()) { toast.error(tSafe('attractionDetail.toasts.enterPhoneNumber', 'Enter phone number')); return; }
    setStep(3);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="w-full h-72 bg-gray-100 rounded overflow-hidden">
            {item.images?.[0] ? (
              <img src={imgUrl(item.images[0])} className="w-full h-full object-cover" />
            ) : item.image ? (
              <img src={imgUrl(item.image)} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(item.images || []).slice(1,9).map((im, i) => (
              <img key={i} src={imgUrl(im)} className="w-full h-20 object-cover rounded" />
            ))}
          </div>

          <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
            <h1 className="text-2xl font-bold text-[#4b2a00]">{item.name}</h1>
            <div className="mt-1 text-gray-600 flex items-center gap-2">
              <FaMapMarkerAlt className="text-[#a06b42]" />
              <span>{item.location}</span>
            </div>
            {item.description && (
              <p className="mt-3 text-gray-700 text-sm leading-relaxed">{item.description}</p>
            )}
          </div>

          {(quickFacts.length > 0 || (item?.amenities && item.amenities.length > 0)) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickFacts.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
                  <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.sections.quickInfo', 'Quick info')}</div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {quickFacts.map((f) => (
                      <div key={f.label} className="flex items-start justify-between gap-3">
                        <span className="text-gray-600">{f.label}</span>
                        <span className="text-[#4b2a00] font-medium text-right">{String(f.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(item?.amenities) && item.amenities.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
                  <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.sections.amenities', 'Amenities')}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.amenities.map((a, idx) => (
                      <span
                        key={`${a}-${idx}`}
                        className="px-2 py-1 rounded-full text-xs bg-[#f6e9d8] text-[#4b2a00] border border-[#d4c4b0]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(item?.operatingHours?.open || item?.operatingHours?.close || operatingDays.length > 0 || (timeSlots && timeSlots.length > 0) || item?.openingDays) && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.sections.operatingHours', 'Operating hours')}</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {item?.operatingHours?.open && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-600">{tSafe('attractionDetail.labels.open', 'Opens')}</span>
                    <span className="text-[#4b2a00] font-medium text-right">{item.operatingHours.open}</span>
                  </div>
                )}
                {item?.operatingHours?.close && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-600">{tSafe('attractionDetail.labels.close', 'Closes')}</span>
                    <span className="text-[#4b2a00] font-medium text-right">{item.operatingHours.close}</span>
                  </div>
                )}
                {operatingDays.length > 0 && (
                  <div className="sm:col-span-2 flex items-start justify-between gap-3">
                    <span className="text-gray-600">{tSafe('attractionDetail.labels.days', 'Days')}</span>
                    <span className="text-[#4b2a00] font-medium text-right">{operatingDays.join(', ')}</span>
                  </div>
                )}
                {item?.openingDays && (
                  <div className="sm:col-span-2 flex items-start justify-between gap-3">
                    <span className="text-gray-600">{tSafe('attractionDetail.labels.openingDays', 'Opening days')}</span>
                    <span className="text-[#4b2a00] font-medium text-right">{item.openingDays}</span>
                  </div>
                )}
                {timeSlots && timeSlots.length > 0 && (
                  <div className="sm:col-span-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-600">{tSafe('attractionDetail.labels.timeSlots', 'Suggested time slots')}</span>
                      <span className="text-[#4b2a00] font-medium text-right">{timeSlots.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(locationDetails.length > 0) && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.sections.locationDetails', 'Location details')}</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {locationDetails.map((f) => (
                  <div key={f.label} className="flex items-start justify-between gap-3">
                    <span className="text-gray-600">{f.label}</span>
                    <span className="text-[#4b2a00] font-medium text-right">{String(f.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.video', 'Video')}</div>
              <div className="mt-3 w-full aspect-video bg-gray-100 rounded overflow-hidden">
                <iframe
                  src={videoUrl}
                  title={tSafe('attractionDetail.videoTitle', 'Attraction video')}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {(policies.length > 0) && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.sections.policies', 'Policies')}</div>
              <div className="mt-3 space-y-3 text-sm">
                {policies.map((p) => (
                  <div key={p.label} className="bg-[#fff7ed] border border-[#f6e9d8] rounded p-3">
                    <div className="text-xs font-semibold text-[#4b2a00]">{p.label}</div>
                    <div className="mt-1 text-gray-700 whitespace-pre-line">{String(p.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(rulesInfo.length > 0) && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.sections.rules', 'Rules & important info')}</div>
              <div className="mt-3 space-y-3 text-sm">
                {rulesInfo.map((p) => (
                  <div key={p.label} className="bg-[#fff7ed] border border-[#f6e9d8] rounded p-3">
                    <div className="text-xs font-semibold text-[#4b2a00]">{p.label}</div>
                    <div className="mt-1 text-gray-700 whitespace-pre-line">{String(p.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(contactDetails.length > 0) && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.sections.contact', 'Contact')}</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {contactDetails.map((f) => {
                  let href = null;
                  if (f.type === 'phone') href = `tel:${String(f.value).trim()}`;
                  if (f.type === 'email') href = `mailto:${String(f.value).trim()}`;
                  if (f.type === 'url') {
                    const raw = String(f.value).trim();
                    href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                  }
                  return (
                    <div key={f.label} className="flex items-start justify-between gap-3">
                      <span className="text-gray-600">{f.label}</span>
                      {href ? (
                        <a
                          href={href}
                          target={f.type === 'url' ? '_blank' : undefined}
                          rel={f.type === 'url' ? 'noreferrer' : undefined}
                          className="text-[#a06b42] font-medium text-right hover:underline break-all"
                        >
                          {String(f.value)}
                        </a>
                      ) : (
                        <span className="text-[#4b2a00] font-medium text-right break-all">{String(f.value)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasCoords && (
            <div className="mt-4 bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.locationMap', 'Location map')}</div>
              <div className="mt-3 w-full h-64 rounded overflow-hidden">
                <Map
                  initialViewState={{ latitude: lat, longitude: lng, zoom: 13 }}
                  mapboxAccessToken={mapboxAccessToken}
                  mapStyle="mapbox://styles/mapbox/navigation-day-v1"
                  onLoad={(evt) => applyGoogleLikeStyle(evt.target)}
                  attributionControl={false}
                  scrollZoom={false}
                  dragPan={false}
                  dragRotate={false}
                  doubleClickZoom={false}
                  touchZoomRotate={false}
                  keyboard={false}
                  style={{ height: '100%', width: '100%' }}
                  reuseMaps
                >
                  <Marker longitude={lng} latitude={lat} anchor="bottom">
                    <div style={{ transform: 'translateY(-6px)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 32 48" fill="none">
                        <path d="M16 2C10 2 5 7 5 13c0 8 11 18 11 18s11-10 11-18C27 7 22 2 16 2z" fill="#FF5A5F"/>
                        <circle cx="16" cy="13" r="4" fill="white"/>
                      </svg>
                    </div>
                  </Marker>
                </Map>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-4 border border-[#f6e9d8]">
            {item.price != null && (
              <div className="text-xl font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(unitPrice) : `RWF ${unitPrice.toLocaleString()}`}</div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600">{tSafe('attractionDetail.stepOf', 'Step {step} of {totalSteps}').replace('{step}', String(step)).replace('{totalSteps}', '3')}</div>
              <div className="text-sm font-semibold text-[#4b2a00]">{tSafe('attractionDetail.total', 'Total')}: {totalLabel}</div>
            </div>

            {step === 1 && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div>
                  <label className="text-sm text-gray-700">{tSafe('attractionDetail.visitDate', 'Visit date')}</label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      min={today}
                      value={form.visitDate}
                      onChange={e => setForm({ ...form, visitDate: e.target.value })}
                      className="w-full pl-10 px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">{tSafe('attractionDetail.timeSlot', 'Time slot')}</label>
                  <select
                    value={form.timeSlot}
                    onChange={e => {
                      setAvailable(null);
                      setAvailabilityInfo(null);
                      setForm({ ...form, timeSlot: e.target.value });
                    }}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">{tSafe('attractionDetail.selectSlot', 'Select a slot')}</option>
                    {Array.isArray(availabilityInfo?.slots) ? availabilityInfo.slots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    )) : null}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">{tSafe('attractionDetail.slotsHint', 'Click "Check availability" to load slots for the selected date.')}</div>
                </div>

                <div>
                  <label className="text-sm text-gray-700">{tSafe('attractionDetail.tickets', 'Tickets')}</label>
                  <input
                    type="number"
                    min={1}
                    value={form.tickets}
                    onChange={e => setForm({ ...form, tickets: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={checkAvailability}
                    disabled={checking}
                    className="px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                  >
                    {checking ? tSafe('attractionDetail.checking', 'Checking...') : tSafe('attractionDetail.checkAvailability', 'Check availability')}
                  </button>
                  {available !== null && (
                    <span className={`text-sm ${available ? 'text-green-600' : 'text-red-600'}`}>
                      {available ? tSafe('attractionDetail.available', 'Available') : tSafe('attractionDetail.notAvailable', 'Not available')}
                    </span>
                  )}
                </div>

                {availabilityInfo?.reason === 'closed' && (
                  <div className="text-xs text-red-600">{tSafe('attractionDetail.closedOnDate', 'This attraction is closed on the selected date.')}</div>
                )}
                {availabilityInfo?.reason === 'slot_required' && (
                  <div className="text-xs text-red-600">{tSafe('attractionDetail.slotRequired', 'Please select a time slot.')}</div>
                )}
                {availabilityInfo?.reason === 'invalid_slot' && (
                  <div className="text-xs text-red-600">{tSafe('attractionDetail.invalidSlot', 'Selected time slot is not valid for this attraction.')}</div>
                )}
                {availabilityInfo?.reason === 'capacity' && (
                  <div className="text-xs text-red-600">
                    {tSafe('attractionDetail.notEnoughCapacityInline', 'Not enough remaining capacity')}{Number.isFinite(Number(availabilityInfo?.remaining)) ? ` (${tSafe('attractionDetail.remaining', 'remaining')}: ${Math.max(0, Number(availabilityInfo?.remaining))})` : ''}.
                  </div>
                )}
                <button
                  type="button"
                  onClick={nextFromStep1}
                  className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                >
                  {tSafe('attractionDetail.continue', 'Continue')}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-700">{tSafe('attractionDetail.firstName', 'First name')}</label>
                    <input
                      value={contact.firstName}
                      onChange={e => setContact({ ...contact, firstName: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">{tSafe('attractionDetail.lastName', 'Last name')}</label>
                    <input
                      value={contact.lastName}
                      onChange={e => setContact({ ...contact, lastName: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">{tSafe('attractionDetail.email', 'Email')}</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={e => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">{tSafe('attractionDetail.phoneNumber', 'Phone number *')}</label>
                  <input
                    value={contact.phone}
                    onChange={e => setContact({ ...contact, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">{tSafe('attractionDetail.notesOptional', 'Notes (optional)')}</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded border"
                  >
                    {tSafe('attractionDetail.back', 'Back')}
                  </button>
                  <button
                    type="button"
                    onClick={nextFromStep2}
                    className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                  >
                    {tSafe('attractionDetail.continue', 'Continue')}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>{tSafe('attractionDetail.visitDate', 'Visit date')}</span>
                    <span className="font-semibold text-gray-900">{form.visitDate}</span>
                  </div>
                  {form.timeSlot ? (
                    <div className="flex items-center justify-between mt-1">
                      <span>{tSafe('attractionDetail.timeSlot', 'Time slot')}</span>
                      <span className="font-semibold text-gray-900">{form.timeSlot}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between mt-1">
                    <span>{tSafe('attractionDetail.tickets', 'Tickets')}</span>
                    <span className="font-semibold text-gray-900">{qty}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>{tSafe('attractionDetail.total', 'Total')}</span>
                    <span className="font-semibold text-gray-900">{totalLabel}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`px-3 py-2 rounded border ${paymentMethod === 'cash'
                      ? 'bg-[#a06b42] text-white border-[#a06b42]'
                      : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}
                  >
                    {tSafe('attractionDetail.payOnArrival', 'Pay on Arrival')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mtn_mobile_money')}
                    className={`px-3 py-2 rounded border ${paymentMethod === 'mtn_mobile_money'
                      ? 'bg-[#a06b42] text-white border-[#a06b42]'
                      : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}
                  >
                    {tSafe('attractionDetail.mtnMobileMoney', 'MTN Mobile Money')}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded border"
                  >
                    {tSafe('attractionDetail.back', 'Back')}
                  </button>
                  <button
                    type="button"
                    onClick={createBooking}
                    disabled={booking || isOwnerViewing}
                    className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                  >
                    {booking ? tSafe('attractionDetail.booking', 'Booking...') : tSafe('attractionDetail.confirmBook', 'Confirm & book')}
                  </button>
                </div>

                {isOwnerViewing && (
                  <div className="text-xs text-red-600">{tSafe('attractionDetail.cantBookOwn', 'You can’t book your own attraction.')}</div>
                )}

                {item?.owner && (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages?to=${item.owner}`)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded border"
                  >
                    {tSafe('attractionDetail.messageHost', 'Message host')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
