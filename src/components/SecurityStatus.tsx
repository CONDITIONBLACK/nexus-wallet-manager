import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, AlertTriangle, Eye, Monitor, 
  Cpu, RefreshCw, X, CheckCircle
} from 'lucide-react';
import { electronAPI } from '../utils/electron';
import { counterForensics } from '../services/counterForensics';

interface SecurityMetrics {
  debuggerDetected: boolean;
  virtualMachineDetected: boolean;
  screenRecordingDetected: boolean;
  suspiciousProcesses: string[];
  lastSecurityCheck: string;
  memoryCleared: number;
}

interface SecurityStatusProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SecurityStatus({ isOpen, onClose }: SecurityStatusProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen) {
      loadSecurityMetrics();
      const interval = setInterval(loadSecurityMetrics, 10000); // Update every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadSecurityMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Get metrics from Electron
      let electronMetrics = null;
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        electronMetrics = await window.electronAPI.getSecurityMetrics();
      }
      
      // Get metrics from counter-forensics service
      const cfMetrics = counterForensics.getSecurityMetrics();
      
      // Combine metrics
      const combinedMetrics: SecurityMetrics = {
        debuggerDetected: electronMetrics?.debuggerDetected || false,
        virtualMachineDetected: electronMetrics?.virtualMachineDetected || false,
        screenRecordingDetected: electronMetrics?.screenRecordingDetected || false,
        suspiciousProcesses: electronMetrics?.suspiciousProcesses || [],
        lastSecurityCheck: electronMetrics?.lastSecurityCheck || new Date().toISOString(),
        memoryCleared: cfMetrics.memoryCleared || 0,
      };
      
      setMetrics(combinedMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load security metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const performSecurityCheck = async () => {
    try {
      setIsLoading(true);
      
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.performSecurityCheck();
      }
      
      await loadSecurityMetrics();
    } catch (error) {
      console.error('Security check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const performMemoryWipe = async () => {
    try {
      setIsLoading(true);
      
      if (typeof window !== 'undefined' && window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.secureMemoryWipe();
      }
      
      // Also trigger client-side memory wipe
      counterForensics.registerSensitiveData('memory_wipe_trigger');
      
      await loadSecurityMetrics();
    } catch (error) {
      console.error('Memory wipe failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityLevel = (): 'high' | 'medium' | 'low' => {
    if (!metrics) return 'medium';
    
    const threats = [
      metrics.debuggerDetected,
      metrics.virtualMachineDetected,
      metrics.screenRecordingDetected
    ].filter(Boolean).length;
    
    if (threats === 0) return 'high';
    if (threats <= 1) return 'medium';
    return 'low';
  };

  const getSecurityColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'text-nexus-accent';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
    }
  };

  const getSecurityIcon = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return CheckCircle;
      case 'medium': return Shield;
      case 'low': return AlertTriangle;
    }
  };

  if (!isOpen) return null;

  const securityLevel = getSecurityLevel();
  const SecurityIcon = getSecurityIcon(securityLevel);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-8"
      onClick={onClose}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl bg-nexus-accent/10 border border-nexus-accent/30`}>
                <SecurityIcon className={`w-6 h-6 ${getSecurityColor(securityLevel)}`} />
              </div>
              <div>
                <h2 className="text-2xl font-light text-white mb-2">Security Status</h2>
                <p className="text-sm text-white/60">
                  Counter-forensics and threat detection
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={performSecurityCheck}
                disabled={isLoading}
                className="glass-button p-3"
                title="Refresh security check"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
          </div>
        </div>

        {/* Security Level */}
        <div className="p-6 border-b border-nexus-glass-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-xl ${
                securityLevel === 'high' ? 'bg-nexus-accent/10 border border-nexus-accent/30' :
                securityLevel === 'medium' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                'bg-red-500/10 border border-red-500/30'
              }`}>
                <Shield className={`w-8 h-8 ${getSecurityColor(securityLevel)}`} />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white">
                  Security Level: <span className={getSecurityColor(securityLevel)}>
                    {securityLevel.charAt(0).toUpperCase() + securityLevel.slice(1)}
                  </span>
                </h3>
                <p className="text-sm text-white/60">
                  {securityLevel === 'high' && 'No security threats detected'}
                  {securityLevel === 'medium' && 'Minor security concerns detected'}
                  {securityLevel === 'low' && 'Multiple security threats detected'}
                </p>
              </div>
            </div>
            
            <button
              onClick={performMemoryWipe}
              disabled={isLoading}
              className="glass-button-primary px-4 py-2"
            >
              {isLoading ? 'Wiping...' : 'Memory Wipe'}
            </button>
          </div>
        </div>

        {/* Security Metrics */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Threat Detection */}
            <div className="glass-panel p-4">
              <h4 className="text-sm font-medium text-white mb-4 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                Threat Detection
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Debugger</span>
                  <div className={`flex items-center space-x-2 ${
                    metrics?.debuggerDetected ? 'text-red-400' : 'text-nexus-accent'
                  }`}>
                    {metrics?.debuggerDetected ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs">Detected</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">Safe</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Virtual Machine</span>
                  <div className={`flex items-center space-x-2 ${
                    metrics?.virtualMachineDetected ? 'text-yellow-400' : 'text-nexus-accent'
                  }`}>
                    {metrics?.virtualMachineDetected ? (
                      <>
                        <Cpu className="w-4 h-4" />
                        <span className="text-xs">VM Detected</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">Native</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Screen Recording</span>
                  <div className={`flex items-center space-x-2 ${
                    metrics?.screenRecordingDetected ? 'text-red-400' : 'text-nexus-accent'
                  }`}>
                    {metrics?.screenRecordingDetected ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Recording</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">Private</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Statistics */}
            <div className="glass-panel p-4">
              <h4 className="text-sm font-medium text-white mb-4 flex items-center">
                <Monitor className="w-4 h-4 mr-2 text-nexus-cyan" />
                Security Statistics
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Memory Cleared</span>
                  <span className="text-sm text-nexus-accent font-medium">
                    {metrics?.memoryCleared || 0} times
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Last Check</span>
                  <span className="text-xs text-white/50">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Security Service</span>
                  <div className="flex items-center space-x-2 text-nexus-accent">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="mt-6 glass-panel p-4">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-nexus-accent" />
              Active Security Features
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Memory Protection',
                'Anti-Debugging',
                'VM Detection',
                'Screen Recording Detection',
                'Timing Attack Protection',
                'Secure Memory Wiping'
              ].map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-nexus-accent" />
                  <span className="text-xs text-white/70">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-nexus-glass-border bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/50">
              Counter-forensics security is actively protecting your data
            </div>
            <div className="flex items-center space-x-2 text-xs text-white/40">
              <Monitor className="w-3 h-3" />
              <span>Monitoring enabled</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}