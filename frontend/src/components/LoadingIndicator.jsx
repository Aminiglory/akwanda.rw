import React from 'react';

const LoadingIndicator = ({ label = 'Loading' }) => {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="akw-loader flex items-end gap-1">
        <div className="akw-loader-bar" />
        <div className="akw-loader-bar" />
        <div className="akw-loader-bar" />
      </div>
      <span className="text-sm font-medium text-[#a06b42] tracking-wide">
        {label}...
      </span>
    </div>
  );
};

export default LoadingIndicator;
