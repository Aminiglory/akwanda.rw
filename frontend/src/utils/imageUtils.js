// Comprehensive image optimization utilities for faster loading on all devices

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Global image loading performance tracking
let imageLoadStats = {
  loaded: 0,
  failed: 0,
  preloaded: 0,
  totalLoadTime: 0
};

// Device-specific optimizations
const getDeviceOptimizations = () => {
  if (typeof window === 'undefined') return { quality: 80, format: 'auto' };
  
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  const isHighDPI = window.devicePixelRatio > 1.5;
  const isMobile = window.innerWidth < 768;
  
  return {
    quality: isSlowConnection ? 60 : (isMobile ? 70 : 80),
    format: 'auto',
    progressive: !isSlowConnection,
    webp: 'auto',
    avif: !isSlowConnection && !isMobile
  };
};

// High-performance fallback images optimized for different devices and contexts
export const FALLBACK_IMAGES = {
  // Property types with multiple sizes for responsive loading
  apartment: {
    small: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop&auto=format&q=85'
  },
  hotel: {
    small: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop&auto=format&q=85'
  },
  house: {
    small: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=800&fit=crop&auto=format&q=85'
  },
  villa: {
    small: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop&auto=format&q=85'
  },
  attraction: {
    small: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&h=800&fit=crop&auto=format&q=85'
  },
  hero: {
    small: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=800&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&h=1080&fit=crop&auto=format&q=85'
  },
  default: {
    small: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format&q=75',
    medium: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80',
    large: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop&auto=format&q=85'
  }
};

/**
 * Enhanced image URL builder with protocol fixing and error handling
 * @param {string} imagePath - The image path or URL
 * @returns {string|null} - Processed absolute URL or null
 */
export const makeAbsoluteImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  let url = String(imagePath).trim().replace(/\\/g, '/');
  
  // If already absolute URL, fix protocol if needed
  if (/^https?:\/\//i.test(url)) {
    // Fix HTTP to HTTPS on HTTPS sites to prevent mixed content warnings
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
      return url.replace('http:', 'https:');
    }
    return url;
  }
  
  // Build absolute URL from relative path
  if (!url.startsWith('/')) url = `/${url}`;
  
  let apiBase = API_URL;
  // Ensure API_URL uses HTTPS if current page is HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && apiBase.startsWith('http:')) {
    apiBase = apiBase.replace('http:', 'https:');
  }
  
  return `${apiBase}${url}`;
};

/**
 * Advanced image preloading with priority and performance tracking
 * @param {Array} imageData - Array of image objects with url, priority, category
 * @param {Object} options - Preloading options
 * @returns {Promise} - Promise that resolves when critical images are loaded
 */
export const preloadImages = (imageData, options = {}) => {
  const { maxConcurrent = 3, timeout = 5000, onProgress } = options;
  
  if (!Array.isArray(imageData)) return Promise.resolve([]);
  
  // Sort by priority (higher number = higher priority)
  const sortedImages = imageData
    .filter(item => item && item.url)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, maxConcurrent);
  
  const preloadPromises = sortedImages.map((item, index) => {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const img = new Image();
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };
      
      const timeoutId = setTimeout(() => {
        cleanup();
        imageLoadStats.failed++;
        console.warn(`Preload timeout: ${item.url}`);
        resolve({ success: false, url: item.url, error: 'timeout' });
      }, timeout);
      
      img.onload = () => {
        cleanup();
        const loadTime = performance.now() - startTime;
        imageLoadStats.loaded++;
        imageLoadStats.preloaded++;
        imageLoadStats.totalLoadTime += loadTime;
        
        onProgress && onProgress(index + 1, sortedImages.length);
        resolve({ success: true, url: item.url, loadTime });
      };
      
      img.onerror = () => {
        cleanup();
        imageLoadStats.failed++;
        console.warn(`Failed to preload: ${item.url}`);
        resolve({ success: false, url: item.url, error: 'load_failed' });
      };
      
      // Use responsive image if available
      const responsiveImages = generateResponsiveImages(item.url);
      img.src = responsiveImages ? responsiveImages.medium : item.url;
    });
  });
  
  return Promise.all(preloadPromises);
};

/**
 * Get image loading performance statistics
 * @returns {Object} - Performance stats
 */
export const getImageLoadStats = () => ({ ...imageLoadStats });

/**
 * Reset image loading statistics
 */
export const resetImageLoadStats = () => {
  imageLoadStats = { loaded: 0, failed: 0, preloaded: 0, totalLoadTime: 0 };
};

/**
 * Get responsive fallback image based on category and size
 * @param {string} category - Property category
 * @param {string} size - Image size (small, medium, large)
 * @returns {string} - Optimized fallback image URL
 */
export const getFallbackImage = (category = 'default', size = 'medium') => {
  const categoryImages = FALLBACK_IMAGES[category.toLowerCase()] || FALLBACK_IMAGES.default;
  return typeof categoryImages === 'object' ? categoryImages[size] || categoryImages.medium : categoryImages;
};

/**
 * Generate responsive image sizes based on container and device
 * @param {string} baseUrl - Base image URL
 * @param {Object} options - Size options
 * @returns {Object} - Responsive image URLs
 */
export const generateResponsiveImages = (baseUrl, options = {}) => {
  if (!baseUrl) return null;
  
  const { maxWidth = 1200, aspectRatio = '4:3' } = options;
  const deviceOpts = getDeviceOptimizations();
  
  // If it's already an Unsplash URL, add responsive parameters
  if (baseUrl.includes('unsplash.com')) {
    return {
      small: `${baseUrl}&w=400&h=300&q=${deviceOpts.quality}`,
      medium: `${baseUrl}&w=800&h=600&q=${deviceOpts.quality}`,
      large: `${baseUrl}&w=${maxWidth}&h=${Math.round(maxWidth * 0.75)}&q=${deviceOpts.quality}`
    };
  }
  
  // For other URLs, return as-is (could be enhanced with image processing service)
  return {
    small: baseUrl,
    medium: baseUrl,
    large: baseUrl
  };
};

