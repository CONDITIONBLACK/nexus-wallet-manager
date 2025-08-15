export interface APIError {
  type: 'CORS' | 'RATE_LIMIT' | 'NOT_FOUND' | 'NETWORK' | 'SERVER' | 'UNKNOWN';
  message: string;
  retryAfter?: number; // seconds
  isFatal: boolean; // whether to stop trying other APIs
}

export class APIErrorHandler {
  /**
   * Analyze an error and determine the best course of action
   */
  static analyzeError(error: any): APIError {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.response?.status || error?.status || error?.code;
    const errorData = error?.response?.data || {};

    // CORS errors
    if (
      errorMessage.includes('cors') ||
      errorMessage.includes('access-control-allow-origin') ||
      errorMessage.includes('cross-origin')
    ) {
      return {
        type: 'CORS',
        message: 'CORS error - API blocked by browser security policy',
        isFatal: true, // CORS errors won't be fixed by retrying
      };
    }

    // Rate limiting errors
    if (
      errorCode === 429 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('throttled')
    ) {
      // Try to extract retry-after header
      const retryAfter = error?.response?.headers?.['retry-after'] || 
                        error?.response?.headers?.['x-ratelimit-reset'] || 
                        60; // Default to 60 seconds

      return {
        type: 'RATE_LIMIT',
        message: `Rate limited - retry after ${retryAfter} seconds`,
        retryAfter: parseInt(retryAfter, 10),
        isFatal: false, // Can retry after delay
      };
    }

    // Not found errors
    if (
      errorCode === 404 ||
      errorMessage.includes('not found') ||
      errorMessage.includes('address not found')
    ) {
      return {
        type: 'NOT_FOUND',
        message: 'Address not found or invalid',
        isFatal: true, // Address issues won't be fixed by retrying
      };
    }

    // Network errors
    if (
      errorCode === 'NETWORK_ERROR' ||
      errorMessage.includes('network error') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('connection refused') ||
      errorMessage.includes('timeout')
    ) {
      return {
        type: 'NETWORK',
        message: 'Network connection error',
        isFatal: false, // Network issues might be temporary
      };
    }

    // Server errors (5xx)
    if (errorCode >= 500 && errorCode < 600) {
      return {
        type: 'SERVER',
        message: `Server error (${errorCode})`,
        isFatal: false, // Server issues might be temporary
      };
    }

    // Unknown errors
    return {
      type: 'UNKNOWN',
      message: errorMessage || 'Unknown error occurred',
      isFatal: false, // Unknown errors might be recoverable
    };
  }

  /**
   * Get recommended delay before retry based on error type
   */
  static getRetryDelay(error: APIError, attemptNumber: number): number {
    switch (error.type) {
      case 'RATE_LIMIT':
        return (error.retryAfter || 60) * 1000; // Convert to milliseconds
      
      case 'NETWORK':
        return Math.min(1000 * Math.pow(2, attemptNumber), 10000); // Exponential backoff, max 10s
      
      case 'SERVER':
        return Math.min(2000 * Math.pow(2, attemptNumber), 30000); // Exponential backoff, max 30s
      
      case 'CORS':
      case 'NOT_FOUND':
        return 0; // Don't retry fatal errors
      
      default:
        return 3000; // Default 3 second delay
    }
  }

  /**
   * Should we retry this error?
   */
  static shouldRetry(error: APIError, attemptNumber: number, maxAttempts: number): boolean {
    if (error.isFatal) return false;
    if (attemptNumber >= maxAttempts) return false;
    
    switch (error.type) {
      case 'RATE_LIMIT':
        return attemptNumber < 2; // Only retry rate limits once
      
      case 'NETWORK':
      case 'SERVER':
        return attemptNumber < maxAttempts;
      
      default:
        return attemptNumber < Math.min(maxAttempts, 1); // Most errors, retry once
    }
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: APIError): string {
    switch (error.type) {
      case 'CORS':
        return 'API blocked by browser security. Try refreshing or use Electron app.';
      
      case 'RATE_LIMIT':
        return `Rate limited. Please wait ${error.retryAfter || 60} seconds before trying again.`;
      
      case 'NOT_FOUND':
        return 'Address not found. Please check the address is valid.';
      
      case 'NETWORK':
        return 'Network connection error. Please check your internet connection.';
      
      case 'SERVER':
        return 'API server error. Please try again later.';
      
      default:
        return 'Unable to fetch balance. Please try again later.';
    }
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: APIError, context: string, attemptNumber: number): void {
    const prefix = `[${context}] Attempt ${attemptNumber}:`;
    
    switch (error.type) {
      case 'CORS':
      case 'NOT_FOUND':
        console.error(`${prefix} ${error.message}`);
        break;
      
      case 'RATE_LIMIT':
        console.warn(`${prefix} ${error.message}`);
        break;
      
      default:
        console.info(`${prefix} ${error.message}`);
    }
  }
}