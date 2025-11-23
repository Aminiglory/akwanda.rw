import React, { useState, useEffect } from 'react';
import { getImageLoadStats } from '../utils/imageUtils';

const ImageLoadingBar = ({ 
  isVisible = true, 
  totalImages = 0, 
  onComplete = null,
  className = '',
  showPercentage = true,
  autoHide = true,
  hideDelay = 1000
}) => {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!isVisible || totalImages === 0) {
      setShouldShow(false);
      return;
    }

    let animationFrame;
    let hideTimeout;

    const updateProgress = () => {
      const stats = getImageLoadStats();
      const totalProcessed = stats.loaded + stats.failed;
      const currentProgress = totalImages > 0 ? Math.min((totalProcessed / totalImages) * 100, 100) : 0;
      
      setProgress(currentProgress);
      
      if (totalProcessed > 0 && !isLoading) {
        setIsLoading(true);
        setShouldShow(true);
      }
      
      if (currentProgress >= 100) {
        setIsComplete(true);
        setIsLoading(false);
        
        if (onComplete) {
          onComplete();
        }
        
        if (autoHide) {
          hideTimeout = setTimeout(() => {
            setShouldShow(false);
            setIsComplete(false);
            setProgress(0);
          }, hideDelay);
        }
      } else if (totalProcessed < totalImages) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    // Start monitoring
    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [isVisible, totalImages, onComplete, autoHide, hideDelay, isLoading]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-[99999] ${className}`}>
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  Loading images...
                </span>
                {showPercentage && (
                  <span className="text-sm font-semibold text-[#a06b42]">
                    {Math.round(progress)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    isComplete 
                      ? 'bg-green-500' 
                      : 'bg-gradient-to-r from-[#a06b42] to-[#c59b77]'
                  }`}
                  style={{ 
                    width: `${progress}%`,
                    transform: `translateX(${progress < 100 ? '-2px' : '0px'})`,
                  }}
                />
              </div>
            </div>
            
            {/* Loading spinner */}
            {isLoading && !isComplete && (
              <div className="flex-shrink-0">
                <div className="w-5 h-5 border-2 border-[#a06b42] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* Success checkmark */}
            {isComplete && (
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLoadingBar;
