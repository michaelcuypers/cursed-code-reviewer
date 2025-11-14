import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType, ToastContainer } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string, duration = 5000) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration = 7000) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration = 6000) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration = 5000) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
