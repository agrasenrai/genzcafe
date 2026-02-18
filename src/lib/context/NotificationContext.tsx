'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { playContinuousNotification, stopContinuousNotification } from '@/lib/utils/notificationSound';

interface NotificationContextType {
  hasPendingOrders: boolean;
  pendingOrderCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [hasPendingOrders, setHasPendingOrders] = useState(false);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const subscriptionRef = useRef<any>(null);
  const isNotificationActiveRef = useRef(false);

  const fetchPendingOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status')
        .eq('status', 'pending');
      
      if (error) throw error;
      
      const count = data?.length || 0;
      setPendingOrderCount(count);
      const hasOrders = count > 0;
      setHasPendingOrders(hasOrders);
      
      // Start continuous notification if orders exist and not already playing
      if (hasOrders && !isNotificationActiveRef.current) {
        isNotificationActiveRef.current = true;
        playContinuousNotification(0.7, 3000); // 3-second interval
      } 
      // Stop notification if no orders and it's playing
      else if (!hasOrders && isNotificationActiveRef.current) {
        isNotificationActiveRef.current = false;
        stopContinuousNotification();
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchPendingOrders();

    // Set up real-time subscription for orders
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel('orders-notification')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // Fetch pending orders on any change
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      stopContinuousNotification();
      isNotificationActiveRef.current = false;
    };
  }, [fetchPendingOrders]);

  return (
    <NotificationContext.Provider value={{ hasPendingOrders, pendingOrderCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
