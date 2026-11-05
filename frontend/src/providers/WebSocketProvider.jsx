import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children, url }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = useRef(5);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
        setMessages(prev => [...prev, { type: 'system', content: 'Connected to server', timestamp: new Date() }]);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages(prev => [...prev, { type: 'message', content: data, timestamp: new Date() }]);
        } catch (e) {
          setMessages(prev => [...prev, { type: 'message', content: event.data, timestamp: new Date() }]);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setMessages(prev => [...prev, { type: 'system', content: 'Disconnected from server', timestamp: new Date() }]);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts.current) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      ws.onerror = (err) => {
        setError(err.message || 'WebSocket error');
        setIsConnecting(false);
      };
      
      setSocket(ws);
    } catch (err) {
      setError(err.message || 'Failed to create WebSocket');
      setIsConnecting(false);
    }
  }, [url, isConnected, isConnecting]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [socket]);

  const send = useCallback((data) => {
    if (!socket || !isConnected) {
      setError('Not connected to server');
      return false;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socket.send(message);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      return false;
    }
  }, [socket, isConnected]);

  const subscribe = useCallback((channel, callback) => {
    if (!socket || !isConnected) {
      return null;
    }
    
    const message = JSON.stringify({
      type: 'subscribe',
      channel,
    });
    
    socket.send(message);
    
    // Return unsubscribe function
    return () => {
      const unsubscribeMessage = JSON.stringify({
        type: 'unsubscribe',
        channel,
      });
      socket.send(unsubscribeMessage);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const value = {
    socket,
    isConnected,
    isConnecting,
    error,
    messages,
    connect,
    disconnect,
    send,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketProvider;
