// Universal Lazy Loading System - Works on all devices and browsers
// Handles slow connections, old browsers, and various device capabilities

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Device and connection detection
const getDeviceCapabilities = () => {
  if (typeof window === 'undefined') {
    return { isSlowConnection: false, isLowEndDevice: false, supportsIntersectionObserver: false };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (
    connection.effectiveType === 'slow-2g' || 
    connection.effectiveType === '2g' ||
    connection.downlink < 1.5
  );
  
  const isLowEndDevice = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2;
  const supportsIntersectionObserver = 'IntersectionObserver' in window;
  const supportsNativeLazyLoading = 'loading' in HTMLImageElement.prototype;
  
  return {
    isSlowConnection,
    isLowEndDevice,
    supportsIntersectionObserver,
    supportsNativeLazyLoading,
    isMobile: window.innerWidth < 768,
    isHighDPI: window.devicePixelRatio > 1.5
  };
};

// Global lazy loading state
let lazyLoadingState = {
  observer: null,
  loadedImages: new Set(),
  failedImages: new Set(),
  pendingImages: new Map(),
  isInitialized: false
};

// Fallback images for different categories and sizes
const FALLBACK_IMAGES = {
  hero: {
    small: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=800&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&h=1080&fit=crop&auto=format&q=85'
  },
  property: {
    small: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop&auto=format&q=85'
  },
  attraction: {
    small: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&h=800&fit=crop&auto=format&q=85'
  },
  default: {
    small: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop&auto=format&q=85'
  }
};

/**
 * Get fallback image URL based on category and device capabilities
 */
export const getFallbackImage = (category = 'default', size = 'medium') => {
  const capabilities = getDeviceCapabilities();
  
  // Use smaller images for slow connections or low-end devices
  if (capabilities.isSlowConnection || capabilities.isLowEndDevice) {
    size = 'small';
  }
  
  const categoryImages = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.default;
  return categoryImages[size] || categoryImages.medium;
};

/**
 * Create a placeholder element while image loads
 */
const createPlaceholder = (width, height, category = 'default') => {
  const placeholder = document.createElement('div');
  placeholder.className = 'lazy-image-placeholder';
  placeholder.style.cssText = `
    width: ${width || '100%'};
    height: ${height || '200px'};
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 14px;
  `;
  placeholder.textContent = 'Loading...';
  
  // Add shimmer animation if not already defined
  if (!document.querySelector('#lazy-loading-styles')) {
    const style = document.createElement('style');
    style.id = 'lazy-loading-styles';
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .lazy-image-error {
        background: #f5f5f5;
        color: #999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }
  
  return placeholder;
};

/**
 * Load image with comprehensive error handling and fallbacks
 */
const loadImageWithFallback = (src, category = 'default', size = 'medium') => {
  return new Promise((resolve) => {
    const img = new Image();
    const capabilities = getDeviceCapabilities();
    
    // Set timeout based on connection speed
    const timeout = capabilities.isSlowConnection ? 10000 : 5000;
    
    let timeoutId = setTimeout(() => {
      console.warn(`Image load timeout: ${src}`);
      const fallbackSrc = getFallbackImage(category, size);
      loadFallbackImage(fallbackSrc, resolve);
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      lazyLoadingState.loadedImages.add(src);
      resolve({ success: true, img, src });
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      console.warn(`Image failed to load: ${src}`);
      lazyLoadingState.failedImages.add(src);
      const fallbackSrc = getFallbackImage(category, size);
      loadFallbackImage(fallbackSrc, resolve);
    };
    
    img.src = src;
  });
};

/**
 * Load fallback image with final error handling
 */
const loadFallbackImage = (fallbackSrc, resolve) => {
  const fallbackImg = new Image();
  
  fallbackImg.onload = () => {
    resolve({ success: false, img: fallbackImg, src: fallbackSrc, isFallback: true });
  };
  
  fallbackImg.onerror = () => {
    // Create error placeholder if even fallback fails
    const errorDiv = document.createElement('div');
    errorDiv.className = 'lazy-image-error';
    errorDiv.style.cssText = `
      width: 100%;
      height: 200px;
      background: #f5f5f5;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      border: 1px dashed #ddd;
    `;
    errorDiv.textContent = 'Image unavailable';
    resolve({ success: false, element: errorDiv, src: fallbackSrc, isError: true });
  };
  
  fallbackImg.src = fallbackSrc;
};

/**
 * Intersection Observer implementation for modern browsers
 */
const createIntersectionObserver = () => {
  const capabilities = getDeviceCapabilities();
  
  // Adjust root margin based on connection speed
  const rootMargin = capabilities.isSlowConnection ? '10px' : '50px';
  
  return new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        const category = img.dataset.category || 'default';
        const size = img.dataset.size || 'medium';
        
        if (src && !lazyLoadingState.loadedImages.has(src)) {
          // Show placeholder
          const placeholder = createPlaceholder(img.offsetWidth, img.offsetHeight, category);
          img.parentNode?.insertBefore(placeholder, img);
          
          try {
            const result = await loadImageWithFallback(src, category, size);
            
            if (result.img) {
              // Copy attributes from original img to loaded img
              result.img.alt = img.alt;
              result.img.className = img.className;
              result.img.style.cssText = img.style.cssText;
              
              // Replace placeholder with loaded image
              if (placeholder.parentNode) {
                placeholder.parentNode.replaceChild(result.img, placeholder);
              }
            } else if (result.element) {
              // Replace with error element
              if (placeholder.parentNode) {
                placeholder.parentNode.replaceChild(result.element, placeholder);
              }
            }
            
            // Remove original img element
            if (img.parentNode) {
              img.parentNode.removeChild(img);
            }
            
          } catch (error) {
            console.error('Error loading image:', error);
            placeholder.textContent = 'Failed to load';
            placeholder.className = 'lazy-image-error';
          }
        }
        
        lazyLoadingState.observer?.unobserve(img);
      }
    });
  }, {
    rootMargin,
    threshold: 0.01
  });
};

