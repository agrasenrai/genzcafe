'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getPlatformFees } from '@/lib/supabase/settings';
import { validateCoupon, type CouponValidationResult } from '@/lib/supabase/coupons';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AppliedCoupon {
  couponId: string;
  code: string;
  name: string;
  description?: string;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

interface CartTotals {
  itemTotal: number;
  gst: number;
  platformFee: number;
  deliveryCharge: number;
  discountAmount: number;
  finalTotal: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  calculateTotals: () => Promise<CartTotals>;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string, userId?: string | null) => Promise<CouponValidationResult>;
  removeCoupon: () => void;
  couponLoading: boolean;
  totals: CartTotals | null;
  totalsLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Cache for platform fees to avoid repeated fetches
let platformFeesCache: any = null;
let platformFeesCacheTime = 0;
const PLATFORM_FEES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedPlatformFees() {
  const now = Date.now();
  if (platformFeesCache && (now - platformFeesCacheTime) < PLATFORM_FEES_CACHE_DURATION) {
    return platformFeesCache;
  }
  const fees = await getPlatformFees();
  platformFeesCache = fees;
  platformFeesCacheTime = now;
  return fees;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [totals, setTotals] = useState<CartTotals | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(false);

  // Load cart from sessionStorage on mount (clears when browser closes)
  useEffect(() => {
    const savedCart = sessionStorage.getItem('cart');
    const savedCoupon = sessionStorage.getItem('appliedCoupon');
    
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
      }
    }
    
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
      } catch (error) {
        console.error('Failed to parse coupon from localStorage:', error);
      }
    }
  }, []);

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('cart', JSON.stringify(items));
  }, [items]);
  
  // Save coupon to sessionStorage whenever it changes
  useEffect(() => {
    if (appliedCoupon) {
      sessionStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
    } else {
      sessionStorage.removeItem('appliedCoupon');
    }
  }, [appliedCoupon]);

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === newItem.id);
      if (existingItem) {
        return currentItems.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentItems, { ...newItem, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };
  
  const applyCoupon = async (code: string, userId?: string | null): Promise<CouponValidationResult> => {
    setCouponLoading(true);
    try {
      // Calculate total price with GST first
      const totalPriceWithGST = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      // Extract base price (without GST) using the correct formula
      const itemTotal = Math.round((totalPriceWithGST / 1.05) * 100) / 100;
      const result = await validateCoupon(code, userId || null, itemTotal);
      
      if (result.valid) {
        setAppliedCoupon({
          couponId: result.coupon_id!,
          code: code.toUpperCase(),
          name: result.name!,
          description: result.description,
          discountAmount: result.discount_amount!,
          discountType: result.discount_type!,
          discountValue: result.discount_value!
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error applying coupon:', error);
      return {
        valid: false,
        error: 'Failed to apply coupon. Please try again.'
      };
    } finally {
      setCouponLoading(false);
    }
  };
  
  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const calculateTotals = async (): Promise<CartTotals> => {
    // Calculate total price with GST included
    const totalPriceWithGST = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    try {
      // Use cached fees for faster calculations
      const fees = await getCachedPlatformFees();
      
      // Calculate base price and GST using the correct formula
      const basePrice = totalPriceWithGST / 1.05;
      const gstAmount = totalPriceWithGST - basePrice;
      
      const itemTotal = Math.round(basePrice * 100) / 100;
      const gst = Math.round(gstAmount * 100) / 100;
      
      // Platform fee from settings (if enabled)
      const platformFee = fees.platformFeeEnabled ? (Math.round((fees.platformFee || 0) * 100) / 100) : 0;
      
      // No delivery charge as we only offer pickup
      const deliveryCharge = 0;
      
      // Apply coupon discount
      const discountAmount = appliedCoupon ? Math.round(appliedCoupon.discountAmount * 100) / 100 : 0;
      
      // Calculate final total
      const finalTotal = Math.round(Math.max(0, itemTotal + gst + platformFee + deliveryCharge - discountAmount) * 100) / 100;
      
      return {
        itemTotal,
        gst,
        platformFee,
        deliveryCharge,
        discountAmount,
        finalTotal
      };
    } catch (error) {
      console.error('Error fetching platform fees:', error);
      // Fallback to hardcoded values using correct formula
      const basePrice = totalPriceWithGST / 1.05;
      const gstAmount = totalPriceWithGST - basePrice;
      
      const itemTotal = Math.round(basePrice * 100) / 100;
      const gst = Math.round(gstAmount * 100) / 100;
      const platformFee = 0.00;
      const deliveryCharge = 0;
      const discountAmount = appliedCoupon ? Math.round(appliedCoupon.discountAmount * 100) / 100 : 0;
      const finalTotal = Math.round(Math.max(0, itemTotal + gst + platformFee + deliveryCharge - discountAmount) * 100) / 100;
      
      return {
        itemTotal,
        gst,
        platformFee,
        deliveryCharge,
        discountAmount,
        finalTotal
      };
    }
  };

  // Auto-calculate totals when items or coupon change
  useEffect(() => {
    const updateTotals = async () => {
      setTotalsLoading(true);
      try {
        const newTotals = await calculateTotals();
        setTotals(newTotals);
      } finally {
        setTotalsLoading(false);
      }
    };
    
    updateTotals();
  }, [items, appliedCoupon]);

  const itemCount = items.reduce(
    (count, item) => count + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        calculateTotals,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        couponLoading,
        totals,
        totalsLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 