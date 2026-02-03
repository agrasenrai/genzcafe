'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCart } from '@/lib/context/CartContext';
import { createOrder, updateOrderPayment } from '@/lib/supabase/orders';
import { initializeRazorpayPayment } from '@/lib/utils/razorpay';
import { getPlatformFees, getRestaurantSettings, isRestaurantOpen, getDeliveryPointsFromSettings } from '@/lib/supabase/settings';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, calculateTotals, appliedCoupon, applyCoupon, removeCoupon, couponLoading } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('cash');
  
  // Get current time and max time (6 hours from now) for time picker - dynamic calculation
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const getMaxTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 6);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Validate if selected time is within 6 hours from now
  const isTimeValid = (timeString: string) => {
    if (!timeString) return true;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const maxAllowedTime = new Date();
    maxAllowedTime.setHours(maxAllowedTime.getHours() + 6);
    
    return selectedTime >= now && selectedTime <= maxAllowedTime;
  };
  const [orderError, setOrderError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [totals, setTotals] = useState({
    itemTotal: 0,
    gst: 0,
    platformFee: 0,
    deliveryCharge: 0,
    discountAmount: 0,
    finalTotal: 0
  });
  const [taxRate, setTaxRate] = useState(5); // Default to 5% but will be updated from settings
  const [paymentSettings, setPaymentSettings] = useState({
    accept_credit_cards: true,
    accept_cash: true
  });
  
  // Customer information fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  // Delivery points state
  const [deliveryPoints, setDeliveryPoints] = useState<Array<{name: string; address: string; phone?: string}>>([]);
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<string>('');
  
  // Coupon state for checkout
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Calculate totals, tax rate, and payment settings whenever items change
  useEffect(() => {
    const loadSettingsAndTotals = async () => {
      const [calculatedTotals, fees, restaurantSettings] = await Promise.all([
        calculateTotals(),
        getPlatformFees(),
        getRestaurantSettings()
      ]);
      
      setTotals(calculatedTotals);
      setTaxRate(Math.round(fees.gstRate * 100)); // Convert decimal to percentage
      
      if (restaurantSettings) {
        setPaymentSettings({
          accept_credit_cards: restaurantSettings.accept_credit_cards ?? true,
          accept_cash: restaurantSettings.accept_cash ?? true
        });
        
        // Load delivery points
        const points = getDeliveryPointsFromSettings(restaurantSettings);
        setDeliveryPoints(points);
        if (points.length > 0) {
          setSelectedDeliveryPoint(points[0].name);
        }
      }
    };
    loadSettingsAndTotals();
  }, [items, calculateTotals, appliedCoupon]);

  const finalAmount = totals.finalTotal - totals.deliveryCharge;
  
  // Is ASAP delivery selected?
  const isASAPPickup = scheduledTime === '';

  // Update payment method when pickup time or settings change
  useEffect(() => {
    // If not ASAP and payment method is cash, switch to card
    if (!isASAPPickup && paymentMethod === 'cash') {
      if (paymentSettings.accept_credit_cards) {
        setPaymentMethod('card');
      }
    }
    
    // If current payment method is not available, switch to an available one
    if (paymentMethod === 'card' && !paymentSettings.accept_credit_cards) {
      if (paymentSettings.accept_cash) {
        setPaymentMethod('cash');
      }
    } else if (paymentMethod === 'cash' && !paymentSettings.accept_cash) {
      if (paymentSettings.accept_credit_cards) {
        setPaymentMethod('card');
      }
    }
  }, [scheduledTime, isASAPPickup, paymentMethod, paymentSettings]);

  useEffect(() => {
    // Check if we have items in the cart
    if (items.length === 0) {
      router.push('/menu');
    }
  }, [items.length, router]);

  // If no items, the useEffect will handle redirection
  if (items.length === 0) {
    return null;
  }

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

  const formatScheduledTime = () => {
    if (!scheduledTime || scheduledTime === '') return new Date().toISOString();
    
    // Parse the time input (HH:MM format)
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    // If the scheduled time is before current time, assume it's for tomorrow
    if (scheduledDate < new Date()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    return scheduledDate.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    setOrderError(null);

    try {
      // Check if restaurant is still open before placing order
      const restaurantIsOpen = await isRestaurantOpen();
      if (!restaurantIsOpen) {
        setOrderError('Sorry, the restaurant is currently closed. Please try again during our operating hours.');
        setIsProcessing(false);
        return;
      }
      // Format the order data for Supabase
      const formattedScheduledTime = formatScheduledTime();
      
      // Prepare order items
      const orderItems = items.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));
      
      // Create the order data structure
      const orderData = {
        user_id: null, // No user ID for guest checkout
        order_type: 'pickup' as const, // Explicitly type as 'pickup'
        delivery_address: selectedDeliveryPoint || null, // Selected pickup location
        scheduled_time: formattedScheduledTime,
        payment_method: paymentMethod,
        item_total: totals.itemTotal,
        gst: totals.gst,
        platform_fee: totals.platformFee,
        delivery_charge: 0, // No delivery charge since only pickup is available
        final_total: finalAmount,
        coupon_id: appliedCoupon?.couponId || null,
        coupon_code: appliedCoupon?.code || null,
        discount_amount: totals.discountAmount,
        order_items: orderItems,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null
      };

      console.log('Order data being sent:', orderData); // Debug log
      console.log('Selected delivery point:', selectedDeliveryPoint); // Debug log

      // Submit order to Supabase
      const { orderId, otp } = await createOrder(orderData);
      
      // Build order details for localStorage (for confirmation page)
      const orderDetails = {
        id: orderId,
        items,
        itemTotal: totals.itemTotal,
        gst: totals.gst,
        platformFee: totals.platformFee,
        deliveryCharge: 0,
        discountAmount: totals.discountAmount,
        finalTotal: finalAmount,
        orderType: 'pickup',
        deliveryAddress: selectedDeliveryPoint || null,
        scheduledTime: scheduledTime || 'ASAP',
        paymentMethod,
        otp,
        couponCode: appliedCoupon?.code,
        couponName: appliedCoupon?.name,
        customer: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
        },
        status: paymentMethod === 'cash' ? 'confirmed' : 'awaiting_payment',
        createdAt: new Date().toISOString(),
      };

      // Clear the cart 
      clearCart();

      // Store order details in localStorage
      localStorage.setItem('lastOrder', JSON.stringify(orderDetails));

      // If payment method is card, initialize Razorpay
      if (paymentMethod === 'card') {
        try {
          await initializeRazorpayPayment({
            amount: finalAmount,
            orderId: orderId,
            customerName: customerName,
            customerEmail: customerEmail,
            customerPhone: customerPhone,
            onSuccess: async (paymentId, _, __) => {
              try {
                console.log(`Payment successful: ID ${paymentId}`);
                // Update order payment status
                await updateOrderPayment(orderId, paymentId, 'completed');
                
                // Update stored order details
                const updatedOrderDetails = {
                  ...orderDetails,
                  status: 'confirmed',
                  paymentId,
                };
                localStorage.setItem('lastOrder', JSON.stringify(updatedOrderDetails));
                
                // Navigate to confirmation page
                window.location.href = '/checkout/confirmation';
              } catch (error) {
                console.error('Error updating payment status:', error);
                // Still redirect to confirmation, but with the original order details
                window.location.href = '/checkout/confirmation';
              }
            },
            onFailure: async (error) => {
              console.error('Payment failed or cancelled:', error?.message || error);
              
              try {
                // Update order payment status
                await updateOrderPayment(orderId, 'failed', 'failed');
                
                // Update stored order details
                const updatedOrderDetails = {
                  ...orderDetails,
                  status: 'cancelled',
                };
                localStorage.setItem('lastOrder', JSON.stringify(updatedOrderDetails));
              } catch (err) {
                console.error('Error updating payment status:', err);
              }
              
              // Show error and allow retry
              setOrderError('Payment failed or was cancelled. Please try again.');
              setIsProcessing(false);
            }
          });
        } catch (error) {
          console.error('Razorpay initialization failed:', error);
          setOrderError('Failed to initialize payment gateway. Please try again.');
          setIsProcessing(false);
        }
      } else {
        // For cash payments, redirect immediately
        window.location.href = '/checkout/confirmation';
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      setOrderError('Something went wrong while processing your order. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-[#FFFDF7] overflow-hidden flex flex-col border border-gray-200 rounded-2xl shadow-xl">
      <header className="bg-[#FFFDF7] border-b border-yellow-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <Link href="/cart" className="text-gray-700 hover:text-gray-900 transition-colors">
            <span className="sr-only">Back to Cart</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold ml-3 text-gray-900">Checkout</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-[#FFFDF7]">
        {orderError && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {orderError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Customer Details */}
          <div className="bg-white rounded-lg p-3.5 shadow-sm border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 bg-gradient-to-r from-yellow-50 to-transparent px-2 py-1.5 rounded -mx-2">Your Information</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Name*
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-20 focus:border-yellow-300 bg-white focus:bg-yellow-50 text-sm transition-all duration-200 hover:border-gray-300 font-light"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Phone Number*
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-20 focus:border-yellow-300 bg-white focus:bg-yellow-50 text-sm transition-all duration-200 hover:border-gray-300 font-light"
                  placeholder="Your phone number"
                />
              </div>
            </div>
          </div>

          {/* Pickup Information Section */}
          {deliveryPoints.length > 0 && (
            <div className="bg-white rounded-lg p-3.5 shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 bg-gradient-to-r from-amber-50 to-transparent px-2 py-1.5 rounded -mx-2">Pickup Location</h2>
              <div className="space-y-2">
                {deliveryPoints.map((point) => (
                  <label key={point.name} className="flex items-start p-2.5 border border-gray-200 rounded-lg cursor-pointer transition-all hover:border-gray-300 hover:bg-gray-50"
                    style={{
                      borderColor: selectedDeliveryPoint === point.name ? '#1e40af' : '#e5e7eb',
                      backgroundColor: selectedDeliveryPoint === point.name ? '#eff6ff' : '#fff'
                    }}
                  >
                    <input
                      type="radio"
                      name="delivery_location"
                      value={point.name}
                      checked={selectedDeliveryPoint === point.name}
                      onChange={(e) => setSelectedDeliveryPoint(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{point.name}</p>
                      <p className="text-xs text-gray-600 font-light">{point.address}</p>
                      {point.phone && <p className="text-xs text-gray-500 font-light mt-1">📞 {point.phone}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
{/* chedule time and card payment logic commented out 
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Time
            </label>
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScheduledTime('');
                    setTimeError(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    scheduledTime === ''
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ASAP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (scheduledTime === '') {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 30);
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      setScheduledTime(`${hours}:${minutes}`);
                    }
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    scheduledTime !== ''
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Schedule
                </button>
              </div>
              
              {scheduledTime !== '' && (
                <div className="relative">
                  <input
                    type="time"
                    id="time"
                    value={scheduledTime}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      if (isTimeValid(newTime)) {
                        setScheduledTime(newTime);
                        setTimeError(null);
                      } else {
                        setTimeError(`Time not applicable. Please select a time between ${getCurrentTime()} and ${getMaxTime()} (within 6 hours from now)`);
                      }
                    }}
                    min={getCurrentTime()}
                    max={getMaxTime()}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:border-black text-lg ${
                      timeError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
                    }`}
                    required={scheduledTime !== ''}
                  />
                  {timeError ? (
                    <p className="mt-1 text-xs text-red-600">
                      {timeError}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      Select a time within the next 6 hours (until {getMaxTime()})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Payment Method</h2>
            <div className="flex gap-4">
              {paymentSettings.accept_credit_cards && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2 rounded-full border-2 ${
                    paymentMethod === 'card'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  Card
                </button>
              )}
              {paymentSettings.accept_cash && isASAPPickup && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2 rounded-full border-2 ${
                    paymentMethod === 'cash'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  Pay on Counter
                </button>
              )}
            </div>
            
            {!paymentSettings.accept_credit_cards && !paymentSettings.accept_cash && (
              <p className="mt-2 text-sm text-red-600">
                No payment methods are currently available. Please contact the restaurant.
              </p>
            )}
            
            {paymentMethod === 'card' && paymentSettings.accept_credit_cards && (
              <p className="mt-2 text-sm text-gray-600">
                You'll be redirected to our secure payment partner Razorpay to complete your payment.
              </p>
            )}
            
            {paymentMethod === 'cash' && isASAPPickup && (
              <p className="mt-2 text-sm text-gray-600">
                Pay on counter when you pickup your order at our restaurant.
              </p>
            )}
            
            {!isASAPPickup && paymentSettings.accept_cash && (
              <p className="mt-2 text-sm text-gray-600">
                Pay on Counter is only available for ASAP pickup orders. Please select a card payment or choose ASAP pickup.
              </p>
            )}
            
            {!paymentSettings.accept_credit_cards && paymentSettings.accept_cash && (
              <p className="mt-2 text-sm text-gray-600">
                Only Pay on Counter is accepted for ASAP pickup.
              </p>
            )}
            
            {paymentSettings.accept_credit_cards && !paymentSettings.accept_cash && (
              <p className="mt-2 text-sm text-gray-600">
                Only card payments are accepted.
              </p>
            )}
          </div>
 */}
 


          {/* Order Summary */}
          <div className="bg-white rounded-lg p-3.5 shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 bg-gradient-to-r from-yellow-50 to-transparent px-2 py-1.5 rounded -mx-2">Order Summary</h3>
            <div className="space-y-2 mb-3 bg-gradient-to-b from-yellow-50 to-white rounded-lg p-2.5 border border-yellow-100">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-gray-700 px-2 py-1.5 bg-white rounded border border-yellow-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
                  <span className="font-medium text-gray-800">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-semibold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Coupon Management Section */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              {appliedCoupon ? (
                <div className="mb-2 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-semibold text-yellow-800 tracking-wide">{appliedCoupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-red-600 hover:text-red-700 text-xs font-semibold flex-shrink-0 transition-colors duration-200"
                  >
                    Remove
                  </button>
                </div>
              ) : !showCouponInput ? (
                <button
                  type="button"
                  onClick={() => setShowCouponInput(true)}
                  className="mb-2 w-full flex items-center justify-center gap-2 text-xs font-semibold text-yellow-600 py-1 rounded-lg hover:text-yellow-700 hover:bg-yellow-50 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Add Coupon
                </button>
              ) : (
                <div className="mb-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex gap-2 mb-1.5">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      placeholder="Enter code"
                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent uppercase bg-white transition-colors"
                      maxLength={15}
                      disabled={couponLoading}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-3 py-1.5 text-xs font-semibold bg-yellow-50 text-yellow-900 border border-gray-900 rounded-lg hover:bg-white disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {couponLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCouponInput(false);
                      setCouponCode('');
                      setCouponError(null);
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  {couponError && (
                    <p className="text-red-600 text-xs mt-2 font-medium">{couponError}</p>
                  )}
                </div>
              )}

              {/* Bill Details */}
              {/* Bill Details */}
              <div className="space-y-1 text-xs bg-gradient-to-b from-purple-50 to-transparent rounded p-2 -mx-2 mb-2">
                <div className="flex justify-between text-gray-600">
                  <span className="font-light">Item Total</span>
                  <span className="font-medium">₹{totals.itemTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="font-light">GST ({taxRate}%)</span>
                  <span className="font-medium">₹{totals.gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="font-light">Platform Fee</span>
                  <span className="font-medium">₹{totals.platformFee.toFixed(2)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-yellow-700 items-center border-t border-gray-100 pt-1 mt-1">
                    <span className="flex items-center gap-1 font-light">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Discount
                    </span>
                    <span className="font-semibold">-₹{totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3 bg-gradient-to-r from-yellow-50 to-transparent rounded p-2 -mx-2 -mb-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-semibold text-gray-900">₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || (!paymentSettings.accept_credit_cards && !paymentSettings.accept_cash)}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
              isProcessing || (!paymentSettings.accept_credit_cards && !paymentSettings.accept_cash)
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-yellow-50 text-yellow-900 border border-gray-900 hover:bg-white'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Processing...</span>
              </div>
            ) : (
              paymentMethod === 'card' ? 'Pay & Place Order' : '✓ Place Order'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

// Coupon Input Component
function CouponInput({
  appliedCoupon,
  applyCoupon,
  removeCoupon,
  couponLoading,
  customerName,
  customerPhone
}: {
  appliedCoupon: any;
  applyCoupon: (code: string, userId?: string | null) => Promise<any>;
  removeCoupon: () => void;
  couponLoading: boolean;
  customerName: string;
  customerPhone: string;
}) {
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponError(null);
    
    // Create a temporary user ID from phone number for validation
    const tempUserId = customerPhone ? `guest_${customerPhone}` : null;
    
    try {
      const result = await applyCoupon(couponCode.trim(), tempUserId);
      
      if (result.valid) {
        setCouponCode('');
        setShowInput(false);
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
    setShowInput(false);
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Promo Code</h2>
        {appliedCoupon ? (
          <button
            type="button"
            onClick={handleRemoveCoupon}
            className="text-red-600 text-sm font-medium hover:text-red-700"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(!showInput)}
            className="text-yellow-600 text-sm font-medium hover:text-yellow-700"
          >
            {showInput ? 'Cancel' : 'Add Code'}
          </button>
        )}
      </div>

      {appliedCoupon ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800">{appliedCoupon.code}</p>
              <p className="text-sm text-yellow-700">{appliedCoupon.name}</p>
              {appliedCoupon.description && (
                <p className="text-xs text-yellow-600 mt-1">{appliedCoupon.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-medium text-yellow-800">
                -₹{appliedCoupon.discountAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      ) : showInput ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              placeholder="Enter coupon code"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              disabled={couponLoading}
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
            >
              {couponLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Apply'
              )}
            </button>
          </div>
          
          {couponError && (
            <p className="text-red-600 text-sm">{couponError}</p>
          )}
          
          <p className="text-xs text-gray-500">
            Enter a valid coupon code to get discount on your order
          </p>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          Have a promo code? Click "Add Code" to apply it to your order.
        </p>
      )}
    </div>
  );
}