/**
 * Fallback lazy loading for browsers without Intersection Observer
 */
const fallbackLazyLoading = () => {
  const loadVisibleImages = () => {
    const images = document.querySelectorAll('img[data-src]');
    
    images.forEach(async (img) => {
      const rect = img.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight + 50 && rect.bottom > -50;
      
      if (isVisible) {
        const src = img.dataset.src;
        const category = img.dataset.category || 'default';
        const size = img.dataset.size || 'medium';
        
        if (src && !lazyLoadingState.loadedImages.has(src)) {
          try {
            const result = await loadImageWithFallback(src, category, size);
            
            if (result.img) {
              img.src = result.img.src;
              img.removeAttribute('data-src');
            }
          } catch (error) {
            console.error('Fallback lazy loading error:', error);
            img.src = getFallbackImage(category, size);
            img.removeAttribute('data-src');
          }
        }
      }
    });
  };
  
  // Load visible images on scroll and resize
  window.addEventListener('scroll', loadVisibleImages, { passive: true });
  window.addEventListener('resize', loadVisibleImages, { passive: true });
  
  // Initial load
  loadVisibleImages();
};

/**
 * Initialize universal lazy loading system
 */
export const initializeLazyLoading = () => {
  if (lazyLoadingState.isInitialized) {
    console.log('Lazy loading already initialized');
    return;
  }
  
  const capabilities = getDeviceCapabilities();
  console.log('Device capabilities:', capabilities);
  
  if (capabilities.supportsIntersectionObserver) {
    console.log('Using Intersection Observer for lazy loading');
    lazyLoadingState.observer = createIntersectionObserver();
    
    // Observe existing images
    document.querySelectorAll('img[data-src]').forEach(img => {
      lazyLoadingState.observer?.observe(img);
    });
  } else {
    console.log('Using fallback lazy loading for older browsers');
    fallbackLazyLoading();
  }
  
  lazyLoadingState.isInitialized = true;
  console.log('✅ Universal lazy loading initialized');
};

/**
 * Create a lazy-loadable image element
 */
