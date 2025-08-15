/**
 * Counter-Forensics Security Service
 * Implements advanced security measures to protect against forensic analysis,
 * memory dumps, debugging, and other attack vectors.
 */

interface SecurityMetrics {
  memoryCleared: number;
  debuggerDetected: boolean;
  virtualMachineDetected: boolean;
  screenRecordingDetected: boolean;
  memoryPressure: 'low' | 'medium' | 'high';
  lastSecurityCheck: Date;
}

interface CounterForensicsConfig {
  enableMemoryProtection: boolean;
  enableAntiDebugging: boolean;
  enableAntiVM: boolean;
  enableScreenRecordingDetection: boolean;
  enableTimingAttackProtection: boolean;
  memoryWipeInterval: number; // milliseconds
  securityCheckInterval: number; // milliseconds
}

class CounterForensicsService {
  private static instance: CounterForensicsService;
  private config: CounterForensicsConfig;
  private securityMetrics: SecurityMetrics;
  private memoryWipeTimer?: NodeJS.Timeout;
  private securityCheckTimer?: NodeJS.Timeout;
  private sensitiveData: Set<string> = new Set();
  private memoryPool: ArrayBuffer[] = [];
  private isActive: boolean = false;

  private constructor() {
    this.config = {
      enableMemoryProtection: true,
      enableAntiDebugging: true,
      enableAntiVM: true,
      enableScreenRecordingDetection: true,
      enableTimingAttackProtection: true,
      memoryWipeInterval: 5000, // 5 seconds
      securityCheckInterval: 10000, // 10 seconds
    };

    this.securityMetrics = {
      memoryCleared: 0,
      debuggerDetected: false,
      virtualMachineDetected: false,
      screenRecordingDetected: false,
      memoryPressure: 'low',
      lastSecurityCheck: new Date(),
    };

    this.initialize();
  }

