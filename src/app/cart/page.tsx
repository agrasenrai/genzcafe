'use client';

import Link from 'next/link';
import { useCart } from '@/lib/context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { getPlatformFees } from '@/lib/supabase/settings';

export default function CartPage() {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    calculateTotals, 
    clearCart, 
    appliedCoupon, 
    applyCoupon, 
    removeCoupon, 
    couponLoading 
  } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [totals, setTotals] = useState({
    itemTotal: 0,
    gst: 0,
    platformFee: 0,
    deliveryCharge: 0,
    discountAmount: 0,
    finalTotal: 0
  });
  const [taxRate, setTaxRate] = useState(5); // Default to 5% but will be updated from settings
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate totals and tax rate whenever items change
  useEffect(() => {
    const loadTotalsAndTaxRate = async () => {
      const [calculatedTotals, fees] = await Promise.all([
        calculateTotals(),
        getPlatformFees()
      ]);
      setTotals(calculatedTotals);
      setTaxRate(Math.round(fees.gstRate * 100)); // Convert decimal to percentage
    };
    loadTotalsAndTaxRate();
  }, [items, calculateTotals, appliedCoupon]);

  // Destructure totals for easier access
  const { itemTotal, gst, platformFee, deliveryCharge, discountAmount, finalTotal } = totals;

  // Check if scroll indicator should be shown
  useEffect(() => {
    if (items.length <= 2) return;
    
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Show indicator only when not scrolled and content is scrollable
      const isScrollable = scrollHeight > clientHeight;
      const hasNotScrolledMuch = scrollTop < 10;
      setShowScrollIndicator(isScrollable && hasNotScrolledMuch);
    };
    
    // Check immediately
    checkScroll();
    
    // Add scroll listener
    scrollContainer.addEventListener('scroll', checkScroll);
    return () => scrollContainer.removeEventListener('scroll', checkScroll);
  }, [items]);

  // Coupon handling functions
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponError(null);
    
    try {
      const result = await applyCoupon(couponCode.trim(), null);
      
      if (result.valid) {
        setCouponCode('');
        setShowCouponInput(false);
      } else {
        setCouponError(result.error || 'Invalid coupon code');
      }
    } catch (error) {
      setCouponError('Failed to apply coupon. Please try again.');
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode('');
    setCouponError(null);
    setShowCouponInput(false);
  };

  // Constants
  const freeDeliveryThreshold = 500.00;
  const standardDeliveryCharge = 40.00;

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white overflow-hidden flex flex-col border-2 border-gray-300 rounded-xl shadow-lg">
        <header className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center">
            <Link href="/menu" className="text-gray-700 hover:text-gray-900 transition-colors">
              <span className="sr-only">Back to Menu</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold ml-3 text-gray-900">Cart</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-600 mb-4">Your cart is empty</p>
          <Link
            href="/menu"
            className="bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white overflow-hidden flex flex-col border-2 border-gray-300 rounded-xl shadow-lg">
      <header className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/menu" className="text-gray-700 hover:text-gray-900 transition-colors">
              <span className="sr-only">Back to Menu</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold ml-3 text-gray-900">Cart</h1>
          </div>
          <button
            onClick={clearCart}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear Cart
          </button>
        </div>
      </header>

      {/* Scrollable cart items */}
      <main 
        ref={scrollContainerRef} 
        className="flex-1 p-3 overflow-y-auto relative"
      >
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                  <p className="text-gray-500 text-xs">₹{item.price.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                >
                  <span className="sr-only">Remove item</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors text-sm font-semibold"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors text-sm font-semibold"
                  >
                    +
                  </button>
                </div>
                <div className="font-bold text-gray-900 text-sm">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Scroll indicator arrow */}
        {showScrollIndicator && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg 
              className="w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </div>
        )}
      </main>

      {/* Fixed footer with bill details */}
      <footer className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-3">
          {/* Coupon Section */}
          {appliedCoupon ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="min-w-0">
                  <p className="font-semibold text-green-800 text-sm">{appliedCoupon.code}</p>
                  <p className="text-xs text-green-600 truncate">{appliedCoupon.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-green-800 text-sm whitespace-nowrap">
                  -₹{appliedCoupon.discountAmount.toFixed(2)}
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-red-600 hover:text-red-700 text-xs font-semibold"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : !showCouponInput ? (
            <button
              onClick={() => setShowCouponInput(true)}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-yellow-600 mb-2 hover:text-yellow-700 py-1 rounded-lg hover:bg-yellow-50 transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Add Coupon
            </button>
          ) : (
            <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex gap-1.5 mb-1.5">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="COUPON"
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent uppercase"
                  maxLength={15}
                  disabled={couponLoading}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {couponLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
              <button
                onClick={() => {
                  setShowCouponInput(false);
                  setCouponCode('');
                  setCouponError(null);
                }}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              {couponError && (
                <p className="text-red-600 text-xs mt-1 font-medium">{couponError}</p>
              )}
            </div>
          )}

          {/* Bill Details - Compact */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-700">
                <span>Item Total</span>
                <span className="font-semibold">₹{itemTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>GST ({taxRate}%)</span>
                <span className="font-semibold">₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Platform Fee</span>
                <span className="font-semibold">₹{platformFee.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold border-t border-gray-200 pt-1.5 mt-1.5">
                  <span>Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <Link
            href="/checkout"
            className="flex items-center justify-between w-full bg-black text-white px-4 py-3 rounded-lg font-bold hover:bg-gray-900 active:scale-95 transition-all mb-4"
          >
            <span className="text-sm">Proceed to Checkout</span>
            <span className="text-sm font-semibold">₹{finalTotal.toFixed(2)}</span>
          </Link>
        </div>
      </footer>
    </div>
  );
} 