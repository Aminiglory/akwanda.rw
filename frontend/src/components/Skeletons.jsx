import React from 'react';

export const CardGridSkeleton = ({ count = 6 }) => {
  const items = Array.from({ length: count });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-44 bg-gray-200 animate-pulse" />
          <div className="p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
            <div className="flex items-center gap-4 mt-3">
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
            </div>
            <div className="h-8 bg-gray-200 rounded mt-4 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ListItemSkeleton = ({ rows = 6 }) => {
  const items = Array.from({ length: rows });
  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
};

export const ChatBubbleSkeleton = ({ rows = 6 }) => {
  const items = Array.from({ length: rows });
  return (
    <div className="space-y-4">
      {items.map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className="w-3/4 sm:w-2/3 lg:w-1/2">
            <div className="h-6 bg-gray-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};
