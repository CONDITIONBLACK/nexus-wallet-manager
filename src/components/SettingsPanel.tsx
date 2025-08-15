import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, Plus, X, Shield, Database, 
  Zap
} from 'lucide-react';
import { useStore } from '../stores/appStore';
import { toast } from 'react-hot-toast';
import { electronAPI } from '../utils/electron';

export default function SettingsPanel() {
  const { rpcNodes, addRpcNode, removeRpcNode, clearInvalidWallets, clearAllData } = useStore();
  const [newNode, setNewNode] = useState({ chain: '', url: '', name: '' });
  const [showAddNode, setShowAddNode] = useState(false);

  const handleAddNode = async () => {
    if (!newNode.chain || !newNode.url) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Validate URL
      new URL(newNode.url);
      
      // Add to store
      addRpcNode(newNode.chain, newNode.url);
      
      // Add to database
      await electronAPI.addRpcNode({
        chain: newNode.chain,
        url: newNode.url,
        name: newNode.name || 'Custom Node',
        priority: 0,
      });
      
      toast.success('RPC node added successfully');
      setNewNode({ chain: '', url: '', name: '' });
      setShowAddNode(false);
    } catch (error: any) {
      toast.error('Invalid URL format');
    }
  };

  const testRpcNode = async (_chain: string, url: string) => {
    const toastId = toast.loading('Testing RPC node...');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      
      if (response.ok) {
        toast.success('RPC node is responsive', { id: toastId });
      } else {
        toast.error('RPC node is not responding', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to connect to RPC node', { id: toastId });
    }
  };

  const handleClearInvalidWallets = async () => {
    const toastId = toast.loading('Checking for invalid wallets...');
    
    try {
      const removedCount = await clearInvalidWallets();
      if (removedCount > 0) {
        toast.success(`Removed ${removedCount} wallet(s) with invalid addresses`, { id: toastId });
      } else {
        toast.success('No invalid wallets found', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to clear invalid wallets', { id: toastId });
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ This will delete ALL wallet data and settings. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Please confirm again.')) return;
    
    const toastId = toast.loading('Clearing all data...');
    
    try {
      const success = await clearAllData();
      if (success) {
        toast.success('All data cleared successfully', { id: toastId });
        // Force page reload to reset state
        window.location.reload();
      } else {
        toast.error('Failed to clear data', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to clear data', { id: toastId });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-nexus-accent" />
          Security Settings
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Auto-lock</p>
              <p className="text-xs text-white/50">Lock wallet after inactivity</p>
            </div>
            <select className="glass-input w-32">
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="30">30 minutes</option>
              <option value="0">Never</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Clear clipboard</p>
              <p className="text-xs text-white/50">Auto-clear copied sensitive data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-nexus-glass peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nexus-accent/30"></div>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Database Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-6"
      >
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-nexus-accent" />
          Database Management
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-nexus-glass rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Database Size</p>
              <p className="text-xs text-white/50">Local encrypted storage</p>
            </div>
            <p className="text-sm text-nexus-accent">24.3 MB</p>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={handleClearInvalidWallets}
              className="glass-button flex-1 text-yellow-400"
            >
              Fix Invalid Wallets
            </button>
            <button className="glass-button flex-1">
              Export Database
            </button>
            <button 
              onClick={handleClearAllData}
              className="glass-button flex-1 text-red-400"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </motion.div>

      {/* RPC Nodes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Server className="w-5 h-5 mr-2 text-nexus-accent" />
            RPC Nodes
          </h3>
          <button
            onClick={() => setShowAddNode(!showAddNode)}
            className="glass-button p-2"
          >
            {showAddNode ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Add new node form */}
        {showAddNode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-4 bg-nexus-glass rounded-lg space-y-3"
          >
            <input
              type="text"
              placeholder="Chain (e.g., ETH, BSC)"
              value={newNode.chain}
              onChange={(e) => setNewNode({ ...newNode, chain: e.target.value.toUpperCase() })}
              className="glass-input"
            />
            <input
              type="text"
              placeholder="RPC URL"
              value={newNode.url}
              onChange={(e) => setNewNode({ ...newNode, url: e.target.value })}
              className="glass-input"
            />
            <input
              type="text"
              placeholder="Node Name (optional)"
              value={newNode.name}
              onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
              className="glass-input"
            />
            <button
              onClick={handleAddNode}
              className="glass-button-primary w-full"
            >
              Add Node
            </button>
          </motion.div>
        )}
        
        {/* Node list */}
        <div className="space-y-2">
          {Object.entries(rpcNodes).map(([chain, urls]) => (
            <div key={chain} className="space-y-2">
              <p className="text-xs text-white/50 uppercase tracking-wider">{chain}</p>
              {urls.map((url, index) => (
                <div
                  key={`${chain}-${index}`}
                  className="flex items-center justify-between p-3 bg-nexus-glass rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm text-white font-mono truncate">{url}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => testRpcNode(chain, url)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Zap className="w-4 h-4 text-nexus-accent" />
                    </button>
                    <button
                      onClick={() => removeRpcNode(chain, url)}
                      className="p-1 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Performance Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel p-6"
      >
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-nexus-accent" />
          Performance
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Parallel Processing</p>
              <p className="text-xs text-white/50">Process multiple wallets simultaneously</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-nexus-glass peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nexus-accent/30"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Balance Check Interval</p>
              <p className="text-xs text-white/50">Auto-refresh wallet balances</p>
            </div>
            <select className="glass-input w-32">
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="900">15 minutes</option>
              <option value="0">Manual only</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Batch Size</p>
              <p className="text-xs text-white/50">Wallets processed per batch</p>
            </div>
            <input
              type="number"
              min="1"
              max="100"
              defaultValue="10"
              className="glass-input w-32"
            />
          </div>
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel p-6 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center">
          <Shield className="w-8 h-8 text-nexus-accent" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Nexus Wallet Manager</h3>
        <p className="text-sm text-white/50 mb-4">Version 1.0.0</p>
        <p className="text-xs text-white/40">
          A revolutionary multi-chain cryptocurrency wallet manager with military-grade encryption.
          <br />
          Built with cutting-edge technology and uncompromising security.
        </p>
      </motion.div>
    </div>
  );
}