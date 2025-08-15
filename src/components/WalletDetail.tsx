import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Copy, ExternalLink, Download, Send, RefreshCw,
  Key, Shield, Globe, DollarSign, Clock
} from 'lucide-react';
import { useStore } from '../stores/appStore';
import { toast } from 'react-hot-toast';
import { BalanceChecker } from '../services/balanceChecker';
import { electronAPI } from '../utils/electron';

export default function WalletDetail() {
  const { selectedWallet, selectWallet, updateWalletBalance } = useStore();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'send' | 'export'>('info');

  if (!selectedWallet) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const refreshBalance = async () => {
    const address = selectedWallet.address || selectedWallet.publicKey;
    if (!address) return;
    
    // Check if we're accidentally using a public key as address
    if (address.length === 66 && (address.startsWith('02') || address.startsWith('03'))) {
      console.error(`Public key detected as address for ${selectedWallet.chain}: ${address}`);
      toast.error('Invalid address format detected. This wallet may need to be re-imported.');
      return;
    }
    
    setIsRefreshing(true);
    try {
      const balance = await BalanceChecker.checkBalance(
        selectedWallet.chain,
        address
      );
      
      if (balance && !balance.error) {
        // @ts-ignore
        await electronAPI.updateBalance(
          selectedWallet.id!,
          balance.balance
        );
        
        updateWalletBalance(
          selectedWallet.id!,
          balance.balance,
          balance.usdValue
        );
        
        toast.success('Balance updated');
      } else {
        toast.error(balance.error || 'Failed to fetch balance');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportWallet = async (format: 'json' | 'keystore') => {
    try {
      // @ts-ignore
      const data = await electronAPI.exportWallet(selectedWallet.id!, format);
      
      if (data) {
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data)], {
          type: format === 'json' ? 'application/json' : 'text/plain',
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallet-${selectedWallet.chain}-${selectedWallet.address || selectedWallet.publicKey.slice(0, 8)}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success(`Wallet exported as ${format.toUpperCase()}`);
      }
    } catch (error: any) {
      toast.error('Failed to export wallet');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-8"
      onClick={() => selectWallet(null)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel-elevated w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-nexus-glass-border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-light text-white mb-2">Wallet Details</h2>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedWallet.chain === 'BTC' ? 'bg-orange-400/10 text-orange-400 border border-orange-400/30' :
                  selectedWallet.chain === 'ETH' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/30' :
                  selectedWallet.chain === 'BSC' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30' :
                  'bg-white/10 text-white/70 border border-white/20'
                }`}>
                  {selectedWallet.chain}
                </span>
                <span className="text-sm text-white/50">
                  {selectedWallet.derivationPath}
                </span>
              </div>
            </div>
            <button
              onClick={() => selectWallet(null)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-nexus-glass-border">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-nexus-accent border-b-2 border-nexus-accent'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'send'
                ? 'text-nexus-accent border-b-2 border-nexus-accent'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Send Transaction
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-nexus-accent border-b-2 border-nexus-accent'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Export
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Balance */}
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white/70 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-nexus-accent" />
                    Balance
                  </h3>
                  <button
                    onClick={refreshBalance}
                    disabled={isRefreshing}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 text-white/50 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-light text-white">
                      {selectedWallet.balance || '0'} <span className="text-white/50">{selectedWallet.chain}</span>
                    </p>
                    {selectedWallet.usdValue && (
                      <p className="text-sm text-nexus-accent mt-1">
                        ≈ ${selectedWallet.usdValue.toFixed(2)} USD
                      </p>
                    )}
                  </div>
                  {selectedWallet.lastChecked && (
                    <div className="flex items-center text-xs text-white/40">
                      <Clock className="w-3 h-3 mr-1" />
                      Last updated: {new Date(selectedWallet.lastChecked).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="glass-panel p-6">
                <h3 className="text-sm font-medium text-white/70 mb-4 flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-nexus-accent" />
                  Public Address
                </h3>
                <div className="flex items-center space-x-3">
                  <p className="font-mono text-sm text-white/80 break-all flex-1">
                    {selectedWallet.address || selectedWallet.publicKey}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(selectedWallet.address || selectedWallet.publicKey, 'Address')}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4 text-white/50" />
                    </button>
                    <button
                      onClick={() => {
                        // Open block explorer
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Private Key */}
              <div className="glass-panel p-6 border-red-500/20">
                <h3 className="text-sm font-medium text-red-400 mb-4 flex items-center">
                  <Key className="w-4 h-4 mr-2" />
                  Private Key (Keep Secret!)
                </h3>
                {showPrivateKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <p className="font-mono text-xs text-white/80 break-all flex-1">
                        {selectedWallet.privateKey}
                      </p>
                      <button
                        onClick={() => copyToClipboard(selectedWallet.privateKey, 'Private key')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-white/50" />
                      </button>
                    </div>
                    <button
                      onClick={() => setShowPrivateKey(false)}
                      className="glass-button text-red-400 text-sm"
                    >
                      Hide Private Key
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPrivateKey(true)}
                    className="glass-button text-sm"
                  >
                    Reveal Private Key
                  </button>
                )}
              </div>

              {/* Metadata */}
              {selectedWallet.metadata && (
                <div className="glass-panel p-6">
                  <h3 className="text-sm font-medium text-white/70 mb-4 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-nexus-accent" />
                    Technical Details
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(selectedWallet.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-white/50 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-xs text-white/70">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'send' && (
            <div className="space-y-6">
              <div className="glass-panel p-6 text-center">
                <Send className="w-12 h-12 text-nexus-accent mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Transaction Signing</h3>
                <p className="text-sm text-white/60">
                  Transaction signing will be available in the next update.
                  This feature will allow you to create and sign transactions securely.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <h3 className="text-sm font-medium text-white/70 mb-4">Export Options</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => exportWallet('json')}
                    className="w-full glass-button flex items-center justify-between"
                  >
                    <span>Export as JSON</span>
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportWallet('keystore')}
                    className="w-full glass-button flex items-center justify-between"
                  >
                    <span>Export as Keystore</span>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-500/20">
                <p className="text-xs text-yellow-400">
                  ⚠️ Warning: Exported files contain sensitive information. Store them securely and never share them with anyone.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}