interface QueuedRequest {
  id: string;
  apiName: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

export class GlobalRateLimiter {
  private static queue: QueuedRequest[] = [];
  private static isProcessing = false;
  private static lastApiCall: Record<string, number> = {};
  private static readonly MIN_DELAY_BETWEEN_CALLS = 5000; // 5 seconds between ANY API calls
  private static readonly MIN_DELAY_PER_API = 15000; // 15 seconds between calls to same API
  private static readonly MAX_CONCURRENT_REQUESTS = 1; // Only 1 request at a time
  private static readonly RATE_LIMIT_COOLDOWN = 120000; // 2 minutes cooldown after 429

  /**
   * Queue an API request with rate limiting
   */
  static async queueRequest<T>(
    apiName: string,
    requestFunction: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        apiName,
        execute: requestFunction,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.queue.push(request);
      console.log(`📝 Queued ${apiName} request. Queue length: ${this.queue.length}`);
      
      this.processQueue();
    });
  }

  /**
   * Process the request queue with strict rate limiting
   */
  private static async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      const now = Date.now();

      // Check if we need to wait for general rate limiting
      const timeSinceLastCall = now - (this.getLastCallTime() || 0);
      if (timeSinceLastCall < this.MIN_DELAY_BETWEEN_CALLS) {
        const waitTime = this.MIN_DELAY_BETWEEN_CALLS - timeSinceLastCall;
        console.log(`⏳ Global rate limit: waiting ${waitTime}ms before next API call`);
        await this.delay(waitTime);
      }

      // Check if we need to wait for this specific API
      const lastCallForThisAPI = this.lastApiCall[request.apiName] || 0;
      const timeSinceLastAPICall = now - lastCallForThisAPI;
      if (timeSinceLastAPICall < this.MIN_DELAY_PER_API) {
        const waitTime = this.MIN_DELAY_PER_API - timeSinceLastAPICall;
        console.log(`⏳ ${request.apiName} rate limit: waiting ${waitTime}ms`);
        await this.delay(waitTime);
      }

      try {
        console.log(`🚀 Executing ${request.apiName} request (${this.queue.length} remaining)`);
        
        // Record the call time
        this.lastApiCall[request.apiName] = Date.now();
        
        // Execute the request
        const result = await request.execute();
        request.resolve(result);

        console.log(`✅ ${request.apiName} request completed successfully`);

        // Add a mandatory delay between all requests
        if (this.queue.length > 0) {
          console.log(`⏳ Mandatory ${this.MIN_DELAY_BETWEEN_CALLS}ms delay before next request`);
          await this.delay(this.MIN_DELAY_BETWEEN_CALLS);
        }

      } catch (error: any) {
        console.error(`❌ ${request.apiName} request failed:`, error);

        // Handle rate limiting errors with extended cooldown
        if (this.isRateLimitError(error)) {
          console.warn(`🔥 Rate limit detected for ${request.apiName}! Applying ${this.RATE_LIMIT_COOLDOWN}ms cooldown`);
          
          // Set a long cooldown for this API
          this.lastApiCall[request.apiName] = Date.now() + this.RATE_LIMIT_COOLDOWN;
          
          // Also add global cooldown
          await this.delay(this.RATE_LIMIT_COOLDOWN);
        }

        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get the timestamp of the last API call to any service
   */
  private static getLastCallTime(): number {
    return Math.max(...Object.values(this.lastApiCall), 0);
  }

  /**
   * Check if an error is a rate limiting error
   */
  private static isRateLimitError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.response?.status || error?.status || error?.code;
    
    return (
      errorCode === 429 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('throttled') ||
      errorMessage.includes('429')
    );
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  static getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      lastApiCalls: { ...this.lastApiCall },
      nextAvailableTimes: Object.entries(this.lastApiCall).reduce((acc, [api, lastCall]) => {
        acc[api] = Math.max(0, lastCall + this.MIN_DELAY_PER_API - Date.now());
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clear the queue (emergency stop)
   */
  static clearQueue() {
    const clearedCount = this.queue.length;
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log(`🧹 Cleared ${clearedCount} queued requests`);
  }

  /**
   * Reset rate limiting for an API (for testing)
   */
  static resetAPI(apiName: string) {
    delete this.lastApiCall[apiName];
    console.log(`🔄 Reset rate limiting for ${apiName}`);
  }

  /**
   * Reset all rate limiting
   */
  static resetAll() {
    this.lastApiCall = {};
    this.clearQueue();
    console.log('🔄 Reset all rate limiting');
  }
}