/**
 * Enhanced lazy import with error handling and retry logic
 * Prevents app crashes when dynamic imports fail
 */

import { lazy } from 'react';
import React from 'react';

/**
 * Create a lazy component with error handling
 */
export function lazyWithRetry(importFn, retries = 3) {
  return lazy(() => {
    return new Promise((resolve) => {
      let attempts = 0;
      
      const tryImport = async () => {
        try {
          const module = await importFn();
          // Verify the module has a default export
          if (module && (module.default || module)) {
            resolve(module);
          } else {
            throw new Error('Module does not have a default export');
          }
        } catch (error) {
          attempts++;
          
          // Check if it's a network error or module not found
          const isNetworkError = error.message?.includes('Failed to fetch') || 
                                 error.message?.includes('net::') ||
                                 error.name === 'TypeError';
          
          if (attempts <= retries && isNetworkError) {
            // Only log in development
            if (import.meta.env.DEV) {
              console.warn(`Failed to load module, retrying (${attempts}/${retries})...`, error.message);
            }
            // Wait before retrying with exponential backoff
            setTimeout(tryImport, Math.min(1000 * Math.pow(2, attempts - 1), 5000));
          } else {
            // Return a fallback component instead of crashing
            if (import.meta.env.DEV) {
              console.error('Failed to load module after retries:', error);
            }
            resolve({
              default: () => React.createElement('div', {
                className: 'min-h-screen flex items-center justify-center bg-gray-50'
              }, React.createElement('div', {
                className: 'text-center p-8'
              }, [
                React.createElement('h1', {
                  key: 'title',
                  className: 'text-2xl font-bold text-gray-900 mb-4'
                }, 'Failed to Load Page'),
                React.createElement('p', {
                  key: 'message',
                  className: 'text-gray-600 mb-4'
                }, 'The page could not be loaded. Please try refreshing the page.'),
                React.createElement('button', {
                  key: 'button',
                  onClick: () => window.location.reload(),
                  className: 'px-6 py-3 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32] transition-colors'
                }, 'Refresh Page')
              ]))
            });
          }
        }
      };
      
      tryImport();
    });
  });
}

