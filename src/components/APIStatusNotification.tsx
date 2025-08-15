import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Wifi, Clock, XCircle, CheckCircle } from 'lucide-react';

interface APINotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
}

export class APINotificationManager {
  private static listeners: ((notifications: APINotification[]) => void)[] = [];
  private static notifications: APINotification[] = [];

  static subscribe(listener: (notifications: APINotification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static notify(notification: Omit<APINotification, 'id' | 'timestamp'>) {
    const newNotification: APINotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      autoHide: notification.autoHide ?? (notification.type === 'success' || notification.type === 'info')
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 5 notifications
    if (this.notifications.length > 5) {
      this.notifications = this.notifications.slice(0, 5);
    }

    this.listeners.forEach(listener => listener([...this.notifications]));

    // Auto-hide notifications after 5 seconds
    if (newNotification.autoHide) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, 5000);
    }
  }

  static remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  static clear() {
    this.notifications = [];
    this.listeners.forEach(listener => listener([]));
  }

  // Convenience methods for different notification types
  static success(title: string, message: string) {
    this.notify({ type: 'success', title, message });
  }

  static warning(title: string, message: string) {
    this.notify({ type: 'warning', title, message, autoHide: false });
  }

  static error(title: string, message: string) {
    this.notify({ type: 'error', title, message, autoHide: false });
  }

  static info(title: string, message: string) {
    this.notify({ type: 'info', title, message });
  }

  // API-specific notifications
  static rateLimit(apiName: string, retryAfter: number) {
    this.warning(
      'Rate Limited',
      `${apiName} API is rate limited. Retrying in ${retryAfter} seconds.`
    );
  }

  static corsError(apiName: string) {
    this.error(
      'API Blocked',
      `${apiName} API is blocked by browser security. Consider using the Electron app for better API access.`
    );
  }

  static networkError(apiName: string) {
    this.warning(
      'Network Error',
      `Failed to connect to ${apiName}. Check your internet connection.`
    );
  }

  static apiSuccess(apiName: string, count: number) {
    this.success(
      'Balance Check Complete',
      `Successfully fetched ${count} balance${count !== 1 ? 's' : ''} from ${apiName}.`
    );
  }
}

export default function APIStatusNotification() {
  const [notifications, setNotifications] = useState<APINotification[]>([]);

  useEffect(() => {
    const unsubscribe = APINotificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'info': return <Wifi className="w-5 h-5 text-blue-400" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'info': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-nexus-glass border-nexus-border';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className={`glass-panel p-4 border ${getBackgroundColor(notification.type)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white mb-1">
                  {notification.title}
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  {notification.message}
                </p>
                <div className="text-xs text-white/50 mt-2">
                  {notification.timestamp.toLocaleTimeString()}
                </div>
              </div>

              <button
                onClick={() => APINotificationManager.remove(notification.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-4 h-4 text-white/50" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {notifications.length > 1 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => APINotificationManager.clear()}
          className="w-full p-2 text-xs font-medium rounded-lg bg-nexus-glass border border-nexus-border text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          Clear All ({notifications.length})
        </motion.button>
      )}
    </div>
  );
}