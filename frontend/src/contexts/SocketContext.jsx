import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    let closed = false;
    const run = async () => {
      try {
        if (!(isAuthenticated && user)) {
          if (socket) {
            try { socket.close(); } catch (_) {}
          }
          setSocket(null);
          setIsConnected(false);
          return;
        }

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        if (!API_URL) return;

        const mod = await import('socket.io-client');
        if (closed) return;
        const newSocket = mod.io(API_URL, {
          withCredentials: true,
          transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
          console.log('Connected to server');
          setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
          console.log('Disconnected from server');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          setIsConnected(false);
        });

        setSocket(newSocket);
      } catch (e) {
        console.error('Failed to initialize socket:', e);
        setIsConnected(false);
      }
    };
    run();

    return () => {
      closed = true;
      if (socket) {
        try { socket.close(); } catch (_) {}
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  const value = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
