import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, PieChart, BarChart3, 
  Coins, Globe, Award 
} from 'lucide-react';
import { useStore } from '../stores/appStore';
import { PortfolioService, PortfolioSummary } from '../services/portfolioService';
import { SmartBalanceChecker } from '../services/smartBalanceChecker';
import BalanceStatus from './BalanceStatus';

export default function PortfolioOverview() {
  const { wallets } = useStore();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (wallets.length > 0) {
      generatePortfolioSummary();
    }
  }, [wallets]);

  const generatePortfolioSummary = async () => {
    setIsLoading(true);
    try {
      console.log(`🚀 Starting smart balance checks for ${wallets.length} wallets`);
      console.log(`📊 Cache stats:`, SmartBalanceChecker.getCacheStats());
      
      // Prepare balance check requests, filtering out invalid addresses
      const validRequests = wallets
        .filter(wallet => {
          const address = wallet.address || wallet.publicKey;
          
          if (!address) {
            console.warn(`Skipping wallet ${wallet.chain} - no address available`);
            return false;
          }
          
          // Skip public keys being used as addresses
          if (address.length === 66 && (address.startsWith('02') || address.startsWith('03'))) {
            console.warn(`Skipping wallet ${wallet.chain} - public key detected as address: ${address.substring(0, 10)}...`);
            return false;
          }
          
          return true;
        })
        .map(wallet => ({
          chain: wallet.chain,
          address: wallet.address || wallet.publicKey!
        }));

      console.log(`🔍 Smart checking balances for ${validRequests.length} valid wallets`);
      
      // Use smart balance checker with caching and direct RPC calls
      const balanceResults = await SmartBalanceChecker.batchCheckBalances(validRequests);
      
      console.log(`✅ Completed balance checks, got ${balanceResults.length} results`);
      console.log(`📊 Updated cache stats:`, SmartBalanceChecker.getCacheStats());

      const portfolioSummary = PortfolioService.generatePortfolioSummary(
        wallets.map(w => ({
          id: w.id!,
          chain: w.chain,
          address: w.address!,
          balance: w.balance,
          usdValue: w.usdValue,
          lastChecked: w.lastChecked,
        })),
        balanceResults
      );

      setPortfolio(portfolioSummary);
    } catch (error) {
      console.error('Error generating portfolio summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!portfolio && wallets.length === 0) {
    return (
      <div className="text-center py-12">
        <Coins className="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white/70 mb-2">No Wallets Found</h3>
        <p className="text-sm text-white/50">Import some wallets to see your portfolio overview.</p>
      </div>
    );
  }

  const stats = portfolio ? PortfolioService.getPortfolioStats(portfolio) : null;

  return (
    <div className="space-y-6">
      {/* Balance Status */}
      <BalanceStatus />
      
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-nexus-accent/10 border border-nexus-accent/30">
              <DollarSign className="w-5 h-5 text-nexus-accent" />
            </div>
            <span className="text-xs text-white/50">Total Value</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.totalValueFormatted || '$0.00'}
          </div>
          <div className="text-xs text-white/60 mt-1">
            {portfolio?.totalWallets || 0} wallets
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <Coins className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-white/50">Token Holdings</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.tokenPercentage || '0'}%
          </div>
          <div className="text-xs text-white/60 mt-1">
            vs {100 - parseFloat(stats?.tokenPercentage || '0')}% native
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-white/50">Networks</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.chainCount || 0}
          </div>
          <div className="text-xs text-white/60 mt-1">
            Top: {stats?.topChain || 'N/A'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30">
              <Award className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-white/50">Diversification</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.diversificationScore || 0}
          </div>
          <div className="text-xs text-white/60 mt-1">
            out of 100
          </div>
        </motion.div>
      </div>

      {/* Chain Breakdown */}
      {portfolio && portfolio.chains.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6"
        >
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-nexus-accent" />
            Chain Distribution
          </h3>
          <div className="space-y-3">
            {portfolio.chains.map((chain, index) => {
              const percentage = portfolio.totalValue > 0 
                ? (chain.totalValue / portfolio.totalValue) * 100 
                : 0;
              
              return (
                <div key={chain.chain} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-nexus-accent" 
                         style={{ opacity: 1 - (index * 0.15) }} />
                    <span className="text-sm font-medium text-white">{chain.chain}</span>
                    <span className="text-xs text-white/50">
                      {chain.walletCount} wallet{chain.walletCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      ${chain.totalValue.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/50">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Top Tokens */}
      {portfolio && portfolio.topTokens.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-6"
        >
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-nexus-accent" />
            Top Token Holdings
          </h3>
          <div className="space-y-3">
            {portfolio.topTokens.slice(0, 5).map((token, index) => (
              <div key={`${token.symbol}-${index}`} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-nexus-glass border border-nexus-border flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {token.symbol.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{token.symbol}</div>
                    <div className="text-xs text-white/50">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    ${token.totalValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-white/50">
                    {token.holders} holder{token.holders !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={generatePortfolioSummary}
          disabled={isLoading}
          className="glass-button-primary flex items-center space-x-2"
        >
          <TrendingUp className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Updating...' : 'Refresh Portfolio'}</span>
        </button>
      </div>
    </div>
  );
}