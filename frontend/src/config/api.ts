/**
 * API Configuration
 * Centralized configuration for API base URL
 */

// Determine the API base URL
// In development, use direct backend URL if proxy doesn't work
// In production, use relative path for proxy
const getApiBaseUrl = (): string => {
  // Check if custom API URL is set in environment
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // In development (localhost), try direct backend URL
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }

  // In production, use proxy
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to make API calls with error handling
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    // If 404 and using proxy, try direct backend URL
    if (response.status === 404 && API_BASE_URL === '/api' && window.location.hostname === 'localhost') {
      const directUrl = `http://localhost:5000/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const directResponse = await fetch(directUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      return directResponse;
    }
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response;
};



