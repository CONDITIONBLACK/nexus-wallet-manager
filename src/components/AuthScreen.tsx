import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStore } from '../stores/appStore';
import { electronAPI } from '../utils/electron';
import { biometricAuth } from '../services/biometricAuth';
import ParticleField from './ParticleField';
import FloatingParticles from './FloatingParticles';
import GeometricParticles from './GeometricParticles';

export default function AuthScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState<'touchID' | 'faceID' | 'none'>('none');
  const authenticate = useStore((state) => state.authenticate);

  useEffect(() => {
    checkIfNewUser();
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      const capabilities = await biometricAuth.checkCapabilities();
      setBiometricAvailable(capabilities.available);
      setBiometryType(capabilities.biometryType);
      
      if (capabilities.available && !isNewUser) {
        const enabled = await biometricAuth.isBiometricAuthEnabled();
        setBiometricEnabled(enabled);
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
    }
  };

  const checkIfNewUser = async () => {
    try {
      const hasDatabase = await electronAPI.verifyPassword('');
      setIsNewUser(!hasDatabase);
      
      // Check biometric status after determining user type
      if (!hasDatabase) {
        await checkBiometricCapabilities();
      }
    } catch {
      setIsNewUser(true);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricAvailable || !biometricEnabled) return;
    
    setIsLoading(true);
    try {
      const result = await biometricAuth.authenticateAndGetPassword();
      
      if (result.success && result.password) {
        const authSuccess = await authenticate(result.password);
        if (authSuccess) {
          toast.success(`Welcome back! Authenticated with ${biometryType === 'touchID' ? 'Touch ID' : 'Face ID'}`);
        } else {
          toast.error('Biometric authentication succeeded but password verification failed');
        }
      } else {
        if (result.errorCode !== 'USER_CANCEL') {
          toast.error(result.error || 'Biometric authentication failed');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Biometric authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNewUser && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (isNewUser) {
        const success = await electronAPI.initDatabase(password);
        if (success) {
          const authSuccess = await authenticate(password);
          if (authSuccess) {
            toast.success('Database initialized successfully');
          } else {
            toast.error('Failed to authenticate');
          }
        } else {
          toast.error('Failed to initialize database');
        }
      } else {
        const success = await authenticate(password);
        if (success) {
          toast.success('Welcome back to Nexus');
        } else {
          toast.error('Invalid password');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden"
    >
      {/* Particle Effects */}
      <ParticleField
        density={30}
        speed={0.3}
        colors={['#00FF88', '#00CCFF', '#FFFFFF']}
        interactive={true}
        className="z-0"
      />
      
      <FloatingParticles
        count={12}
        colors={['#00FF88', '#00CCFF', '#FFFFFF', '#FF6B6B']}
        speed="slow"
        size="medium"
        className="z-0"
      />
      
      <GeometricParticles
        count={8}
        colors={['#00FF88', '#00CCFF']}
        interactive={true}
        className="z-0"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo and title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto mb-6 relative"
          >
            <div className="absolute inset-0 bg-nexus-accent/20 rounded-2xl blur-xl" />
            <div className="relative glass-panel-elevated flex items-center justify-center w-full h-full">
              <Shield className="w-10 h-10 text-nexus-accent" />
            </div>
          </motion.div>
          
          <h1 className="text-4xl font-light text-white mb-2">
            <span className="gradient-text">Nexus</span> Wallet Manager
          </h1>
          <p className="text-white/50 text-sm">
            {isNewUser ? 'Create your master password' : 'Enter your password to continue'}
          </p>
        </div>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-panel p-8 space-y-6">
            {/* Biometric indicator and auth */}
            <div className="flex flex-col items-center space-y-4">
              <motion.button
                type="button"
                onClick={handleBiometricAuth}
                disabled={!biometricAvailable || !biometricEnabled || isNewUser || isLoading}
                animate={{ 
                  scale: biometricAvailable && biometricEnabled && !isNewUser ? [1, 1.1, 1] : 1,
                  opacity: biometricAvailable && biometricEnabled && !isNewUser ? 1 : 0.5
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`p-4 rounded-full border transition-all ${
                  biometricAvailable && biometricEnabled && !isNewUser
                    ? 'bg-nexus-accent/10 border-nexus-accent/30 hover:bg-nexus-accent/20 cursor-pointer'
                    : 'bg-nexus-glass border-nexus-glass-border cursor-not-allowed'
                }`}
              >
                <Fingerprint className={`w-8 h-8 ${
                  biometricAvailable && biometricEnabled && !isNewUser
                    ? 'text-nexus-accent'
                    : 'text-white/30'
                }`} />
              </motion.button>
              
              {biometricAvailable && biometricEnabled && !isNewUser && (
                <p className="text-xs text-nexus-accent text-center">
                  Tap to authenticate with {biometryType === 'touchID' ? 'Touch ID' : 'Face ID'}
                </p>
              )}
              
              {biometricAvailable && !biometricEnabled && !isNewUser && (
                <p className="text-xs text-white/50 text-center">
                  {biometryType === 'touchID' ? 'Touch ID' : 'Face ID'} available • Enable in Settings
                </p>
              )}
              
              {!biometricAvailable && (
                <p className="text-xs text-white/30 text-center">
                  Biometric authentication not available
                </p>
              )}
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-wider">
                Master Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input pl-12 pr-12"
                  placeholder="Enter your password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password for new users */}
            {isNewUser && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-xs text-white/50 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input pl-12"
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                  />
                </div>
              </motion.div>
            )}

            {/* Password strength indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Password Strength</span>
                  <span className={`
                    ${password.length < 8 ? 'text-red-500' : 
                      password.length < 12 ? 'text-yellow-500' : 
                      password.length < 16 ? 'text-nexus-cyan' : 'text-nexus-accent'}
                  `}>
                    {password.length < 8 ? 'Weak' : 
                      password.length < 12 ? 'Fair' : 
                      password.length < 16 ? 'Strong' : 'Very Strong'}
                  </span>
                </div>
                <div className="h-1 bg-nexus-darker rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.min(100, (password.length / 20) * 100)}%` 
                    }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      password.length < 8 ? 'bg-red-500' : 
                      password.length < 12 ? 'bg-yellow-500' : 
                      password.length < 16 ? 'bg-nexus-cyan' : 'bg-nexus-accent'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full glass-button-primary flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-nexus-accent/30 border-t-nexus-accent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>{isNewUser ? 'Initialize Nexus' : 'Unlock Nexus'}</span>
                </>
              )}
            </button>
          </div>

          {/* Security notice */}
          <div className="glass-panel p-4 text-center">
            <p className="text-xs text-white/40">
              Your password encrypts all wallet data locally. Never share it with anyone.
              <br />
              Nexus uses military-grade AES-256 encryption.
            </p>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}