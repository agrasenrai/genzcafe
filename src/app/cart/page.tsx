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
      <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white overflow-hidden flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center">
            <Link href="/menu" className="text-gray-800">
              <span className="sr-only">Back to Menu</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold ml-4">Cart</h1>
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
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white overflow-hidden flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/menu" className="text-gray-800">
              <span className="sr-only">Back to Menu</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold ml-4">Cart</h1>
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
        className="flex-1 p-4 overflow-y-auto relative"
      >
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-gray-600">₹{item.price.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <span className="sr-only">Remove item</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 flex items-center">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 border rounded-full"
                >
                  -
                </button>
                <span className="mx-3 min-w-[2rem] text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 border rounded-full"
                >
                  +
                </button>
                <div className="ml-auto font-semibold">
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
      <footer className="bg-white border-t shadow-md">
        <div className="max-w-md mx-auto px-4 py-4">
          {/* Coupon Section */}
          {appliedCoupon ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800 text-sm">{appliedCoupon.code}</p>
                    <p className="text-xs text-green-600">{appliedCoupon.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-800 text-sm">
                    -₹{appliedCoupon.discountAmount.toFixed(2)}
                  </span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-red-600 hover:text-red-700 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : !showCouponInput ? (
            <button
              onClick={() => setShowCouponInput(true)}
              className="flex items-center text-sm text-yellow-600 mb-4 hover:text-yellow-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Add Coupon Code
            </button>
          ) : (
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent uppercase"
                  maxLength={15}
                  disabled={couponLoading}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[70px]"
                >
                  {couponLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    'Apply'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCouponInput(false);
                    setCouponCode('');
                    setCouponError(null);
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
              {couponError && (
                <p className="text-red-600 text-xs mt-2">{couponError}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Enter a valid coupon code to get discount on your order
              </p>
            </div>
          )}

          {/* Bill Details */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-3">Bill Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Item Total</span>
                <span>₹{itemTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST ({taxRate}%)</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee</span>
                <span>₹{platformFee.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">To Pay</span>
            <span className="text-xl font-semibold">₹{finalTotal.toFixed(2)}</span>
          </div>
          <Link
            href="/checkout"
            className="block w-full bg-black text-white text-center py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors"
          >
            Proceed to Checkout
          </Link>
        </div>
      </footer>
    </div>
  );
} 