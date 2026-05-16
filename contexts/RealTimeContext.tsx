'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { toast } from '@/components/ui/use-toast'

// Define message types
export type MessageType = 'chat' | 'rate' | 'notification' | 'system'

export interface RealTimeMessage {
  id: string
  type: MessageType
  timestamp: string
  data: any
  sender?: {
    id: string
    name: string
  }
}

interface ConnectionState {
  connected: boolean
  lastConnected: Date | null
  reconnectAttempts: number
  error: string | null
}

interface RealTimeContextType {
  connectionState: ConnectionState
  messages: RealTimeMessage[]
  rates: any[]
  notifications: any[]
  sendMessage: (chatId: string, message: any) => Promise<boolean>
  joinChat: (chatId: string) => Promise<boolean>
  leaveChat: (chatId: string) => void
  clearMessages: () => void
  reconnect: () => Promise<void>
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_INTERVAL = 3000 // 3 seconds
const MAX_MESSAGES = 100 // Maximum number of messages to keep in memory

const RealTimeContext = createContext<RealTimeContextType | null>(null)

export function useRealTime() {
  const context = useContext(RealTimeContext)
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider')
  }
  return context
}

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    lastConnected: null,
    reconnectAttempts: 0,
    error: null
  })
  const [messages, setMessages] = useState<RealTimeMessage[]>([])
  const [rates, setRates] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  // Helper function to update connection state
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    setConnectionState(prev => ({ ...prev, ...updates }))
  }, [])

  // Clean up function to remove event listeners and disconnect socket
  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      // Remove all listeners to prevent memory leaks
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Clear any pending reconnect timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!session?.user?.id) return null;

    // Clean up any existing socket connection first
    cleanupSocket();

    try {
      const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || window.location.origin;
      console.log('Connecting to WebSocket at:', socketUrl);
      const socketInstance = io(socketUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: RECONNECT_INTERVAL,
        timeout: 10000,
        withCredentials: true
      });

      // Socket event handlers
      socketInstance.on('connect', () => {
        updateConnectionState({
          connected: true,
          lastConnected: new Date(),
          reconnectAttempts: 0,
          error: null
        });
        toast({
          title: 'Connected',
          description: 'Real-time connection established',
          duration: 3000
        });
      });

      socketInstance.on('disconnect', (reason) => {
        updateConnectionState({
          connected: false,
          error: `Disconnected: ${reason}`
        });
        
        if (reason === 'io server disconnect' || reason === 'transport close') {
          // Server initiated disconnect or transport closed, attempt reconnection
          reconnectTimerRef.current = setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.connect();
            }
          }, RECONNECT_INTERVAL);
        }
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        
        // Implement exponential backoff for reconnection
        const attempts = connectionState.reconnectAttempts + 1
        const delay = Math.min(RECONNECT_INTERVAL * Math.pow(1.5, attempts), RECONNECT_INTERVAL * 3)
        
        updateConnectionState({
          connected: false,
          error: `Connection error: ${error.message}`,
          reconnectAttempts: attempts
        });
        
        toast({
          title: 'Connection Error',
          description: `Attempting to reconnect (${attempts}/${MAX_RECONNECT_ATTEMPTS})...`,
          variant: 'destructive'
        })
        
        reconnectTimerRef.current = setTimeout(() => {
          if (attempts <= MAX_RECONNECT_ATTEMPTS) {
            socketInstance.connect()
          } else {
            toast({
              title: 'Connection Failed',
              description: 'Could not connect to the server. Please try again later.',
              variant: 'destructive'
            })
          }
        }, delay)
      });

      socketInstance.on('authenticated', ({ user }) => {
        console.log('Socket authenticated:', user);
      });

      socketInstance.on('auth_error', (error) => {
        updateConnectionState({
          connected: false,
          error: `Authentication error: ${error}`
        });
        toast({
          title: 'Authentication Error',
          description: error,
          variant: 'destructive'
        });
        socketInstance.disconnect();
      });

      // Message handling
      socketInstance.on('new_message', (message: RealTimeMessage) => {
        setMessages(prev => {
          const newMessages = [message, ...prev].slice(0, MAX_MESSAGES);
          return newMessages;
        });
      });

      socketInstance.on('rate_update', (update: any) => {
        setRates(prev => {
          const newRates = [...prev];
          const index = newRates.findIndex(r => r.symbol === update.symbol);
          if (index >= 0) {
            newRates[index] = { ...newRates[index], ...update };
          } else {
            newRates.push(update);
          }
          return newRates.slice(0, MAX_MESSAGES);
        });
      });

      socketInstance.on('notification', (notification: any) => {
        setNotifications(prev => {
          const newNotifications = [notification, ...prev].slice(0, MAX_MESSAGES);
          return newNotifications;
        });
        
        // Show toast for new notifications
        toast({
          title: notification.title || 'New Notification',
          description: notification.message || notification.content,
          duration: 5000
        });
      });

      socketRef.current = socketInstance;
      socketInstance.connect();

      return socketInstance;
    } catch (error) {
      console.error('Error initializing socket:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to initialize real-time connection',
        variant: 'destructive'
      });
      return null;
    }
  }, [session, connectionState.reconnectAttempts, updateConnectionState, cleanupSocket]);

  // Initialize socket on session change
  useEffect(() => {
    if (session?.user?.id) {
      initializeSocket();
    } else {
      cleanupSocket();
    }
    
    return () => {
      cleanupSocket();
    };
  }, [session, initializeSocket, cleanupSocket]);

  // Message handling functions
  const sendMessage = useCallback(async (chatId: string, message: any): Promise<boolean> => {
    if (!socketRef.current || !connectionState.connected) {
      toast({
        title: 'Error',
        description: 'Not connected to server',
        variant: 'destructive'
      });
      return false;
    }

    try {
      return new Promise((resolve) => {
        socketRef.current!.emit('send_message', { chatId, message }, (response: any) => {
          if (response.error) {
            toast({
              title: 'Error',
              description: response.error,
              variant: 'destructive'
            });
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      return false;
    }
  }, [connectionState.connected]);

  const joinChat = useCallback(async (chatId: string): Promise<boolean> => {
    if (!socketRef.current || !connectionState.connected) {
      toast({
        title: 'Error',
        description: 'Not connected to server',
        variant: 'destructive'
      });
      return false;
    }

    try {
      return new Promise((resolve) => {
        socketRef.current!.emit('join_chat', { chatId }, (response: any) => {
          if (response.error) {
            toast({
              title: 'Error',
              description: response.error,
              variant: 'destructive'
            });
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Error joining chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to join chat',
        variant: 'destructive'
      });
      return false;
    }
  }, [connectionState.connected]);

  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current && connectionState.connected) {
      socketRef.current.emit('leave_chat', { chatId });
    }
  }, [connectionState.connected]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const reconnect = useCallback(async (): Promise<void> => {
    updateConnectionState({
      reconnectAttempts: 0
    });
    
    if (socketRef.current) {
      // Force disconnect first
      socketRef.current.disconnect();
      
      // Small delay before reconnecting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Attempt to reconnect
      socketRef.current.connect();
      
      toast({
        title: 'Reconnecting',
        description: 'Attempting to reconnect...',
        duration: 3000
      });
    } else {
      // Initialize a new socket if none exists
      initializeSocket();
    }
  }, [updateConnectionState, initializeSocket]);

  return (
    <RealTimeContext.Provider
      value={{
        connectionState,
        messages,
        rates,
        notifications,
        sendMessage,
        joinChat,
        leaveChat,
        clearMessages,
        reconnect
      }}
    >
      {children}
    </RealTimeContext.Provider>
  );
}
