import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaCalendarAlt, FaMapMarkerAlt, FaBed } from 'react-icons/fa';

const BookingSuccess = () => {
  const [params] = useSearchParams();
  const bookingId = params.get('id');
  const property = params.get('property') || 'Your stay';
  const date = params.get('date');
  const location = params.get('loc');
  const nights = params.get('nights');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="shrink-0 mx-auto sm:mx-0 w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <FaCheckCircle className="text-4xl text-green-600" />
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold text-gray-900">Booking Confirmed</h1>
            <p className="text-gray-600 mt-1">Thank you! Your reservation has been secured successfully.</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bookingId && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <FaCheckCircle className="text-blue-600" />
                  <div className="truncate">
                    <div className="text-sm text-gray-500">Reference</div>
                    <div className="font-medium text-gray-900 truncate">{bookingId}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <FaBed className="text-blue-600" />
                <div className="truncate">
                  <div className="text-sm text-gray-500">Property</div>
                  <div className="font-medium text-gray-900 truncate">{property}</div>
                </div>
              </div>
              {location && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <FaMapMarkerAlt className="text-blue-600" />
                  <div className="truncate">
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium text-gray-900 truncate">{location}</div>
                  </div>
                </div>
              )}
              {date && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <FaCalendarAlt className="text-blue-600" />
                  <div className="truncate">
                    <div className="text-sm text-gray-500">Date</div>
                    <div className="font-medium text-gray-900 truncate">{date}</div>
                  </div>
                </div>
              )}
              {nights && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <FaCalendarAlt className="text-blue-600" />
                  <div className="truncate">
                    <div className="text-sm text-gray-500">Nights</div>
                    <div className="font-medium text-gray-900 truncate">{nights}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to={bookingId ? `/booking-confirmation/${bookingId}` : '/user-dashboard'} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto text-center">View Booking</Link>
              <Link to="/" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 w-full sm:w-auto text-center">Go Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
