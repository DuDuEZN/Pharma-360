import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/ui/Toast';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const addAlert = useCallback((alert) => {
    const id = Date.now().toString();
    const newAlert = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      dismissible: true,
      ...alert,
    };
    
    setAlerts(prev => [...prev, newAlert]);
    
    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, newAlert.duration);
    }
    
    return id;
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const success = useCallback((message, options = {}) => {
    return addAlert({ type: 'success', message, ...options });
  }, [addAlert]);

  const error = useCallback((message, options = {}) => {
    return addAlert({ type: 'error', message, duration: 8000, ...options });
  }, [addAlert]);

  const warning = useCallback((message, options = {}) => {
    return addAlert({ type: 'warning', message, ...options });
  }, [addAlert]);

  const info = useCallback((message, options = {}) => {
    return addAlert({ type: 'info', message, ...options });
  }, [addAlert]);

  const value = {
    alerts,
    addAlert,
    removeAlert,
    success,
    error,
    warning,
    info,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <ToastContainer alerts={alerts} onDismiss={removeAlert} />
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

export default AlertProvider;
