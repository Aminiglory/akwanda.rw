import React from 'react';

export default function ReceiptPreview({
  title = 'Receipt',
  lines = [],
  onClose,
  onPrint,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-[340px] max-w-full p-4">
        <div className="text-center mb-2">
          <div className="font-bold text-sm">AKWANDA.rw</div>
          <div className="text-xs text-gray-600">{title}</div>
        </div>
        <div className="text-xs text-gray-700 space-y-1">
          {lines.map((row, idx) => (
            row === '---'
              ? <div key={idx} className="border-t my-2" />
              : <div key={idx}><span className="text-gray-500">{row.label}:</span> {row.value}</div>
          ))}
        </div>
        <div className="border-t my-2"></div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={onPrint} className="px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded text-xs">Print</button>
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 text-gray-800 rounded text-xs">Close</button>
        </div>
      </div>
    </div>
  );
}
