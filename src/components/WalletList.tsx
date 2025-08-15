import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Copy, ExternalLink, Eye, EyeOff,
  AlertCircle, Clock, Trash2, Check, X,
  Plus
} from 'lucide-react';
import { useStore } from '../stores/appStore';
import { toast } from 'react-hot-toast';
import { WalletWatcherService } from '../services/walletWatcherService';

interface WalletListProps {
  viewMode: 'grid' | 'list';
  searchQuery: string;
  selectedChain: string;
  balancesOnly?: boolean;
}

export default function WalletList({ viewMode, searchQuery, selectedChain, balancesOnly = false }: WalletListProps) {
  const { wallets, selectWallet, deleteWallet, deleteWallets } = useStore();
  const [showPrivateKeys, setShowPrivateKeys] = useState<Set<number>>(new Set());
  const [selectedWallets, setSelectedWallets] = useState<Set<number>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredWallets = useMemo(() => {
    return wallets.filter(wallet => {
      const matchesChain = selectedChain === 'all' || wallet.chain === selectedChain;
      const matchesSearch = !searchQuery || 
        wallet.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet.chain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet.publicKey.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Check balances only filter
      const hasBalance = !balancesOnly || (wallet.balance && parseFloat(wallet.balance) > 0) || (wallet.usdValue && wallet.usdValue > 0);
      
      return matchesChain && matchesSearch && hasBalance;
    });
  }, [wallets, searchQuery, selectedChain, balancesOnly]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const togglePrivateKey = (walletId: number) => {
    setShowPrivateKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(walletId)) {
        newSet.delete(walletId);
      } else {
        newSet.add(walletId);
      }
      return newSet;
    });
  };

  const toggleWalletSelection = (walletId: number) => {
    setSelectedWallets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(walletId)) {
        newSet.delete(walletId);
      } else {
        newSet.add(walletId);
      }
      return newSet;
    });
  };

  const selectAllWallets = () => {
    setSelectedWallets(new Set(filteredWallets.map(w => w.id!)));
  };

  const clearSelection = () => {
    setSelectedWallets(new Set());
    setBulkSelectMode(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedWallets.size === 0) return;
    
    if (!confirm(`Delete ${selectedWallets.size} selected wallet(s)?`)) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteWallets(Array.from(selectedWallets));
      if (success) {
        toast.success(`Deleted ${selectedWallets.size} wallet(s)`);
        clearSelection();
      } else {
        toast.error('Failed to delete wallets');
      }
    } catch (error) {
      toast.error('Failed to delete wallets');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteWallet = async (walletId: number) => {
    if (!confirm('Delete this wallet?')) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteWallet(walletId);
      if (success) {
        toast.success('Wallet deleted');
      } else {
        toast.error('Failed to delete wallet');
      }
    } catch (error) {
      toast.error('Failed to delete wallet');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddToWatcher = (wallet: any) => {
    const address = wallet.address || wallet.publicKey;
    if (!address) {
      toast.error('No address available for watching');
      return;
    }

    try {
      WalletWatcherService.addWatchAddress(
        address,
        wallet.chain,
        {
          name: `${wallet.chain} Wallet`,
          alertThreshold: 5,
          checkInterval: 15,
        }
      );
      toast.success('Added to wallet watcher');
    } catch (error) {
      toast.error('Failed to add to watcher');
    }
  };

  const getChainColor = (chain: string) => {
    const colors: Record<string, string> = {
      BTC: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
      ETH: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
      BSC: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
      POLYGON: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
      SOL: 'text-green-400 bg-green-400/10 border-green-400/30',
      XMR: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
    };
    return colors[chain] || 'text-white/50 bg-white/5 border-white/10';
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatBalance = (balance: string | undefined, chain: string) => {
    if (!balance || balance === '0') return '0.00';
    
    // Convert from smallest unit based on chain
    const decimals: Record<string, number> = {
      BTC: 8,
      ETH: 18,
      BSC: 18,
      POLYGON: 18,
      SOL: 9,
      LTC: 8,
      DOGE: 8,
    };
    
    const decimal = decimals[chain] || 18;
    const value = parseFloat(balance) / Math.pow(10, decimal);
    
    if (value < 0.000001) return '< 0.000001';
    if (value < 1) return value.toFixed(6);
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const bulkControlsSection = (
    <div className="glass-panel p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {!bulkSelectMode ? (
            <button
              onClick={() => setBulkSelectMode(true)}
              className="glass-button flex items-center space-x-2"
              disabled={isDeleting}
            >
              <Check className="w-4 h-4" />
              <span>Select</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={clearSelection}
                className="glass-button flex items-center space-x-2"
                disabled={isDeleting}
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={selectAllWallets}
                className="glass-button flex items-center space-x-2"
                disabled={isDeleting}
              >
                <Check className="w-4 h-4" />
                <span>Select All</span>
              </button>
            </div>
          )}
          
          {bulkSelectMode && selectedWallets.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white/70">
                {selectedWallets.size} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                className="glass-button-danger flex items-center space-x-2"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Selected'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (filteredWallets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 glass-panel rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-white/30" />
          </div>
          <h3 className="text-xl font-light text-white/70 mb-2">No Wallets Found</h3>
          <p className="text-sm text-white/40">
            {searchQuery || selectedChain !== 'all' 
              ? 'Try adjusting your filters'
              : 'Import your mnemonics to get started'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div>
        {bulkControlsSection}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWallets.map((wallet, index) => (
            <motion.div
              key={wallet.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel p-6 hover-lift cursor-pointer"
              onClick={() => selectWallet(wallet)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {bulkSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedWallets.has(wallet.id!)}
                      onChange={() => toggleWalletSelection(wallet.id!)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-nexus-glass-border bg-nexus-glass text-nexus-accent focus:ring-nexus-accent"
                    />
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChainColor(wallet.chain)}`}>
                    {wallet.chain}
                  </span>
                  {wallet.lastChecked && (
                    <div className="flex items-center text-xs text-white/40">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(wallet.lastChecked).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                <div className="status-online" />
              </div>

              {/* Address */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/40 mb-1">Address</p>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono text-sm text-white/80">
                      {formatAddress(wallet.address || wallet.publicKey)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(wallet.address || wallet.publicKey, 'Address');
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <p className="text-xs text-white/40 mb-1">Balance</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-light text-white">
                      {formatBalance(wallet.balance, wallet.chain)}
                    </p>
                    {wallet.usdValue && wallet.usdValue > 0 && (
                      <p className="text-sm text-nexus-accent">
                        ${wallet.usdValue.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Derivation Path */}
                <div>
                  <p className="text-xs text-white/40 mb-1">Derivation Path</p>
                  <p className="font-mono text-xs text-white/60">{wallet.derivationPath}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-nexus-glass-border">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePrivateKey(wallet.id!);
                    }}
                    className="flex items-center space-x-1 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    {showPrivateKeys.has(wallet.id!) ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide Key</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show Key</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToWatcher(wallet);
                    }}
                    className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Watch</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open block explorer
                    }}
                    className="flex items-center space-x-1 text-xs text-nexus-accent hover:text-nexus-accent-dim transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Explorer</span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWallet(wallet.id!);
                    }}
                    className="flex items-center space-x-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Private Key Display */}
              {showPrivateKeys.has(wallet.id!) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <p className="text-xs text-red-400 mb-2">Private Key (Keep Secret!)</p>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono text-xs text-white/80 break-all">
                      {wallet.privateKey}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(wallet.privateKey, 'Private key');
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      {bulkControlsSection}
      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-nexus-glass-border">
              {bulkSelectMode && (
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedWallets.size === filteredWallets.length && filteredWallets.length > 0}
                    onChange={() => {
                      if (selectedWallets.size === filteredWallets.length) {
                        clearSelection();
                      } else {
                        selectAllWallets();
                      }
                    }}
                    className="w-4 h-4 rounded border-nexus-glass-border bg-nexus-glass text-nexus-accent focus:ring-nexus-accent"
                  />
                </th>
              )}
              <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Chain</th>
              <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Address</th>
              <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Balance</th>
              <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">USD Value</th>
              <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Path</th>
              <th className="text-right p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWallets.map((wallet, index) => (
              <motion.tr
                key={wallet.id || index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-nexus-glass-border hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => selectWallet(wallet)}
              >
                {bulkSelectMode && (
                  <td className="p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedWallets.has(wallet.id!)}
                      onChange={() => toggleWalletSelection(wallet.id!)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-nexus-glass-border bg-nexus-glass text-nexus-accent focus:ring-nexus-accent"
                    />
                  </td>
                )}
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChainColor(wallet.chain)}`}>
                    {wallet.chain}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm text-white/80">
                      {formatAddress(wallet.address || wallet.publicKey)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(wallet.address || wallet.publicKey, 'Address');
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm text-white">
                    {formatBalance(wallet.balance, wallet.chain)}
                  </span>
                </td>
                <td className="p-4">
                  {wallet.usdValue && wallet.usdValue > 0 ? (
                    <span className="text-sm text-nexus-accent">
                      ${wallet.usdValue.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-sm text-white/30">-</span>
                  )}
                </td>
                <td className="p-4">
                  <span className="font-mono text-xs text-white/60">
                    {wallet.derivationPath}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePrivateKey(wallet.id!);
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Toggle private key visibility"
                    >
                      {showPrivateKeys.has(wallet.id!) ? (
                        <EyeOff className="w-4 h-4 text-white/40" />
                      ) : (
                        <Eye className="w-4 h-4 text-white/40" />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToWatcher(wallet);
                      }}
                      className="p-1 hover:bg-blue-500/10 rounded transition-colors"
                      title="Add to watcher"
                    >
                      <Plus className="w-4 h-4 text-blue-400" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open block explorer
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Open in block explorer"
                    >
                      <ExternalLink className="w-4 h-4 text-white/40" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWallet(wallet.id!);
                      }}
                      className="p-1 hover:bg-red-500/10 rounded transition-colors"
                      disabled={isDeleting}
                      title="Delete wallet"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}