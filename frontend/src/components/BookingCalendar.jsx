import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaPlus, FaEdit, FaTrash, FaEye, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookingCalendar = ({ propertyId, onBookingSelect, initialDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    fetchBookings();
  }, [currentDate, propertyId]);

  // React to initialDate changes (e.g., navigate from navbar: next month)
  useEffect(() => {
    if (initialDate instanceof Date && !isNaN(initialDate)) {
      const a = currentDate;
      if (a.getFullYear() !== initialDate.getFullYear() || a.getMonth() !== initialDate.getMonth()) {
        setCurrentDate(new Date(initialDate));
      }
    }
  }, [initialDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bookings?propertyId=${propertyId}&month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    return bookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      // Treat checkout day as available (end-exclusive)
      return date >= checkIn && date < checkOut;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ended':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const navigateWeek = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * 7));
      return newDate;
    });
  };

  const navigateDay = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + direction);
      return newDate;
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Month Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
            <select
              className="px-2 py-1 border rounded"
              value={currentDate.getMonth()}
              onChange={(e)=>{
                const m = Number(e.target.value);
                setCurrentDate(prev=> new Date(prev.getFullYear(), m, 1));
              }}
            >
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=>(
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              className="px-2 py-1 border rounded"
              value={currentDate.getFullYear()}
              onChange={(e)=>{
                const y = Number(e.target.value);
                setCurrentDate(prev=> new Date(y, prev.getMonth(), 1));
              }}
            >
              {Array.from({length: 11}, (_,k)=> currentDate.getFullYear()-5 + k).map(y=>(
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="p-4 text-center font-bold text-gray-700 neu-card-inset uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[140px] p-3 neu-card-inset cursor-pointer transition-all duration-300 hover:scale-105 ${
                  date ? 'hover:neu-card' : 'bg-gray-100'
                } ${
                  isToday ? 'neu-card bg-blue-50' : ''
                } ${
                  isSelected ? 'neu-card bg-blue-100' : ''
                }`}
                onClick={() => date && setSelectedDate(date)}
              >
                {date && (
                  <>
                    <div className={`text-lg font-bold mb-2 transition-colors ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-2">
                      {dayBookings.slice(0, 2).map(booking => (
                        <div
                          key={booking._id}
                          className={`text-xs p-2 neu-card-inset cursor-pointer hover:neu-card transition-all duration-300 ${getStatusColor(booking.status)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingSelect && onBookingSelect(booking);
                          }}
                        >
                          <div className="font-semibold truncate uppercase tracking-wide">{booking.guest?.firstName} {booking.guest?.lastName}</div>
                          <div className="text-xs opacity-75 font-medium">RWF {booking.totalAmount?.toLocaleString()}</div>
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-xs text-gray-500 text-center font-semibold">
                          +{dayBookings.length - 2} MORE
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="space-y-4">
        {/* Week Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              This Week
            </button>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div key={index} className="space-y-2">
                <div className={`text-center p-2 rounded-lg ${
                  isToday ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-700'
                }`}>
                  <div className="text-sm font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-lg font-bold">{date.getDate()}</div>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {dayBookings.map(booking => (
                    <div
                      key={booking._id}
                      className={`p-2 rounded border ${getStatusColor(booking.status)} cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() => onBookingSelect && onBookingSelect(booking)}
                    >
                      <div className="text-sm font-medium">{booking.guest?.firstName} {booking.guest?.lastName}</div>
                      <div className="text-xs opacity-75">RWF {booking.totalAmount?.toLocaleString()}</div>
                      <div className="text-xs opacity-75">{booking.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();
    
    return (
      <div className="space-y-4">
        {/* Day Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{formatDate(currentDate)}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateDay(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Day Bookings */}
        <div className="space-y-4">
          {dayBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaCalendarAlt className="text-4xl mx-auto mb-4 text-gray-300" />
              <p>No bookings for this day</p>
            </div>
          ) : (
            dayBookings.map(booking => (
              <div
                key={booking._id}
                className={`p-4 rounded-lg border ${getStatusColor(booking.status)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onBookingSelect && onBookingSelect(booking)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{booking.guest?.firstName} {booking.guest?.lastName}</h3>
                    <p className="text-sm opacity-75">{booking.guest?.email}</p>
                    <p className="text-sm opacity-75">{booking.guest?.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">RWF {booking.totalAmount?.toLocaleString()}</div>
                    <div className="text-sm opacity-75">{booking.status}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span>Check-in: {new Date(booking.checkIn).toLocaleDateString()}</span>
                    <span>Check-out: {new Date(booking.checkOut).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded">
                      <FaEye />
                    </button>
                    <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded">
                      <FaEdit />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="neu-card p-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase">BOOKING CALENDAR</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode('month')}
            className={`px-6 py-3 rounded-xl transition-all duration-300 font-semibold tracking-wide ${
              viewMode === 'month' ? 'btn-primary text-white' : 'neu-btn text-gray-700 hover:text-blue-600'
            }`}
          >
            MONTH
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-6 py-3 rounded-xl transition-all duration-300 font-semibold tracking-wide ${
              viewMode === 'week' ? 'btn-primary text-white' : 'neu-btn text-gray-700 hover:text-blue-600'
            }`}
          >
            WEEK
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-6 py-3 rounded-xl transition-all duration-300 font-semibold tracking-wide ${
              viewMode === 'day' ? 'btn-primary text-white' : 'neu-btn text-gray-700 hover:text-blue-600'
            }`}
          >
            DAY
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}

      {/* Selected Date Info */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">
            Bookings for {formatDate(selectedDate)}
          </h3>
          <div className="space-y-2">
            {getBookingsForDate(selectedDate).map(booking => (
              <div key={booking._id} className="flex items-center justify-between text-sm">
                <span>{booking.guest?.firstName} {booking.guest?.lastName}</span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