/**
 * Create optimized image with lazy loading and error handling
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text
 * @param {string} className - CSS classes
 * @param {string} fallbackCategory - Category for fallback image
 * @returns {Promise} - Promise that resolves when image loads
 */
export const createOptimizedImage = (src, alt, className = '', fallbackCategory = 'default') => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Try fallback image
      const fallbackSrc = getFallbackImage(fallbackCategory);
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => reject(new Error('Both primary and fallback images failed'));
      fallbackImg.src = fallbackSrc;
    };
    
    img.src = src;
    img.alt = alt;
    img.className = className;
    img.loading = 'lazy';
    img.decoding = 'async';
  });
};

/**
 * Add loading states and error handling to existing images
 * @param {HTMLImageElement} imgElement - Image element
 * @param {string} fallbackCategory - Category for fallback
 */
export const enhanceImageElement = (imgElement, fallbackCategory = 'default') => {
  if (!imgElement) return;
  
  const originalSrc = imgElement.src;
  
  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center';
  loadingDiv.innerHTML = '<div class="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>';
  
  if (imgElement.parentNode) {
    imgElement.parentNode.style.position = 'relative';
    imgElement.parentNode.appendChild(loadingDiv);
  }
  
  // Handle load success
  imgElement.onload = () => {
    if (loadingDiv.parentNode) {
      loadingDiv.parentNode.removeChild(loadingDiv);
    }
    imgElement.style.opacity = '1';
  };
  
  // Handle load error
  imgElement.onerror = () => {
    console.warn(`Image failed to load: ${originalSrc}`);
    imgElement.src = getFallbackImage(fallbackCategory);
    if (loadingDiv.parentNode) {
      loadingDiv.parentNode.removeChild(loadingDiv);
    }
  };
  
  // Set initial styles
  imgElement.style.opacity = '0';
  imgElement.style.transition = 'opacity 0.3s ease';
  imgElement.loading = 'lazy';
  imgElement.decoding = 'async';
};

/**
 * Comprehensive image processing for components with responsive and fallback support
 * @param {Array} items - Array of items with image properties
 * @param {Object} options - Processing options
 * @returns {Array} - Processed items with optimized image URLs and metadata
 */
export const processImagesForComponent = (items, options = {}) => {
  const {
    imageProperty = 'image',
    categoryProperty = 'category',
    generateResponsive = true,
    addFallbacks = true,
    prioritizeFirst = 3
  } = options;
  
  if (!Array.isArray(items)) return [];
  
  return items.map((item, index) => {
    const originalUrl = item[imageProperty];
    const category = item[categoryProperty] || 'default';
    const absoluteUrl = makeAbsoluteImageUrl(originalUrl);
    
    const processed = { ...item };
    
    // Set main image URL
    processed[imageProperty] = absoluteUrl;
    
    // Add responsive images if requested
    if (generateResponsive && absoluteUrl) {
      processed[`${imageProperty}Responsive`] = generateResponsiveImages(absoluteUrl);
    }
    
    // Add fallback images if requested
    if (addFallbacks) {
      processed[`${imageProperty}Fallback`] = {
        small: getFallbackImage(category, 'small'),
        medium: getFallbackImage(category, 'medium'),
        large: getFallbackImage(category, 'large')
      };
    }
    
    // Add loading priority for preloading
    processed.imagePriority = index < prioritizeFirst ? (prioritizeFirst - index) : 0;
    processed.imageCategory = category;
    
    return processed;
  });
};

/**
 * Create optimized image element with all performance features
 * @param {Object} config - Image configuration
 * @returns {HTMLImageElement} - Optimized image element
 */
export const createOptimizedImageElement = (config) => {
  const {
    src,
    alt = '',
    className = '',
    category = 'default',
    size = 'medium',
    lazy = true,
    onLoad,
    onError
  } = config;
  
  const img = document.createElement('img');
  const fallbackUrl = getFallbackImage(category, size);
  
  // Set basic attributes
  img.alt = alt;
  img.className = className;
  
  // Add performance attributes
  if (lazy) {
    img.loading = 'lazy';
  }
  img.decoding = 'async';
  
  // Add error handling
  img.onerror = () => {
    console.warn(`Image failed to load: ${src}, using fallback`);
    img.src = fallbackUrl;
    imageLoadStats.failed++;
    onError && onError();
  };
  
  img.onload = () => {
    imageLoadStats.loaded++;
    onLoad && onLoad();
  };
  
  // Set source (primary or fallback)
  img.src = src || fallbackUrl;
  
  return img;
};

/**
 * Initialize global image optimization for the landing page
 * @param {Array} criticalImages - Critical images to preload immediately
 */
export const initializeLandingPageOptimization = async (criticalImages = []) => {
  // Reset stats
  resetImageLoadStats();
  
  // Preload critical images
  if (criticalImages.length > 0) {
    console.log('Preloading critical images for landing page...');
    const results = await preloadImages(criticalImages, {
      maxConcurrent: 3,
      timeout: 3000,
      onProgress: (loaded, total) => {
        console.log(`Preloaded ${loaded}/${total} critical images`);
      }
    });
    
    const successful = results.filter(r => r.success).length;
    console.log(`Successfully preloaded ${successful}/${results.length} critical images`);
  }
  
  // Add intersection observer for lazy loading optimization
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
};

// Export performance utilities
export { getDeviceOptimizations };
