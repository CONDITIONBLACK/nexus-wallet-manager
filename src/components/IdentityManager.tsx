import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCircle, Plus, Shield, Trash2, Key, Eye, EyeOff, 
  CheckCircle, AlertCircle, Users, Lock, Database
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { electronAPI } from '../utils/electron';

interface Identity {
  id: string;
  name: string;
  createdAt: string;
  lastAccessed: string;
  hasPassword: boolean;
  isActive: boolean;
}

interface IdentityManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onIdentitySelect: (identity: Identity, password: string) => void;
  currentIdentity?: Identity;
}

export default function IdentityManager({ 
  isOpen, 
  onClose, 
  onIdentitySelect, 
  currentIdentity 
}: IdentityManagerProps) {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newIdentityName, setNewIdentityName] = useState('');
  const [newIdentityPassword, setNewIdentityPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadIdentities();
    }
  }, [isOpen]);

  const loadIdentities = async () => {
    try {
      // @ts-ignore
      const identityList = await electronAPI.getIdentities();
      setIdentities(identityList);
    } catch (error) {
      console.error('Failed to load identities:', error);
    }
  };

  const createIdentity = async () => {
    if (!newIdentityName.trim()) {
      toast.error('Identity name is required');
      return;
    }

    if (newIdentityPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newIdentityPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // @ts-ignore
      const result = await electronAPI.createIdentity({
        name: newIdentityName,
        password: newIdentityPassword
      });

      if (result.success) {
        toast.success('Identity created successfully');
        setNewIdentityName('');
        setNewIdentityPassword('');
        setConfirmPassword('');
        setIsCreating(false);
        await loadIdentities();
      } else {
        toast.error(result.error || 'Failed to create identity');
      }
    } catch (error: any) {
      toast.error(`Failed to create identity: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectIdentity = async (identity: Identity) => {
    if (!enteredPassword) {
      toast.error('Password is required');
      return;
    }

    setIsLoading(true);
    try {
      // @ts-ignore
      const result = await electronAPI.switchIdentity(identity.id, enteredPassword);

      if (result.success) {
        toast.success(`Switched to ${identity.name}`);
        onIdentitySelect(identity, enteredPassword);
        setSelectedIdentity(null);
        setEnteredPassword('');
        onClose();
      } else {
        toast.error(result.error || 'Invalid password');
      }
    } catch (error: any) {
      toast.error(`Failed to switch identity: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteIdentity = async (identityId: string) => {
    if (!confirm('Are you sure you want to delete this identity? This action cannot be undone and all wallets will be permanently lost.')) {
      return;
    }

    setIsLoading(true);
    try {
      // @ts-ignore
      const result = await electronAPI.deleteIdentity(identityId);

      if (result.success) {
        toast.success('Identity deleted successfully');
        await loadIdentities();
      } else {
        toast.error(result.error || 'Failed to delete identity');
      }
    } catch (error: any) {
      toast.error(`Failed to delete identity: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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
        className="glass-panel-elevated w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-nexus-glass-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-nexus-accent/10 border border-nexus-accent/30">
                <Users className="w-6 h-6 text-nexus-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-light text-white mb-2">Identity Manager</h2>
                <p className="text-sm text-white/60">
                  Create and manage separate encrypted database identities
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <AlertCircle className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </div>

        {/* Current Identity */}
        {currentIdentity && (
          <div className="p-6 border-b border-nexus-glass-border bg-nexus-accent/5">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-nexus-accent/20 border border-nexus-accent/50">
                <CheckCircle className="w-5 h-5 text-nexus-accent" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-nexus-accent uppercase tracking-wider">
                  Current Identity
                </h3>
                <p className="text-lg text-white font-light">{currentIdentity.name}</p>
                <p className="text-xs text-white/50">
                  Last accessed: {new Date(currentIdentity.lastAccessed).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!isCreating ? (
            <>
              {/* Identity List */}
              <div className="space-y-4 mb-6">
                {identities.map((identity) => (
                  <div
                    key={identity.id}
                    className={`glass-panel p-4 transition-all ${
                      selectedIdentity === identity.id
                        ? 'border-nexus-accent/50 bg-nexus-accent/5'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${
                          identity.isActive 
                            ? 'bg-nexus-accent/20 border border-nexus-accent/30' 
                            : 'bg-white/5 border border-white/10'
                        }`}>
                          <UserCircle className={`w-5 h-5 ${
                            identity.isActive ? 'text-nexus-accent' : 'text-white/60'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-white">{identity.name}</h3>
                          <div className="flex items-center space-x-4 text-xs text-white/50">
                            <span>Created: {new Date(identity.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Last accessed: {new Date(identity.lastAccessed).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {identity.isActive ? (
                          <span className="px-3 py-1 bg-nexus-accent/20 text-nexus-accent text-xs rounded-full border border-nexus-accent/30">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedIdentity(
                              selectedIdentity === identity.id ? null : identity.id
                            )}
                            className="glass-button text-xs px-4 py-2"
                          >
                            Select
                          </button>
                        )}
                        
                        {!identity.isActive && (
                          <button
                            onClick={() => deleteIdentity(identity.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Password Input for Selected Identity */}
                    {selectedIdentity === identity.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-white/10"
                      >
                        <div className="flex items-end space-x-4">
                          <div className="flex-1">
                            <label className="block text-xs text-white/50 mb-2">
                              Enter password for {identity.name}
                            </label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={enteredPassword}
                                onChange={(e) => setEnteredPassword(e.target.value)}
                                className="glass-input pl-10 pr-10"
                                placeholder="Enter password"
                                onKeyPress={(e) => e.key === 'Enter' && selectIdentity(identity)}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => selectIdentity(identity)}
                            disabled={!enteredPassword || isLoading}
                            className="glass-button-primary px-6 py-3 disabled:opacity-50"
                          >
                            {isLoading ? 'Switching...' : 'Switch'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {/* Create New Identity Button */}
              <button
                onClick={() => setIsCreating(true)}
                className="w-full glass-button flex items-center justify-center space-x-2 py-4"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Identity</span>
              </button>
            </>
          ) : (
            /* Create Identity Form */
            <div className="space-y-6">
              <div className="text-center">
                <div className="p-4 rounded-xl bg-nexus-accent/10 border border-nexus-accent/30 inline-block mb-4">
                  <Database className="w-8 h-8 text-nexus-accent" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Create New Identity</h3>
                <p className="text-sm text-white/60">
                  Each identity uses a separate encrypted database for complete isolation
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Identity Name
                  </label>
                  <input
                    type="text"
                    value={newIdentityName}
                    onChange={(e) => setNewIdentityName(e.target.value)}
                    className="glass-input"
                    placeholder="e.g., Personal, Business, Trading"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Master Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newIdentityPassword}
                      onChange={(e) => setNewIdentityPassword(e.target.value)}
                      className="glass-input pl-10 pr-10"
                      placeholder="Enter secure password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input"
                    placeholder="Confirm password"
                  />
                </div>

                {/* Password Strength */}
                {newIdentityPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Password Strength</span>
                      <span className={`
                        ${newIdentityPassword.length < 8 ? 'text-red-500' : 
                          newIdentityPassword.length < 12 ? 'text-yellow-500' : 
                          newIdentityPassword.length < 16 ? 'text-nexus-cyan' : 'text-nexus-accent'}
                      `}>
                        {newIdentityPassword.length < 8 ? 'Weak' : 
                          newIdentityPassword.length < 12 ? 'Fair' : 
                          newIdentityPassword.length < 16 ? 'Strong' : 'Very Strong'}
                      </span>
                    </div>
                    <div className="h-1 bg-nexus-darker rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${Math.min(100, (newIdentityPassword.length / 20) * 100)}%` 
                        }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          newIdentityPassword.length < 8 ? 'bg-red-500' : 
                          newIdentityPassword.length < 12 ? 'bg-yellow-500' : 
                          newIdentityPassword.length < 16 ? 'bg-nexus-cyan' : 'bg-nexus-accent'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewIdentityName('');
                    setNewIdentityPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 glass-button"
                >
                  Cancel
                </button>
                <button
                  onClick={createIdentity}
                  disabled={!newIdentityName || !newIdentityPassword || !confirmPassword || isLoading}
                  className="flex-1 glass-button-primary disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Identity'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="p-6 border-t border-nexus-glass-border bg-white/[0.02]">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-xs text-white/60">
              <p className="mb-2">
                <strong className="text-white/80">Security Notice:</strong>
              </p>
              <ul className="space-y-1">
                <li>• Each identity uses a completely separate encrypted database</li>
                <li>• Identities cannot access each other's data</li>
                <li>• Passwords are hashed with bcrypt and never stored in plain text</li>
                <li>• Losing an identity password means permanent data loss</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}