import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  CheckCircle, XCircle, AlertCircle, Info, X, 
  Wifi, WifiOff, Trophy, Target
} from 'lucide-react';

// Toast context
const ToastContext = createContext(null);

// Toast types with their configurations
const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-400',
    progressColor: 'bg-green-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    progressColor: 'bg-red-500',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    progressColor: 'bg-yellow-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    progressColor: 'bg-blue-500',
  },
  connection: {
    icon: Wifi,
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    progressColor: 'bg-cyan-500',
  },
  disconnection: {
    icon: WifiOff,
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    iconColor: 'text-gray-400',
    progressColor: 'bg-gray-500',
  },
  achievement: {
    icon: Trophy,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    progressColor: 'bg-yellow-500',
  },
  tag: {
    icon: Target,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    progressColor: 'bg-red-500',
  },
};

// Individual toast component
function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
  const Icon = toast.customIcon || config.icon;

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-sm
        transform transition-all duration-200
        ${config.bgColor} ${config.borderColor}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="font-medium text-white text-sm">{toast.title}</p>
          )}
          <p className={`text-gray-300 text-sm ${toast.title ? 'mt-0.5' : ''}`}>
            {toast.message}
          </p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-primary-400 hover:text-primary-300"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration !== 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-dark-700">
          <div
            className={`h-full ${config.progressColor}`}
            style={{
              animation: `shrink ${toast.duration || 4000}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// Toast container component
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// Toast provider component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, options = {}) => {
    return addToast({
      type: 'info',
      message,
      ...options,
    });
  }, [addToast]);

  // Convenience methods
  toast.success = (message, options = {}) => addToast({ type: 'success', message, ...options });
  toast.error = (message, options = {}) => addToast({ type: 'error', message, ...options });
  toast.warning = (message, options = {}) => addToast({ type: 'warning', message, ...options });
  toast.info = (message, options = {}) => addToast({ type: 'info', message, ...options });
  toast.achievement = (title, message) => addToast({ type: 'achievement', title, message, duration: 5000 });
  toast.tag = (message) => addToast({ type: 'tag', message, duration: 3000 });
  toast.connected = () => addToast({ type: 'connection', message: 'Connected to server', duration: 2000 });
  toast.disconnected = () => addToast({ type: 'disconnection', message: 'Connection lost', duration: 0 });
  toast.dismiss = dismissToast;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export default { ToastProvider, useToast };
