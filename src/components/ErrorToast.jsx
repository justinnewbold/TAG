import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

const TOAST_DURATION = 4000;

const toastConfig = {
  error: {
    icon: AlertCircle,
    className: 'bg-red-500/90 border-red-400',
    iconClassName: 'text-red-200',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-500/90 border-green-400',
    iconClassName: 'text-green-200',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-500/90 border-yellow-400',
    iconClassName: 'text-yellow-200',
  },
  info: {
    icon: Info,
    className: 'bg-blue-500/90 border-blue-400',
    iconClassName: 'text-blue-200',
  },
};

function ErrorToast() {
  const { toast, clearToast } = useUIStore();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, toast.duration || TOAST_DURATION);

      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  const config = toastConfig[toast.type] || toastConfig.error;
  const Icon = config.icon;

  return (
    <div className="fixed top-14 left-4 right-4 z-50 flex justify-center animate-slide-down">
      <div className={`${config.className} border text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 max-w-md`}>
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconClassName}`} />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="font-medium text-sm">{toast.title}</p>
          )}
          <p className={`text-sm ${toast.title ? 'text-white/80' : ''}`}>{toast.message}</p>
        </div>
        <button
          onClick={clearToast}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ErrorToast;
