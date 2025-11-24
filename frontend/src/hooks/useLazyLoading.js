// React Hook for Universal Lazy Loading
import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  initializeLazyLoading, 
  createLazyImage, 
  convertToLazyLoading,
  preloadCriticalImages,
  getFallbackImage,
  getLazyLoadingStats
} from '../utils/lazyLoading';

/**
 * Main lazy loading hook for React components
 */
export const useLazyLoading = (options = {}) => {
  const {
    autoInit = true,
    convertExisting = true,
    preloadCritical = [],
    onStatsChange
  } = options;

  const [stats, setStats] = useState(getLazyLoadingStats());
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef(null);

  // Initialize lazy loading system
  useEffect(() => {
    if (autoInit && !isInitialized) {
      initializeLazyLoading();
      setIsInitialized(true);

      // Convert existing images if requested
      if (convertExisting) {
        setTimeout(() => {
          convertToLazyLoading('img:not([data-lazy-processed])');
        }, 100);
      }

      // Preload critical images if provided
      if (preloadCritical.length > 0) {
        preloadCriticalImages(preloadCritical).then(results => {
          console.log('Critical images preloaded:', results);
        });
      }
    }
  }, [autoInit, convertExisting, preloadCritical, isInitialized]);

  // Update stats periodically
  useEffect(() => {
    if (onStatsChange) {
      intervalRef.current = setInterval(() => {
        const newStats = getLazyLoadingStats();
        setStats(newStats);
        onStatsChange(newStats);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [onStatsChange]);

  return {
    stats,
    isInitialized
  };
};

/**
 * Hook for creating lazy-loaded images
 */
export const useLazyImage = (config) => {
  const {
    src,
    alt = '',
    className = '',
    category = 'default',
    size = 'medium',
    eager = false,
    onLoad,
    onError
  } = config;

  const [imageElement, setImageElement] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState(null);

  useEffect(() => {
    if (!src) return;

    const img = createLazyImage({
      src,
      alt,
      className,
      category,
      size,
      eager
    });

    // Add load event listener
    const handleLoad = () => {
      setIsLoaded(true);
      setHasError(false);
      onLoad && onLoad();
    };

    // Add error event listener
    const handleError = () => {
      setHasError(true);
      const fallback = getFallbackImage(category, size);
      setFallbackSrc(fallback);
      img.src = fallback;
      onError && onError();
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    setImageElement(img);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src, alt, className, category, size, eager, onLoad, onError]);

  return {
    imageElement,
    isLoaded,
    hasError,
    fallbackSrc
  };
};

/**
 * Hook for lazy loading within a specific container
 */
export const useContainerLazyLoading = (containerRef, options = {}) => {
  const { threshold = 0.1, rootMargin = '50px' } = options;
  const [visibleImages, setVisibleImages] = useState(new Set());

  useEffect(() => {
    if (!containerRef.current || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              setVisibleImages(prev => new Set([...prev, src]));
              observer.unobserve(img);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin,
        threshold
      }
    );

    // Observe all images with data-src in the container
    const images = containerRef.current.querySelectorAll('img[data-src]');
    images.forEach(img => observer.observe(img));

    return () => {
      observer.disconnect();
    };
  }, [containerRef, threshold, rootMargin]);

  return { visibleImages };
};

/**
 * Hook for progressive image loading (low-res to high-res)
 */
export const useProgressiveImage = (lowResSrc, highResSrc, options = {}) => {
  const { category = 'default', onHighResLoad } = options;
  const [currentSrc, setCurrentSrc] = useState(lowResSrc);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!highResSrc) {
      setCurrentSrc(lowResSrc);
      setIsLoading(false);
      return;
    }

    // Start with low-res image
    setCurrentSrc(lowResSrc);
    setIsLoading(true);

    // Preload high-res image
    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(highResSrc);
      setIsHighResLoaded(true);
      setIsLoading(false);
      onHighResLoad && onHighResLoad();
    };

    img.onerror = () => {
      // If high-res fails, use fallback
      const fallback = getFallbackImage(category, 'medium');
      setCurrentSrc(fallback);
      setIsLoading(false);
    };

    img.src = highResSrc;

  }, [lowResSrc, highResSrc, category, onHighResLoad]);

  return {
    src: currentSrc,
    isHighResLoaded,
    isLoading
  };
};

/**
 * Hook for batch image preloading
 */
export const useImagePreloader = () => {
  const [preloadStats, setPreloadStats] = useState({
    total: 0,
    loaded: 0,
    failed: 0,
    isPreloading: false
  });

  const preloadImages = useCallback(async (imageUrls, options = {}) => {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return [];
    }

    setPreloadStats({
      total: imageUrls.length,
      loaded: 0,
      failed: 0,
      isPreloading: true
    });

    const results = await preloadCriticalImages(imageUrls, options);
    
    const loaded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    setPreloadStats({
      total: imageUrls.length,
      loaded,
      failed,
      isPreloading: false
    });

    return results;
  }, []);

  return {
    preloadImages,
    preloadStats
  };
};

/**
 * Hook for responsive image loading based on device capabilities
 */
export const useResponsiveImage = (imageSources, options = {}) => {
  const { category = 'default', fallbackSize = 'medium' } = options;
  const [selectedSrc, setSelectedSrc] = useState(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState(null);

  useEffect(() => {
    // Detect device capabilities
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowConnection = connection && (
      connection.effectiveType === 'slow-2g' || 
      connection.effectiveType === '2g'
    );
    const isLowEndDevice = navigator.hardwareConcurrency <= 2;
    const isMobile = window.innerWidth < 768;

    const capabilities = {
      isSlowConnection,
      isLowEndDevice,
      isMobile,
      isHighDPI: window.devicePixelRatio > 1.5
    };

    setDeviceCapabilities(capabilities);

    // Select appropriate image source
    let selectedSource;
    
    if (capabilities.isSlowConnection || capabilities.isLowEndDevice) {
      selectedSource = imageSources.small || imageSources.medium || imageSources.large;
    } else if (capabilities.isMobile) {
      selectedSource = imageSources.medium || imageSources.large || imageSources.small;
    } else {
      selectedSource = imageSources.large || imageSources.medium || imageSources.small;
    }

    // Fallback if no source available
    if (!selectedSource) {
      selectedSource = getFallbackImage(category, fallbackSize);
    }

    setSelectedSrc(selectedSource);

  }, [imageSources, category, fallbackSize]);

  return {
    src: selectedSrc,
    deviceCapabilities
  };
};

export default {
  useLazyLoading,
  useLazyImage,
  useContainerLazyLoading,
  useProgressiveImage,
  useImagePreloader,
  useResponsiveImage
};