export const createLazyImage = (config) => {
  const {
    src,
    alt = '',
    className = '',
    category = 'default',
    size = 'medium',
    eager = false,
    width,
    height,
    style = {}
  } = config;
  
  const img = document.createElement('img');
  const capabilities = getDeviceCapabilities();
  
  // Set basic attributes
  img.alt = alt;
  img.className = className;
  Object.assign(img.style, style);
  
  if (width) img.width = width;
  if (height) img.height = height;
  
  // Determine loading strategy
  if (eager || !capabilities.supportsNativeLazyLoading) {
    // Load immediately for critical images or unsupported browsers
    img.src = src;
    img.loading = 'eager';
  } else {
    // Use lazy loading
    if (capabilities.supportsNativeLazyLoading && capabilities.supportsIntersectionObserver) {
      // Modern browsers: use native lazy loading + intersection observer
      img.loading = 'lazy';
      img.src = src;
    } else {
      // Older browsers: use data-src for manual lazy loading
      img.dataset.src = src;
      img.dataset.category = category;
      img.dataset.size = size;
      img.src = getFallbackImage(category, 'small'); // Show low-res placeholder
    }
  }
  
  img.decoding = 'async';
  
  // Add error handling
  img.onerror = () => {
    console.warn(`Image failed to load: ${src}`);
    img.src = getFallbackImage(category, size);
  };
  
  // Observe for lazy loading if needed
  if (!eager && lazyLoadingState.observer && img.dataset.src) {
    lazyLoadingState.observer.observe(img);
  }
  
  return img;
};

/**
 * Convert existing images to lazy loading
 */
export const convertToLazyLoading = (selector = 'img') => {
  const images = document.querySelectorAll(selector);
  const capabilities = getDeviceCapabilities();
  
  images.forEach((img, index) => {
    // Skip if already processed or is critical (first few images)
    if (img.dataset.lazyProcessed || index < 2) return;
    
    const originalSrc = img.src;
    if (!originalSrc || originalSrc.startsWith('data:')) return;
    
    // Mark as processed
    img.dataset.lazyProcessed = 'true';
    
    if (capabilities.supportsNativeLazyLoading) {
      img.loading = 'lazy';
    } else {
      // Use manual lazy loading for older browsers
      img.dataset.src = originalSrc;
      img.src = getFallbackImage('default', 'small');
      
      if (lazyLoadingState.observer) {
        lazyLoadingState.observer.observe(img);
      }
    }
  });
  
  console.log(`✅ Converted ${images.length} images to lazy loading`);
};

/**
 * Preload critical images for better performance
 */
export const preloadCriticalImages = (imageUrls, options = {}) => {
  const { maxConcurrent = 3, timeout = 5000 } = options;
  
  if (!Array.isArray(imageUrls)) return Promise.resolve([]);
  
  const preloadPromises = imageUrls.slice(0, maxConcurrent).map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        resolve({ success: false, url, error: 'timeout' });
      }, timeout);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve({ success: true, url });
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve({ success: false, url, error: 'load_failed' });
      };
      
      img.src = url;
    });
  });
  
  return Promise.all(preloadPromises);
};

/**
 * Get lazy loading statistics
 */
export const getLazyLoadingStats = () => {
  return {
    loaded: lazyLoadingState.loadedImages.size,
    failed: lazyLoadingState.failedImages.size,
    pending: lazyLoadingState.pendingImages.size,
    isInitialized: lazyLoadingState.isInitialized,
    capabilities: getDeviceCapabilities()
  };
};

/**
 * Reset lazy loading state
 */
export const resetLazyLoading = () => {
  if (lazyLoadingState.observer) {
    lazyLoadingState.observer.disconnect();
  }
  
  lazyLoadingState = {
    observer: null,
    loadedImages: new Set(),
    failedImages: new Set(),
    pendingImages: new Map(),
    isInitialized: false
  };
  
  console.log('🔄 Lazy loading state reset');
};

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLazyLoading);
  } else {
    initializeLazyLoading();
  }
}

export default {
  initializeLazyLoading,
  createLazyImage,
  convertToLazyLoading,
  preloadCriticalImages,
  getFallbackImage,
  getLazyLoadingStats,
  resetLazyLoading
};
