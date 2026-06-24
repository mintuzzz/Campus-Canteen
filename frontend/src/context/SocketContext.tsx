import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface SocketContextType {
  socket: Socket | null;
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    const newSocket = io(wsUrl, {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      // Join corresponding room(s)
      if (user.role === 'admin') {
        newSocket.emit('join', 'admin');
      } else if (user.role === 'canteen') {
        newSocket.emit('join', 'canteen');  // receive kitchen broadcasts
        newSocket.emit('join', user._id);   // personal notifications
      } else {
        newSocket.emit('join', user._id);
      }
    });

    // Listen for live database-generated notifications
    newSocket.on('newNotification', (notif: { title: string; message: string }) => {
      addToast(notif.title, notif.message, 'success');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, toasts, addToast, removeToast }}>
      {children}
      
      {/* Global Floating Toasts Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slideIn glass-premium rounded-xl p-4 flex flex-col gap-1 shadow-2xl relative overflow-hidden"
          >
            {/* Color Accent bar */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                toast.type === 'success'
                  ? 'bg-emerald-500'
                  : toast.type === 'warning'
                  ? 'bg-red-500'
                  : 'bg-amber-500'
              }`}
            />
            <div className="flex justify-between items-start pl-2">
              <span className="font-semibold text-sm text-slate-100">{toast.title}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 pl-2 leading-relaxed">{toast.message}</p>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
