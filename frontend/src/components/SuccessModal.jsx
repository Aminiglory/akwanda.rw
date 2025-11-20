import React from 'react';

export default function SuccessModal({ open, title = 'Success', message = 'Action completed successfully.', onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-[92vw] max-w-md p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-600">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-2.59a.75.75 0 10-1.22-.86l-3.6 5.1-1.98-2.31a.75.75 0 10-1.14.98l2.63 3.07a.75.75 0 001.2-.06l4.11-5.92z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <div className="mt-1 text-sm text-gray-700">{message}</div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">OK</button>
        </div>
      </div>
    </div>
  );
}
