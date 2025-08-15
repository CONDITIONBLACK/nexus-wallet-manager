import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Plus, Search, RefreshCw, Download, 
  Settings, LogOut, TrendingUp, Eye,
  Grid, List, ChevronDown, Shield, Filter
} from 'lucide-react';
import { useStore } from '../stores/appStore';
import MnemonicInput from './MnemonicInput';
import WalletList from './WalletList';
import WalletDetail from './WalletDetail';
import SettingsPanel from './SettingsPanel';
import PortfolioOverview from './PortfolioOverview';
import WalletWatcher from './WalletWatcher';
import { toast } from 'react-hot-toast';

type View = 'portfolio' | 'wallets' | 'watcher' | 'import' | 'settings';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('portfolio');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [balancesOnly, setBalancesOnly] = useState(false);
  
  const { wallets, selectedWallet, logout } = useStore();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      toast.success('Logged out successfully');
    }
  };

  const totalValue = wallets.reduce((sum, wallet) => sum + (wallet.usdValue || 0), 0);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 glass-panel m-4 p-6 flex flex-col"
      >
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-nexus-accent" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-white">Nexus</h1>
            <p className="text-xs text-white/50">Wallet Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setCurrentView('portfolio')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              currentView === 'portfolio'
                ? 'bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent'
                : 'hover:bg-white/5 text-white/70 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Portfolio</span>
          </button>

          <button
            onClick={() => setCurrentView('wallets')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              currentView === 'wallets'
                ? 'bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent'
                : 'hover:bg-white/5 text-white/70 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Wallets</span>
            {wallets.length > 0 && (
              <span className="ml-auto text-xs bg-nexus-accent/20 px-2 py-0.5 rounded-full">
                {wallets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('watcher')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              currentView === 'watcher'
                ? 'bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent'
                : 'hover:bg-white/5 text-white/70 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Watcher</span>
          </button>

          <button
            onClick={() => setCurrentView('import')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              currentView === 'import'
                ? 'bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent'
                : 'hover:bg-white/5 text-white/70 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Import</span>
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              currentView === 'settings'
                ? 'bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent'
                : 'hover:bg-white/5 text-white/70 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Portfolio value */}
        <div className="glass-panel p-4 mb-4">
          <p className="text-xs text-white/50 mb-1">Total Portfolio</p>
          <p className="text-2xl font-light text-white">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center mt-2 text-nexus-accent text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>+12.5% (24h)</span>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="glass-button flex items-center justify-center space-x-2 text-red-400 hover:text-red-300"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-panel m-4 mb-0 p-6 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-light text-white">
              {currentView === 'portfolio' && 'Portfolio Overview'}
              {currentView === 'wallets' && 'Your Wallets'}
              {currentView === 'watcher' && 'Wallet Watcher'}
              {currentView === 'import' && 'Import Wallets'}
              {currentView === 'settings' && 'Settings'}
            </h2>
            
            {currentView === 'wallets' && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input pl-10 pr-4 py-2 w-64"
                    placeholder="Search wallets..."
                  />
                </div>

                {/* Chain filter */}
                <div className="relative">
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="glass-input pr-10 appearance-none cursor-pointer"
                  >
                    <option value="all">All Chains</option>
                    <option value="BTC">Bitcoin</option>
                    <option value="ETH">Ethereum</option>
                    <option value="BSC">BSC</option>
                    <option value="POLYGON">Polygon</option>
                    <option value="SOL">Solana</option>
                    <option value="XMR">Monero</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                </div>
              </>
            )}
          </div>

          {currentView === 'wallets' && (
            <div className="flex items-center space-x-2">
              {/* Balance Filter Toggle */}
              <button
                onClick={() => setBalancesOnly(!balancesOnly)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  balancesOnly
                    ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/30'
                    : 'bg-nexus-glass text-white/60 border border-nexus-border hover:bg-white/5'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Balances Only</span>
              </button>

              {/* View mode toggle */}
              <div className="flex items-center bg-nexus-glass rounded-lg border border-nexus-glass-border p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-nexus-accent/20 text-nexus-accent'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'list'
                      ? 'bg-nexus-accent/20 text-nexus-accent'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Action buttons */}
              <button className="glass-button p-3">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="glass-button p-3">
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.header>

        {/* Content area */}
        <div className="flex-1 p-4 pt-0 overflow-auto">
          <AnimatePresence mode="wait">
            {currentView === 'wallets' && (
              <motion.div
                key="wallets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <WalletList
                  viewMode={viewMode}
                  searchQuery={searchQuery}
                  selectedChain={selectedChain}
                  balancesOnly={balancesOnly}
                />
              </motion.div>
            )}

            {currentView === 'portfolio' && (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <PortfolioOverview />
              </motion.div>
            )}

            {currentView === 'import' && (
              <motion.div
                key="import"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <MnemonicInput />
              </motion.div>
            )}

            {currentView === 'watcher' && (
              <motion.div
                key="watcher"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <WalletWatcher />
              </motion.div>
            )}

            {currentView === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <SettingsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Wallet detail modal */}
      <AnimatePresence>
        {selectedWallet && (
          <WalletDetail />
        )}
      </AnimatePresence>
    </div>
  );
}