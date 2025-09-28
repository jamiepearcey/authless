/**
 * Error handling utilities for consistent error page redirects
 */

export type ErrorCode = 
  | 'order_creation_failed'
  | 'payment_failed'
  | 'session_expired'
  | 'access_denied'
  | 'not_found'
  | 'server_error'
  | 'network_error'
  | 'validation_error'
  | 'rate_limited'
  | 'maintenance_mode';

export interface ErrorRedirectOptions {
  errorCode: ErrorCode;
  returnUrl?: string;
  details?: string;
  additionalParams?: Record<string, string>;
}

/**
 * Generate an error page URL with proper query parameters
 */
export function getErrorUrl(options: ErrorRedirectOptions): string {
  const { errorCode, returnUrl, details, additionalParams = {} } = options;
  
  const params = new URLSearchParams();
  
  if (returnUrl) {
    params.set('returnUrl', returnUrl);
  }
  
  if (details) {
    params.set('details', details);
  }
  
  // Add any additional parameters
  Object.entries(additionalParams).forEach(([key, value]) => {
    params.set(key, value);
  });
  
  const queryString = params.toString();
  return `/error/${errorCode}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Common error redirects for different scenarios
 */
export const ErrorRedirects = {
  orderCreationFailed: (returnUrl = '/checkout', details?: string) =>
    getErrorUrl({ errorCode: 'order_creation_failed', returnUrl, details }),
    
  paymentFailed: (returnUrl = '/checkout', details?: string) =>
    getErrorUrl({ errorCode: 'payment_failed', returnUrl, details }),
    
  sessionExpired: (returnUrl = '/') =>
    getErrorUrl({ errorCode: 'session_expired', returnUrl }),
    
  accessDenied: (returnUrl = '/') =>
    getErrorUrl({ errorCode: 'access_denied', returnUrl }),
    
  notFound: (returnUrl = '/') =>
    getErrorUrl({ errorCode: 'not_found', returnUrl }),
    
  serverError: (returnUrl = '/', details?: string) =>
    getErrorUrl({ errorCode: 'server_error', returnUrl, details }),
    
  networkError: (returnUrl = '/') =>
    getErrorUrl({ errorCode: 'network_error', returnUrl }),
    
  validationError: (returnUrl = '/', details?: string) =>
    getErrorUrl({ errorCode: 'validation_error', returnUrl, details }),
    
  rateLimited: (returnUrl = '/') =>
    getErrorUrl({ errorCode: 'rate_limited', returnUrl }),
    
  maintenanceMode: (returnUrl = '/') =>
    getErrorUrl({ errorCode: 'maintenance_mode', returnUrl }),
};

/**
 * Handle API errors and redirect to appropriate error page
 */
export function handleApiError(
  error: unknown,
  fallbackErrorCode: ErrorCode = 'server_error',
  returnUrl = '/'
): string {
  if (error instanceof Error) {
    // Map common error messages to error codes
    const message = error.message.toLowerCase();
    
    if (message.includes('payment') || message.includes('stripe')) {
      return ErrorRedirects.paymentFailed(returnUrl, error.message);
    }
    
    if (message.includes('order') || message.includes('creation')) {
      return ErrorRedirects.orderCreationFailed(returnUrl, error.message);
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorRedirects.validationError(returnUrl, error.message);
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorRedirects.networkError(returnUrl);
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorRedirects.accessDenied(returnUrl);
    }
    
    // Default to fallback error code with details
    return getErrorUrl({ 
      errorCode: fallbackErrorCode, 
      returnUrl, 
      details: error.message 
    });
  }
  
  // Unknown error type
  return getErrorUrl({ 
    errorCode: fallbackErrorCode, 
    returnUrl, 
    details: 'An unknown error occurred' 
  });
}
