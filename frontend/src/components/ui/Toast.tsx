import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-toxic-green/20 border-toxic-green text-toxic-green';
      case 'error':
        return 'bg-blood-red/20 border-blood-red text-blood-red';
      case 'warning':
        return 'bg-haunted-orange/20 border-haunted-orange text-haunted-orange';
      case 'info':
        return 'bg-phantom-purple/20 border-phantom-purple text-phantom-purple';
      default:
        return 'bg-graveyard-gray border-ghostly-white/30 text-ghostly-white';
    }
  };

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✨';
      case 'error':
        return '💀';
      case 'warning':
        return '⚠️';
      case 'info':
        return '🔮';
      default:
        return '👻';
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg
        backdrop-blur-sm animate-slideIn
        ${getToastStyles()}
      `}
    >
      <span className="text-2xl flex-shrink-0">{getToastIcon()}</span>
      <p className="flex-1 font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-xl opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};
