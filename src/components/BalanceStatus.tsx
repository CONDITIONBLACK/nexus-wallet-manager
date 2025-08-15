import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Database, Zap } from 'lucide-react';
import { SmartBalanceChecker } from '../services/smartBalanceChecker';

export default function BalanceStatus() {
  const [cacheStats, setCacheStats] = useState({ total: 0, valid: 0, expired: 0 });
  const [updateTime, setUpdateTime] = useState(new Date());

  useEffect(() => {
    const updateStats = () => {
      setCacheStats(SmartBalanceChecker.getCacheStats());
      setUpdateTime(new Date());
    };

    // Update stats immediately
    updateStats();

    // Update stats every 10 seconds
    const interval = setInterval(updateStats, 10000);

    return () => clearInterval(interval);
  }, []);

  const clearCache = () => {
    SmartBalanceChecker.clearCache();
    setCacheStats({ total: 0, valid: 0, expired: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center">
          <Activity className="w-4 h-4 mr-2 text-nexus-accent" />
          Balance Check Status
        </h3>
        <button
          onClick={clearCache}
          className="px-2 py-1 text-xs font-medium rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Clear Cache
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-xs text-white/60">Cached</div>
            <div className="text-sm font-medium text-white">{cacheStats.valid}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <div>
            <div className="text-xs text-white/60">Expired</div>
            <div className="text-sm font-medium text-white">{cacheStats.expired}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-green-400" />
          <div>
            <div className="text-xs text-white/60">Total</div>
            <div className="text-sm font-medium text-white">{cacheStats.total}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-nexus-accent" />
          <div>
            <div className="text-xs text-white/60">Updated</div>
            <div className="text-xs font-medium text-white">
              {updateTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-white/50">
        Smart caching: 10min TTL • Direct RPC calls • No rate limits • Batch processing
      </div>
    </motion.div>
  );
}