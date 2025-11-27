import React, { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext();

export function useSocket() {
  const context = useContext(SocketContext);
  // Return a safe fallback instead of throwing to avoid crashes
  return context || { socket: null, isConnected: false };
}

export const SocketProvider = ({ children, user, isAuthenticated }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

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
          transports: ['websocket', 'polling'],
          // Be more tolerant before declaring a timeout
          timeout: 20000,
          // Keep trying in the background instead of failing hard
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
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
          // Timeouts and transient errors are expected on sleeping/slow hosts;
          // log them as warnings and let socket.io retry in the background.
          if (error && error.message === 'timeout') {
            console.warn('Socket connection timeout, will retry automatically.');
          } else {
            console.error('Connection error:', error);
          }
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
