const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Enhanced fetch with retry logic and error handling
export const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  // Attach auth token from localStorage by default for all API calls,
  // while still allowing callers to override Authorization explicitly.
  let token = null;
  try {
    if (typeof window !== 'undefined') {
      token = window.localStorage.getItem('token');
    }
  } catch (_) {}

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const defaultOptions = {
    credentials: 'include',
    headers: defaultHeaders,
    ...options,
  };

  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle different response statuses
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return response;
      }
      
      // Handle specific error statuses
      if (response.status === 401) {
        // Only log 401 errors in development, not in production
        if (import.meta.env.DEV) {
          console.warn('Unauthorized request to:', url);
        }
        throw new Error('Unauthorized');
      }
      
      if (response.status === 403) {
        console.warn('Forbidden request to:', url);
        throw new Error('Forbidden');
      }
      
      if (response.status === 404) {
        console.warn('Resource not found:', url);
        throw new Error('Not Found');
      }
      
      if (response.status >= 500) {
        console.warn('Server error for:', url, 'Status:', response.status);
        throw new Error(`Server Error: ${response.status}`);
      }
      
      // For other client errors, don't retry
      if (response.status >= 400) {
        const errorText = await response.text();
        throw new Error(`Client Error: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain errors
      if (error.name === 'AbortError') {
        console.warn(`Request timeout for: ${url}`);
        if (attempt === maxRetries) throw new Error('Request timeout');
      } else if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        throw error; // Don't retry auth errors
      } else if (attempt === maxRetries) {
        console.error(`Failed to fetch ${url} after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
      console.log(`Retrying ${url} in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Specific API functions with error handling
export const apiGet = async (endpoint, options = {}) => {
  try {
    return await fetchWithRetry(`${API_URL}${endpoint}`, {
      method: 'GET',
      ...options,
    });
  } catch (error) {
    // Don't log 401 errors as they're expected for unauthenticated users
    if (error.message !== 'Unauthorized') {
      console.error(`GET ${endpoint} failed:`, error);
    }
    return null;
  }
};

export const apiPost = async (endpoint, data = null, options = {}) => {
  try {
    const body = data ? JSON.stringify(data) : null;
    return await fetchWithRetry(`${API_URL}${endpoint}`, {
      method: 'POST',
      body,
      ...options,
    });
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    throw error;
  }
};

export const apiPut = async (endpoint, data = null, options = {}) => {
  try {
    const body = data ? JSON.stringify(data) : null;
    return await fetchWithRetry(`${API_URL}${endpoint}`, {
      method: 'PUT',
      body,
      ...options,
    });
  } catch (error) {
    console.error(`PUT ${endpoint} failed:`, error);
    throw error;
  }
};

export const apiDelete = async (endpoint, options = {}) => {
  try {
    return await fetchWithRetry(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      ...options,
    });
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    throw error;
  }
};

export const apiPatch = async (endpoint, data = null, options = {}) => {
  try {
    const body = data ? JSON.stringify(data) : null;
    return await fetchWithRetry(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      body,
      ...options,
    });
  } catch (error) {
    console.error(`PATCH ${endpoint} failed:`, error);
    throw error;
  }
};

// File upload with error handling
export const apiUpload = async (endpoint, formData, options = {}) => {
  try {
    return await fetchWithRetry(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      // Don't set Content-Type for FormData, let browser set it
      headers: {
        ...options.headers,
      },
      ...options,
    });
  } catch (error) {
    console.error(`UPLOAD ${endpoint} failed:`, error);
    throw error;
  }
};

// Download file with error handling
export const apiDownload = async (endpoint, filename = null) => {
  try {
    const response = await fetchWithRetry(`${API_URL}${endpoint}`, {
      method: 'GET',
    });
    
    if (response && response.blob) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`DOWNLOAD ${endpoint} failed:`, error);
    return false;
  }
};

// Safe API call that returns default value on error
export const safeApiGet = async (endpoint, defaultValue = null, options = {}) => {
  try {
    const result = await apiGet(endpoint, options);
    return result !== null ? result : defaultValue;
  } catch (error) {
    // Don't log warnings for 401 errors (expected for unauthenticated users)
    if (error.message !== 'Unauthorized') {
      // Only log in development
      if (import.meta.env.DEV) {
        console.warn(`Safe API call to ${endpoint} failed, returning default:`, defaultValue);
      }
    }
    return defaultValue;
  }
};

// Batch API calls with error handling
export const apiBatch = async (requests) => {
  const results = await Promise.allSettled(
    requests.map(async ({ endpoint, method = 'GET', data = null, options = {} }) => {
      switch (method.toUpperCase()) {
        case 'GET':
          return await apiGet(endpoint, options);
        case 'POST':
          return await apiPost(endpoint, data, options);
        case 'PUT':
          return await apiPut(endpoint, data, options);
        case 'DELETE':
          return await apiDelete(endpoint, options);
        case 'PATCH':
          return await apiPatch(endpoint, data, options);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    })
  );
  
  return results.map((result, index) => ({
    endpoint: requests[index].endpoint,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
};

export default {
  fetchWithRetry,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPatch,
  apiUpload,
  apiDownload,
  safeApiGet,
  apiBatch,
};
