// Universal Lazy Loading Image Component
import React, { useState, useEffect, useRef } from 'react';
import { getFallbackImage } from '../utils/lazyLoading';

const LazyImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  category = 'default',
  size = 'medium',
  eager = false,
  progressive = false,
  lowResSrc = null,
  placeholder = null,
  errorPlaceholder = null,
  onLoad,
  onError,
  width,
  height,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(eager);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Device capability detection
  const getDeviceCapabilities = () => {
    if (typeof window === 'undefined') return { isSlowConnection: false, supportsNativeLazy: false };
    
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowConnection = connection && (
      connection.effectiveType === 'slow-2g' || 
      connection.effectiveType === '2g' ||
      connection.downlink < 1.5
    );
    
    return {
      isSlowConnection,
      supportsNativeLazy: 'loading' in HTMLImageElement.prototype,
      supportsIntersectionObserver: 'IntersectionObserver' in window
    };
  };

  // Initialize intersection observer for manual lazy loading
  useEffect(() => {
    const capabilities = getDeviceCapabilities();
    
    if (eager || !capabilities.supportsIntersectionObserver) {
      setIsInView(true);
      return;
    }

    if (imgRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: capabilities.isSlowConnection ? '10px' : '50px',
          threshold: 0.01
        }
      );

      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [eager]);

  // Handle image loading
  useEffect(() => {
    if (!isInView || !src) return;

    const capabilities = getDeviceCapabilities();
    
    // For progressive loading, start with low-res image
    if (progressive && lowResSrc && !capabilities.isSlowConnection) {
      setCurrentSrc(lowResSrc);
      
      // Preload high-res image
      const highResImg = new Image();
      highResImg.onload = () => {
        setCurrentSrc(src);
        setIsLoaded(true);
        onLoad && onLoad();
      };
      highResImg.onerror = handleImageError;
      highResImg.src = src;
    } else {
      // Direct loading
      setCurrentSrc(src);
    }
  }, [isInView, src, progressive, lowResSrc, onLoad]);

  // Handle image load success
  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad && onLoad();
  };

  // Handle image load error
  const handleImageError = () => {
    console.warn(`Image failed to load: ${src}`);
    const fallbackSrc = getFallbackImage(category, size);
    setCurrentSrc(fallbackSrc);
    setHasError(true);
    onError && onError();
  };

  // Render placeholder while loading
  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <div
        className={`lazy-image-placeholder ${className}`}
        style={{
          width: width || '100%',
          height: height || '200px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '14px',
          ...style
        }}
      >
        Loading...
      </div>
    );
  };

  // Render error placeholder
  const renderErrorPlaceholder = () => {
    if (errorPlaceholder) {
      return errorPlaceholder;
    }

    return (
      <div
        className={`lazy-image-error ${className}`}
        style={{
          width: width || '100%',
          height: height || '200px',
          background: '#f5f5f5',
          border: '1px dashed #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '12px',
          ...style
        }}
      >
        Image unavailable
      </div>
    );
  };

  // Don't render anything if no src and not in view
  if (!src && !isInView) {
    return <div ref={imgRef} className={className} style={style} />;
  }

  // Show placeholder while not in view or loading
  if (!isInView || (!currentSrc && !hasError)) {
    return <div ref={imgRef}>{renderPlaceholder()}</div>;
  }

  // Show error placeholder if image failed to load
  if (hasError && !currentSrc) {
    return renderErrorPlaceholder();
  }

  const capabilities = getDeviceCapabilities();

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={className}
        style={style}
        width={width}
        height={height}
        loading={eager ? 'eager' : (capabilities.supportsNativeLazy ? 'lazy' : undefined)}
        decoding="async"
        onLoad={handleImageLoad}
        onError={handleImageError}
        {...props}
      />
    </>
  );
};

// Higher-order component for adding lazy loading to existing images
export const withLazyLoading = (WrappedComponent) => {
  return function LazyWrappedComponent(props) {
    const { src, ...otherProps } = props;
    
    return (
      <LazyImage
        src={src}
        {...otherProps}
      />
    );
  };
};

// Specialized components for different use cases
export const LazyHeroImage = (props) => (
  <LazyImage
    {...props}
    category="hero"
    size="large"
    eager={true}
    progressive={true}
  />
);

export const LazyPropertyImage = (props) => (
  <LazyImage
    {...props}
    category="property"
    size="medium"
    progressive={true}
  />
);

export const LazyAttractionImage = (props) => (
  <LazyImage
    {...props}
    category="attraction"
    size="medium"
  />
);

export const LazyThumbnail = (props) => (
  <LazyImage
    {...props}
    size="small"
    progressive={false}
  />
);

export default LazyImage;
