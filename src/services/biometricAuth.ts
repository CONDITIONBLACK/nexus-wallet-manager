/**
 * Biometric Authentication Service
 * Provides Face ID and Touch ID support for secure authentication
 */

interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

interface BiometricCapabilities {
  available: boolean;
  biometryType: 'touchID' | 'faceID' | 'none';
  error?: string;
}

class BiometricAuthService {
  private static instance: BiometricAuthService;
  private isSupported: boolean = false;
  private biometryType: 'touchID' | 'faceID' | 'none' = 'none';

  private constructor() {
    this.initialize();
  }

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const capabilities = await this.checkCapabilities();
      this.isSupported = capabilities.available;
      this.biometryType = capabilities.biometryType;
    } catch (error) {
      console.error('Failed to initialize biometric auth:', error);
      this.isSupported = false;
      this.biometryType = 'none';
    }
  }

  /**
   * Check if biometric authentication is available on the device
   */
  public async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      // Check if we're in an Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        const result = await window.electronAPI.checkBiometricCapabilities();
        return result;
      }

      // Fallback for web environment (not supported)
      return {
        available: false,
        biometryType: 'none',
        error: 'Biometric authentication not available in web environment'
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        available: false,
        biometryType: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Prompt user for biometric authentication
   */
  public async authenticate(reason: string = 'Authenticate to access your wallets'): Promise<BiometricAuthResult> {
    try {
      if (!this.isSupported) {
        return {
          success: false,
          error: 'Biometric authentication not supported on this device'
        };
      }

      // Check if we're in an Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        const result = await window.electronAPI.authenticateWithBiometrics(reason);
        return result;
      }

      return {
        success: false,
        error: 'Biometric authentication not available in web environment'
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Check if biometric authentication is available
   */
  public isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * Get the type of biometric authentication available
   */
  public getBiometryType(): 'touchID' | 'faceID' | 'none' {
    return this.biometryType;
  }

  /**
   * Enable biometric authentication for the current user
   */
  public async enableBiometricAuth(password: string): Promise<BiometricAuthResult> {
    try {
      if (!this.isSupported) {
        return {
          success: false,
          error: 'Biometric authentication not supported'
        };
      }

      // Store encrypted password for biometric unlock
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        const result = await window.electronAPI.enableBiometricAuth(password);
        return result;
      }

      return {
        success: false,
        error: 'Cannot enable biometric authentication in web environment'
      };
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric authentication'
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  public async disableBiometricAuth(): Promise<BiometricAuthResult> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        const result = await window.electronAPI.disableBiometricAuth();
        return result;
      }

      return {
        success: false,
        error: 'Cannot disable biometric authentication in web environment'
      };
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable biometric authentication'
      };
    }
  }

  /**
   * Check if biometric authentication is enabled for the current user
   */
  public async isBiometricAuthEnabled(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        const result = await window.electronAPI.isBiometricAuthEnabled();
        return result;
      }
      return false;
    } catch (error) {
      console.error('Error checking biometric auth status:', error);
      return false;
    }
  }

  /**
   * Authenticate using biometrics and retrieve stored password
   */
  public async authenticateAndGetPassword(): Promise<{ success: boolean; password?: string; error?: string }> {
    try {
      if (!this.isSupported) {
        return {
          success: false,
          error: 'Biometric authentication not supported'
        };
      }

      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        const result = await window.electronAPI.authenticateAndGetPassword();
        return result;
      }

      return {
        success: false,
        error: 'Biometric authentication not available in web environment'
      };
    } catch (error) {
      console.error('Error authenticating with biometrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Biometric authentication failed'
      };
    }
  }
}

// Export singleton instance
export const biometricAuth = BiometricAuthService.getInstance();
export default BiometricAuthService;