import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, Plus, Bell, TrendingUp, TrendingDown, 
  Clock, AlertCircle, RefreshCw, Trash2, Download,
  Filter, ChevronDown, Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { WalletWatcherService, WatchedAddress, BalanceAlert, BalanceHistory } from '../services/walletWatcherService';
import { CHAIN_CONFIGS } from '../services/walletDerivation';

export default function WalletWatcher() {
  const [watchedAddresses, setWatchedAddresses] = useState<WatchedAddress[]>([]);
  const [alerts, setAlerts] = useState<BalanceAlert[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<WatchedAddress | null>(null);
  const [history, setHistory] = useState<BalanceHistory[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState(false);
  
  // Form state for adding new address
  const [newAddress, setNewAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState('ETH');
  const [addressName, setAddressName] = useState('');
  const [checkInterval, setCheckInterval] = useState(15);
  const [alertThreshold, setAlertThreshold] = useState(5);

  useEffect(() => {
    // Load watched addresses
    loadWatchedAddresses();
    
    // Subscribe to alerts
    WalletWatcherService.onAlert((alert) => {
      toast.success(alert.message);
      loadAlerts();
    });

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadWatchedAddresses();
      loadAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadWatchedAddresses = () => {
    const addresses = WalletWatcherService.getWatchedAddresses();
    setWatchedAddresses(addresses);
  };

  const loadAlerts = () => {
    const allAlerts = WalletWatcherService.getAlerts();
    setAlerts(allAlerts);
  };

  const handleAddAddress = () => {
    if (!newAddress || !selectedChain) {
      toast.error('Please enter an address and select a chain');
      return;
    }

    try {
      const watched = WalletWatcherService.addWatchAddress(
        newAddress,
        selectedChain,
        {
          name: addressName || undefined,
          checkInterval,
          alertThreshold,
        }
      );

      toast.success(`Now watching ${watched.name || watched.address}`);
      loadWatchedAddresses();
      
      // Reset form
      setNewAddress('');
      setAddressName('');
      setCheckInterval(15);
      setAlertThreshold(5);
      setShowAddModal(false);
    } catch (error) {
      toast.error('Failed to add watch address');
    }
  };

  const handleRemoveAddress = (addressId: string) => {
    if (confirm('Remove this address from watch list?')) {
      WalletWatcherService.removeWatchedAddress(addressId);
      loadWatchedAddresses();
      toast.success('Address removed from watch list');
    }
  };

  const handleRefreshAddress = async (address: WatchedAddress) => {
    const toastId = toast.loading(`Checking ${address.name || address.address}...`);
    const result = await WalletWatcherService.checkBalance(address);
    
    if (result) {
      toast.success('Balance updated', { id: toastId });
      loadWatchedAddresses();
    } else {
      toast.error('Failed to check balance', { id: toastId });
    }
  };

  const handleSelectAddress = (address: WatchedAddress) => {
    setSelectedAddress(address);
    const addressHistory = WalletWatcherService.getHistory(address.id);
    setHistory(addressHistory);
  };

  const handleExportHistory = (addressId: string) => {
    const csv = WalletWatcherService.exportHistoryToCsv(addressId);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-history-${addressId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('History exported');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled');
      } else {
        toast.error('Notifications denied');
      }
    } else {
      toast.error('Notifications not supported');
    }
  };

  const filteredAddresses = balanceFilter 
    ? watchedAddresses.filter(a => a.lastBalance && parseFloat(a.lastBalance) > 0)
    : watchedAddresses;

  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Eye className="w-6 h-6 text-nexus-accent" />
            <h2 className="text-xl font-medium text-white">Wallet Watcher</h2>
            <span className="text-sm text-white/50">
              {watchedAddresses.length} addresses monitored
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Balance Filter Toggle */}
            <button
              onClick={() => setBalanceFilter(!balanceFilter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                balanceFilter
                  ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/30'
                  : 'bg-nexus-glass text-white/60 border border-nexus-border hover:bg-white/5'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Balances Only</span>
            </button>

            {/* Notifications */}
            {('Notification' in window && Notification.permission !== 'granted') && (
              <button
                onClick={requestNotificationPermission}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 bg-nexus-glass text-white/60 border border-nexus-border hover:bg-white/5"
              >
                <Bell className="w-4 h-4" />
                <span>Enable Alerts</span>
              </button>
            )}

            {/* Alerts Badge */}
            <div className="relative">
              <Bell className="w-5 h-5 text-white/70" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </div>

            {/* Add Address Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="glass-button-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Address</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-nexus-glass rounded-lg p-3">
            <div className="text-xs text-white/50">Total Monitored</div>
            <div className="text-lg font-medium text-white">{watchedAddresses.length}</div>
          </div>
          <div className="bg-nexus-glass rounded-lg p-3">
            <div className="text-xs text-white/50">With Balance</div>
            <div className="text-lg font-medium text-white">
              {watchedAddresses.filter(a => a.lastBalance && parseFloat(a.lastBalance) > 0).length}
            </div>
          </div>
          <div className="bg-nexus-glass rounded-lg p-3">
            <div className="text-xs text-white/50">Active Alerts</div>
            <div className="text-lg font-medium text-white">{unreadAlerts}</div>
          </div>
          <div className="bg-nexus-glass rounded-lg p-3">
            <div className="text-xs text-white/50">Last Check</div>
            <div className="text-lg font-medium text-white">
              {watchedAddresses[0]?.lastChecked 
                ? new Date(watchedAddresses[0].lastChecked).toLocaleTimeString()
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Watched Addresses List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white mb-4">Watched Addresses</h3>
          
          {filteredAddresses.length === 0 ? (
            <div className="glass-panel p-6 text-center">
              <Eye className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/50">
                {balanceFilter 
                  ? 'No addresses with balance found'
                  : 'No addresses being watched'}
              </p>
            </div>
          ) : (
            filteredAddresses.map((address) => {
              const stats = WalletWatcherService.getAddressStats(address.id);
              
              return (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-panel p-4 cursor-pointer transition-all ${
                    selectedAddress?.id === address.id 
                      ? 'border-nexus-accent/30' 
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => handleSelectAddress(address)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {address.name || 'Unnamed Address'}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-nexus-accent/10 text-nexus-accent">
                          {address.chain}
                        </span>
                      </div>
                      
                      <div className="text-xs text-white/50 font-mono truncate">
                        {address.address}
                      </div>
                      
                      {stats && (
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="text-sm text-white/70">
                            Balance: {stats.currentBalance.toFixed(8)}
                          </div>
                          {stats.totalChangePercent !== 0 && (
                            <div className={`flex items-center space-x-1 text-sm ${
                              stats.totalChangePercent > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {stats.totalChangePercent > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span>{Math.abs(stats.totalChangePercent).toFixed(2)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-white/40">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Every {address.checkInterval}m</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Alert at {address.alertThreshold}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshAddress(address);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4 text-white/70" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAddress(address.id);
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* History & Alerts */}
        <div className="space-y-4">
          {selectedAddress && history.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  History: {selectedAddress.name || selectedAddress.address}
                </h3>
                <button
                  onClick={() => handleExportHistory(selectedAddress.id)}
                  className="glass-button flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
              
              <div className="glass-panel p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {history.slice(-20).reverse().map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-2 border-b border-nexus-border last:border-0">
                      <div>
                        <div className="text-sm text-white">
                          {entry.formattedBalance}
                        </div>
                        <div className="text-xs text-white/50">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      {entry.changePercent !== 0 && (
                        <div className={`flex items-center space-x-1 text-sm ${
                          entry.changePercent > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {entry.changePercent > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{Math.abs(entry.changePercent).toFixed(2)}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <>
              <h3 className="text-lg font-medium text-white mb-4">Recent Alerts</h3>
              <div className="glass-panel p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {alerts.slice(-10).reverse().map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-3 rounded-lg ${
                        alert.isRead ? 'bg-nexus-glass' : 'bg-nexus-accent/10 border border-nexus-accent/30'
                      }`}
                      onClick={() => {
                        WalletWatcherService.markAlertRead(alert.id);
                        loadAlerts();
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {alert.type === 'increase' ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <div>
                            <div className="text-sm text-white">{alert.message}</div>
                            <div className="text-xs text-white/50">
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel-elevated p-6 max-w-md w-full m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-white mb-4">Add Watch Address</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Address</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="glass-input"
                    placeholder="0x... or bc1q..."
                  />
                </div>

                <div>
                  <label className="text-sm text-white/70 mb-2 block">Chain</label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="glass-input"
                  >
                    {Object.entries(CHAIN_CONFIGS).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.name} ({config.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-white/70 mb-2 block">Name (optional)</label>
                  <input
                    type="text"
                    value={addressName}
                    onChange={(e) => setAddressName(e.target.value)}
                    className="glass-input"
                    placeholder="My Wallet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">
                      Check Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={checkInterval}
                      onChange={(e) => setCheckInterval(parseInt(e.target.value) || 15)}
                      className="glass-input"
                      min="1"
                      max="1440"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">
                      Alert Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={alertThreshold}
                      onChange={(e) => setAlertThreshold(parseInt(e.target.value) || 5)}
                      className="glass-input"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="glass-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAddress}
                    className="glass-button-primary"
                  >
                    Start Watching
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}