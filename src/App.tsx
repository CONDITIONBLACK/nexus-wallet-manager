import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import APIStatusNotification from './components/APIStatusNotification';
import { useStore } from './stores/appStore';

function App() {
  const { isAuthenticated, isInitialized, initialize } = useStore();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-nexus-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-nexus-accent/30 border-t-nexus-accent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-light text-white/70">Initializing Nexus...</h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-nexus-black overflow-hidden"
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      } as React.CSSProperties}
    >
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-nexus-mesh opacity-30" />
        <div className="absolute inset-0 bg-nexus-glow" />
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <AuthScreen key="auth" />
        ) : (
          <Dashboard key="dashboard" />
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(26, 26, 26, 0.95)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#00FF88',
              secondary: '#0A0A0A',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF3366',
              secondary: '#0A0A0A',
            },
          },
        }}
      />
      
      {/* API Status Notifications */}
      <APIStatusNotification />
    </div>
  );
}

export default App;