import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';

/**
 * NotificationCenter Component for Pharma-360
 * Displays and manages real-time notifications
 * 
 * FRNT-015: Notifications (WebSocket)
 */

// Notification types and their styling
const NOTIFICATION_TYPES = {
  success: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    border: 'border-green-200',
    label: 'Succès'
  },
  warning: {
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-800',
    border: 'border-yellow-200',
    label: 'Avertissement'
  },
  error: {
    icon: X,
    color: 'bg-red-100 text-red-800',
    border: 'border-red-200',
    label: 'Erreur'
  },
  info: {
    icon: Info,
    color: 'bg-blue-100 text-blue-800',
    border: 'border-blue-200',
    label: 'Information'
  }
};

const NotificationCenter = ({ onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { lastMessage, isConnected } = useWebSocket();

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type !== 'pong' && lastMessage.type !== 'ping') {
      const notification = createNotificationFromMessage(lastMessage);
      if (notification) {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [lastMessage]);

  // Create notification from WebSocket message
  const createNotificationFromMessage = (message) => {
    switch (message.type) {
      case 'new_sale':
        return {
          id: `sale-${Date.now()}`,
          type: 'info',
          title: 'Nouvelle Vente',
          message: `Vente #${message.data.sale_id || message.data.id} ajoutée à la file d'attente`,
          timestamp: new Date().toISOString(),
          read: false,
          data: message.data
        };

      case 'sale_cancelled':
        return {
          id: `cancelled-${Date.now()}`,
          type: 'warning',
          title: 'Vente Annulée',
          message: `Vente #${message.data.sale_id || message.data.id} a été annulée`,
          timestamp: new Date().toISOString(),
          read: false,
          data: message.data
        };

      case 'payment_validated':
        return {
          id: `payment-${Date.now()}`,
          type: 'success',
          title: 'Paiement Validé',
          message: `Vente #${message.data.sale_id || message.data.id} a été payée`,
          timestamp: new Date().toISOString(),
          read: false,
          data: message.data
        };

      case 'stock_alert':
        return {
          id: `stock-${Date.now()}`,
          type: 'warning',
          title: 'Alerte Stock',
          message: message.data.message || `Stock faible pour ${message.data.product_name || 'un produit'}`,
          timestamp: new Date().toISOString(),
          read: false,
          data: message.data
        };

      case 'expiry_alert':
        return {
          id: `expiry-${Date.now()}`,
          type: 'error',
          title: 'Péremption Proche',
          message: message.data.message || `Péremption proche pour ${message.data.product_name || 'un produit'}`,
          timestamp: new Date().toISOString(),
          read: false,
          data: message.data
        };

      case 'system_alert':
        return {
          id: `system-${Date.now()}`,
          type: 'error',
          title: 'Alerte Système',
          message: message.data.message || 'Une alerte système est survenue',
          timestamp: new Date().toISOString(),
          read: false,
          data: message.data
        };

      default:
        return null;
    }
  };

  // Mark notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Clear a specific notification
  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.read ? prev - 1 : prev;
    });
  }, [notifications]);

  // Toggle notification center
  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      markAllAsRead();
    }
  }, [isOpen, markAllAsRead]);

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  // Format time since notification
  const formatTimeSince = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now - then) / 1000);
    
    if (diffInSeconds < 60) {
      return 'À l\'instant';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} min${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} h`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  };

  // Get notification icon
  const getNotificationIcon = (type, className = 'h-4 w-4') => {
    const Icon = NOTIFICATION_TYPES[type]?.icon || Info;
    return <Icon className={className} />;
  };

  return (
    <div className="relative">
      {/* Notification bell button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleOpen}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
            variant={unreadCount > 9 ? 'default' : 'default'}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-6"
                >
                  Tout marquer comme lu
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs h-6 text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucune notification
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info;
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-gray-50' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${typeConfig.color} flex items-center justify-center`}>
                          {getNotificationIcon(notification.type, 'h-4 w-4')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                            </div>
                            {!notification.read && (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 ml-2 mt-1" />
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTimeSince(notification.timestamp)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setIsOpen(false)}
            >
              <span>Fermer</span>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {!isConnected && (
        <div className="absolute -bottom-2 -left-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Notification Badge - Small badge showing notification count
 */
export const NotificationBadge = ({ count, showLabel = false }) => {
  return (
    <div className="relative">
      {showLabel && (
        <span className="text-sm text-gray-600 mr-2">Notifications</span>
      )}
      {count > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
          variant="default"
        >
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </div>
  );
};

/**
 * Notification Toast - Individual notification toast
 */
export const NotificationToast = ({ 
  type = 'info', 
  title, 
  message, 
  onClose,
  duration = 5000,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const typeConfig = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
  const Icon = typeConfig.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-4 right-4 ${typeConfig.color} ${typeConfig.border} border rounded-lg p-4 shadow-lg max-w-sm z-50 animate-in slide-in-from-bottom-4`}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          {title && <p className="font-semibold text-sm">{title}</p>}
          <p className="text-sm">{message}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/**
 * useNotification hook for easy notification management
 */
export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = `notif-${Date.now()}`;
    const fullNotification = {
      id,
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    setNotifications(prev => [fullNotification, ...prev]);
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    setNotifications
  };
};

export default NotificationCenter;
