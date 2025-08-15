import { BalanceChecker, BalanceResult } from './balanceChecker';
import { electronAPI } from '../utils/electron';

export interface WatchedAddress {
  id: string;
  address: string;
  chain: string;
  name?: string;
  isWatchOnly: boolean;
  lastBalance?: string;
  lastChecked?: Date;
  alertThreshold?: number; // Percentage change to trigger alert
  checkInterval?: number; // Minutes between checks
  createdAt: Date;
}

export interface BalanceHistory {
  id: string;
  addressId: string;
  balance: string;
  formattedBalance: string;
  usdValue?: number;
  timestamp: Date;
  changePercent?: number;
  changeAmount?: string;
}

export interface BalanceAlert {
  id: string;
  addressId: string;
  type: 'increase' | 'decrease' | 'threshold';
  previousBalance: string;
  newBalance: string;
  changePercent: number;
  changeAmount: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export class WalletWatcherService {
  private static watchedAddresses: Map<string, WatchedAddress> = new Map();
  private static balanceHistory: Map<string, BalanceHistory[]> = new Map();
  private static alerts: BalanceAlert[] = [];
  private static checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private static alertCallbacks: ((alert: BalanceAlert) => void)[] = [];

  /**
   * Add a watch-only address
   */
  static addWatchAddress(
    address: string,
    chain: string,
    options?: {
      name?: string;
      alertThreshold?: number;
      checkInterval?: number;
    }
  ): WatchedAddress {
    const id = `${chain}-${address}`;
    
    const watchedAddress: WatchedAddress = {
      id,
      address,
      chain,
      name: options?.name,
      isWatchOnly: true,
      alertThreshold: options?.alertThreshold || 5, // Default 5% change
      checkInterval: options?.checkInterval || 15, // Default 15 minutes
      createdAt: new Date(),
    };

    this.watchedAddresses.set(id, watchedAddress);
    
    // Start periodic checking
    this.startPeriodicCheck(watchedAddress);
    
    // Do initial check
    this.checkBalance(watchedAddress);
    
    return watchedAddress;
  }

  /**
   * Start periodic balance checking for an address
   */
  private static startPeriodicCheck(address: WatchedAddress) {
    // Clear existing interval if any
    const existingInterval = this.checkIntervals.get(address.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set new interval
    const interval = setInterval(
      () => this.checkBalance(address),
      (address.checkInterval || 15) * 60 * 1000 // Convert minutes to ms
    );

    this.checkIntervals.set(address.id, interval);
  }

  /**
   * Check balance for a watched address
   */
  static async checkBalance(address: WatchedAddress): Promise<BalanceResult | null> {
    try {
      console.log(`Checking balance for ${address.name || address.address} on ${address.chain}`);
      
      const result = await BalanceChecker.checkBalance(
        address.chain,
        address.address
      );

      // Update last checked info
      address.lastBalance = result.balance;
      address.lastChecked = new Date();
      this.watchedAddresses.set(address.id, address);

      // Add to history
      const history = this.addToHistory(address, result);

      // Check for alerts
      this.checkForAlerts(address, history);

      return result;
    } catch (error) {
      console.error(`Failed to check balance for ${address.address}:`, error);
      return null;
    }
  }

  /**
   * Add balance result to history
   */
  private static addToHistory(
    address: WatchedAddress,
    result: BalanceResult
  ): BalanceHistory {
    const historyKey = address.id;
    const history = this.balanceHistory.get(historyKey) || [];
    
    // Get previous balance for comparison
    const previousEntry = history[history.length - 1];
    let changePercent = 0;
    let changeAmount = '0';

    if (previousEntry && previousEntry.balance !== '0') {
      const previous = parseFloat(previousEntry.balance);
      const current = parseFloat(result.balance);
      
      if (previous > 0) {
        changePercent = ((current - previous) / previous) * 100;
        changeAmount = (current - previous).toString();
      }
    }

    const historyEntry: BalanceHistory = {
      id: `${historyKey}-${Date.now()}`,
      addressId: address.id,
      balance: result.balance,
      formattedBalance: result.formattedBalance,
      usdValue: result.usdValue,
      timestamp: new Date(),
      changePercent,
      changeAmount,
    };

    history.push(historyEntry);
    
    // Keep only last 100 entries per address
    if (history.length > 100) {
      history.shift();
    }

    this.balanceHistory.set(historyKey, history);
    
    return historyEntry;
  }

  /**
   * Check if we should trigger alerts
   */
  private static checkForAlerts(
    address: WatchedAddress,
    latestHistory: BalanceHistory
  ) {
    if (!latestHistory.changePercent || !address.alertThreshold) {
      return;
    }

    const absChange = Math.abs(latestHistory.changePercent);
    
    // Check if change exceeds threshold
    if (absChange >= address.alertThreshold) {
      const alert: BalanceAlert = {
        id: `alert-${Date.now()}`,
        addressId: address.id,
        type: latestHistory.changePercent > 0 ? 'increase' : 'decrease',
        previousBalance: latestHistory.balance,
        newBalance: latestHistory.balance,
        changePercent: latestHistory.changePercent,
        changeAmount: latestHistory.changeAmount || '0',
        message: `${address.name || address.address} balance ${
          latestHistory.changePercent > 0 ? 'increased' : 'decreased'
        } by ${absChange.toFixed(2)}% on ${address.chain}`,
        timestamp: new Date(),
        isRead: false,
      };

      this.alerts.push(alert);
      
      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts.shift();
      }

      // Trigger callbacks
      this.alertCallbacks.forEach(callback => callback(alert));
      
      // Show browser notification if available
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Balance Alert', {
            body: alert.message,
            icon: '/icon.svg',
          });
        }
      }
    }
  }

  /**
   * Register alert callback
   */
  static onAlert(callback: (alert: BalanceAlert) => void) {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get all watched addresses
   */
  static getWatchedAddresses(): WatchedAddress[] {
    return Array.from(this.watchedAddresses.values());
  }

  /**
   * Get balance history for an address
   */
  static getHistory(addressId: string): BalanceHistory[] {
    return this.balanceHistory.get(addressId) || [];
  }

  /**
   * Get all alerts
   */
  static getAlerts(unreadOnly = false): BalanceAlert[] {
    if (unreadOnly) {
      return this.alerts.filter(a => !a.isRead);
    }
    return this.alerts;
  }

  /**
   * Mark alert as read
   */
  static markAlertRead(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
    }
  }

  /**
   * Remove watched address
   */
  static removeWatchedAddress(addressId: string) {
    // Clear interval
    const interval = this.checkIntervals.get(addressId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(addressId);
    }

    // Remove from watched list
    this.watchedAddresses.delete(addressId);
    
    // Clear history
    this.balanceHistory.delete(addressId);
  }

  /**
   * Update check interval for an address
   */
  static updateCheckInterval(addressId: string, intervalMinutes: number) {
    const address = this.watchedAddresses.get(addressId);
    if (address) {
      address.checkInterval = intervalMinutes;
      this.watchedAddresses.set(addressId, address);
      this.startPeriodicCheck(address);
    }
  }

  /**
   * Update alert threshold for an address
   */
  static updateAlertThreshold(addressId: string, threshold: number) {
    const address = this.watchedAddresses.get(addressId);
    if (address) {
      address.alertThreshold = threshold;
      this.watchedAddresses.set(addressId, address);
    }
  }

  /**
   * Get statistics for a watched address
   */
  static getAddressStats(addressId: string) {
    const history = this.getHistory(addressId);
    if (history.length === 0) {
      return null;
    }

    const latestBalance = parseFloat(history[history.length - 1].balance);
    const oldestBalance = parseFloat(history[0].balance);
    const highestBalance = Math.max(...history.map(h => parseFloat(h.balance)));
    const lowestBalance = Math.min(...history.map(h => parseFloat(h.balance)));
    
    const totalChange = latestBalance - oldestBalance;
    const totalChangePercent = oldestBalance > 0 
      ? ((latestBalance - oldestBalance) / oldestBalance) * 100 
      : 0;

    return {
      currentBalance: latestBalance,
      highestBalance,
      lowestBalance,
      totalChange,
      totalChangePercent,
      historyCount: history.length,
      firstCheck: history[0].timestamp,
      lastCheck: history[history.length - 1].timestamp,
    };
  }

  /**
   * Export history to CSV
   */
  static exportHistoryToCsv(addressId: string): string {
    const history = this.getHistory(addressId);
    const address = this.watchedAddresses.get(addressId);
    
    if (!address || history.length === 0) {
      return '';
    }

    const headers = ['Timestamp', 'Balance', 'USD Value', 'Change %', 'Change Amount'];
    const rows = history.map(h => [
      h.timestamp.toISOString(),
      h.formattedBalance,
      h.usdValue?.toFixed(2) || 'N/A',
      h.changePercent?.toFixed(2) || '0',
      h.changeAmount || '0',
    ]);

    const csv = [
      `Address: ${address.address}`,
      `Chain: ${address.chain}`,
      `Name: ${address.name || 'N/A'}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return csv;
  }
}