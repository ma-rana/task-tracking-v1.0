import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const toastTypes = {
  success: {
    icon: CheckCircle,
    className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    iconClassName: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    className: 'bg-red-50 border-red-200 text-red-800',
    iconClassName: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-amber-50 border-amber-200 text-amber-800',
    iconClassName: 'text-amber-500',
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-800',
    iconClassName: 'text-blue-500',
  },
};

function Toast({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Trigger animation
    requestAnimationFrame(() => setVisible(true));
    
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const { icon: Icon, className, iconClassName } = toastTypes[toast.type] || toastTypes.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 max-w-sm ${className} ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconClassName}`} />
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toastMessage, clearToast } = useAuth();
  const { toastQueue, setToastQueue } = useData();
  const [toasts, setToasts] = useState([]);

  // Handle auth toasts
  useEffect(() => {
    if (toastMessage) {
      setToasts(prev => [...prev, toastMessage]);
      clearToast();
    }
  }, [toastMessage, clearToast]);

  // Handle data toasts
  useEffect(() => {
    if (toastQueue.length > 0) {
      setToasts(prev => [...prev, ...toastQueue]);
      setToastQueue([]);
    }
  }, [toastQueue, setToastQueue]);

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