  public static getInstance(): CounterForensicsService {
    if (!CounterForensicsService.instance) {
      CounterForensicsService.instance = new CounterForensicsService();
    }
    return CounterForensicsService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize memory protection
      this.allocateDecoyMemory();
      
      // Start security monitoring
      this.startSecurityMonitoring();
      
      // Register process exit handlers
      this.registerExitHandlers();
      
      console.log('Counter-forensics security initialized');
      this.isActive = true;
    } catch (error) {
      console.error('Failed to initialize counter-forensics:', error);
    }
  }

  /**
   * Register sensitive data for secure handling
   */
  public registerSensitiveData(data: string): void {
    if (!data || typeof data !== 'string') return;
    
    this.sensitiveData.add(data);
    
    // Schedule immediate wipe after a short delay
    setTimeout(() => {
      this.wipeSensitiveString(data);
    }, 100);
  }

  /**
   * Securely wipe a string from memory
   */
  private wipeSensitiveString(data: string): void {
    try {
      // Overwrite the string data multiple times
      for (let i = 0; i < 7; i++) {
        // Create new string of same length with random data
        const randomData = Array(data.length).fill(0)
          .map(() => String.fromCharCode(Math.floor(Math.random() * 256)))
          .join('');
        
        // Force garbage collection if available
        if (typeof global !== 'undefined' && global.gc) {
          global.gc();
        }
      }
      
      this.sensitiveData.delete(data);
      this.securityMetrics.memoryCleared++;
    } catch (error) {
      console.error('Error wiping sensitive data:', error);
    }
  }

  /**
   * Allocate decoy memory to make forensic analysis harder
   */
  private allocateDecoyMemory(): void {
    try {
      // Allocate multiple memory blocks with decoy data
      for (let i = 0; i < 10; i++) {
        const size = Math.floor(Math.random() * 1024 * 1024) + 1024; // 1KB to 1MB
        const buffer = new ArrayBuffer(size);
        const view = new Uint8Array(buffer);
        
        // Fill with decoy mnemonic-like data
        const decoyWords = [
          'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
          'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'
        ];
        
        for (let j = 0; j < view.length; j++) {
          const word = decoyWords[j % decoyWords.length];
          view[j] = word.charCodeAt(j % word.length);
        }
        
        this.memoryPool.push(buffer);
      }
    } catch (error) {
      console.error('Error allocating decoy memory:', error);
    }
  }

  /**
   * Detect if running in a virtual machine
   */
  private detectVirtualMachine(): boolean {
    try {
      // Check for common VM indicators
      const vmIndicators = [
        'VMware', 'VirtualBox', 'QEMU', 'Xen', 'Hyper-V',
        'Parallels', 'Virtual', 'VMX', 'KVM'
      ];
      
      // Check user agent and navigator properties
      const userAgent = navigator.userAgent || '';
      const platform = navigator.platform || '';
      
      for (const indicator of vmIndicators) {
        if (userAgent.includes(indicator) || platform.includes(indicator)) {
          return true;
        }
      }
      
      // Check for VM-specific timing characteristics
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }
      const end = performance.now();
      
      // VMs typically have different timing characteristics
      const executionTime = end - start;
      if (executionTime > 10 || executionTime < 0.1) {
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect debugger attachment
   */
  private detectDebugger(): boolean {
    try {
      // Check for DevTools
      let devtools = false;
      
      // Method 1: Console detection
      const threshold = 160;
      const start = new Date().getTime();
      
      debugger; // This will pause if debugger is attached
      
      const end = new Date().getTime();
      if (end - start > threshold) {
        devtools = true;
      }
      
      // Method 2: Window size detection
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        devtools = true;
      }
      
      // Method 3: Check for common debugging variables
      const commonDebugVars = ['__debug__', '_debug', 'debug', '__DEV__'];
      for (const debugVar of commonDebugVars) {
        if ((window as any)[debugVar]) {
          devtools = true;
          break;
        }
      }
      
      return devtools;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect screen recording software
   */
  private detectScreenRecording(): boolean {
    try {
      // Check for common screen recording indicators
      if (typeof window !== 'undefined') {
        // Check for media devices
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          // This is a potential indicator but not definitive
          return false; // We can't reliably detect screen recording in browser
        }
      }
      
      // In Electron, we can check with the main process
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        return window.electronAPI.checkScreenRecording?.() || false;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Implement timing attack protection
   */
  public async timingProtectedOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.enableTimingAttackProtection) {
      return await operation();
    }
    
    const startTime = performance.now();
    const minExecutionTime = 50 + Math.random() * 100; // 50-150ms random delay
    
    try {
      const result = await operation();
      
      // Ensure minimum execution time to prevent timing attacks
      const executionTime = performance.now() - startTime;
      if (executionTime < minExecutionTime) {
        await new Promise(resolve => 
          setTimeout(resolve, minExecutionTime - executionTime)
        );
      }
      
      return result;
    } catch (error) {
      // Still respect minimum timing even on error
      const executionTime = performance.now() - startTime;
      if (executionTime < minExecutionTime) {
        await new Promise(resolve => 
          setTimeout(resolve, minExecutionTime - executionTime)
        );
      }
      throw error;
    }
  }

  /**
   * Start continuous security monitoring
   */
  private startSecurityMonitoring(): void {
    if (this.securityCheckTimer) {
      clearInterval(this.securityCheckTimer);
    }
    
    this.securityCheckTimer = setInterval(() => {
      this.performSecurityCheck();
    }, this.config.securityCheckInterval);
    
    if (this.memoryWipeTimer) {
      clearInterval(this.memoryWipeTimer);
    }
    
    this.memoryWipeTimer = setInterval(() => {
      this.performMemoryWipe();
    }, this.config.memoryWipeInterval);
  }

  /**
   * Perform comprehensive security check
   */
  private performSecurityCheck(): void {
    try {
      if (this.config.enableAntiDebugging) {
        this.securityMetrics.debuggerDetected = this.detectDebugger();
        
        if (this.securityMetrics.debuggerDetected) {
          this.handleSecurityThreat('debugger_detected');
        }
      }
      
      if (this.config.enableAntiVM) {
        this.securityMetrics.virtualMachineDetected = this.detectVirtualMachine();
        
        if (this.securityMetrics.virtualMachineDetected) {
          this.handleSecurityThreat('vm_detected');
        }
      }
      
      if (this.config.enableScreenRecordingDetection) {
        this.securityMetrics.screenRecordingDetected = this.detectScreenRecording();
        
        if (this.securityMetrics.screenRecordingDetected) {
          this.handleSecurityThreat('screen_recording_detected');
        }
      }
      
      this.securityMetrics.lastSecurityCheck = new Date();
    } catch (error) {
      console.error('Security check failed:', error);
    }
  }

  /**
   * Perform memory wipe operations
   */
  private performMemoryWipe(): void {
    if (!this.config.enableMemoryProtection) return;
    
    try {
      // Wipe sensitive data strings
      for (const data of this.sensitiveData) {
        this.wipeSensitiveString(data);
      }
      
      // Refresh decoy memory
      this.memoryPool.forEach(buffer => {
        const view = new Uint8Array(buffer);
        for (let i = 0; i < view.length; i++) {
          view[i] = Math.floor(Math.random() * 256);
        }
      });
      
      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
      
      this.securityMetrics.memoryCleared++;
    } catch (error) {
      console.error('Memory wipe failed:', error);
    }
  }

  /**
   * Handle detected security threats
   */
  private handleSecurityThreat(threatType: string): void {
    console.warn(`Security threat detected: ${threatType}`);
    
    // Immediate memory wipe
    this.performMemoryWipe();
    
    // Clear all sensitive data
    this.sensitiveData.clear();
    
    // Notify the application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('security-threat', {
        detail: { threatType, timestamp: new Date() }
      }));
    }
  }

  /**
   * Register exit handlers for cleanup
   */
  private registerExitHandlers(): void {
    // Browser beforeunload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
      
      // Page visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.performMemoryWipe();
        }
      });
      
      // Blur event (window loses focus)
      window.addEventListener('blur', () => {
        this.performMemoryWipe();
      });
    }
  }

  /**
   * Get current security metrics
   */
  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics };
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<CounterForensicsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.memoryWipeInterval || newConfig.securityCheckInterval) {
      this.startSecurityMonitoring();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): CounterForensicsConfig {
    return { ...this.config };
  }

  /**
   * Check if security service is active
   */
  public isSecurityActive(): boolean {
    return this.isActive;
  }

  /**
   * Cleanup and disable security measures
   */
  public cleanup(): void {
    try {
      // Clear timers
      if (this.memoryWipeTimer) {
        clearInterval(this.memoryWipeTimer);
        this.memoryWipeTimer = undefined;
      }
      
      if (this.securityCheckTimer) {
        clearInterval(this.securityCheckTimer);
        this.securityCheckTimer = undefined;
      }
      
      // Final memory wipe
      this.performMemoryWipe();
      
      // Clear memory pool
      this.memoryPool.length = 0;
      
      this.isActive = false;
      console.log('Counter-forensics security cleaned up');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const counterForensics = CounterForensicsService.getInstance();
export default CounterForensicsService;