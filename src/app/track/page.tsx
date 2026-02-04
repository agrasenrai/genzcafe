'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import FeedbackForm from '@/components/FeedbackForm';
import { Toaster } from 'react-hot-toast';
import { getStoredOrders } from '@/lib/utils/orders';
import { getPlatformFees } from '@/lib/supabase/settings';

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderDetails {
  id: string;
  items: OrderItem[];
  itemTotal: number;
  gst: number;
  platformFee: number;
  deliveryCharge: number;
  discountAmount: number;
  finalTotal: number;
  orderType: 'pickup';
  deliveryAddress: string | null;
  scheduledTime: string;
  paymentMethod: 'card' | 'cash';
  otp: string;
  status: string;
  createdAt: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  couponCode: string | null;
  expiresAt: string;
}

// Create a client component that uses search params
function TrackOrderContent() {
  const [otp, setOtp] = useState('');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<ReturnType<typeof getStoredOrders>>([]);
  const [taxRate, setTaxRate] = useState(5);
  const searchParams = useSearchParams();

  // Load recent orders and tax rate on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setRecentOrders(getStoredOrders());
      
      // Fetch tax rate
      try {
        const fees = await getPlatformFees();
        setTaxRate(Math.round(fees.gstRate * 100));
      } catch (error) {
        console.error('Error fetching tax rate:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // Auto-fetch order if OTP is provided in URL
  useEffect(() => {
    const otpFromUrl = searchParams.get('otp');
    if (otpFromUrl && otpFromUrl.length === 6) {
      setOtp(otpFromUrl);
      fetchOrderByOtp(otpFromUrl)
        .then(orderDetails => {
          setOrder(orderDetails);
        })
        .catch(err => {
          console.error('Failed to fetch order:', err);
          setError('Order not found. Please check your code and try again.');
        });
    }
  }, [searchParams]);

  // Set up real-time subscription for order updates
  useEffect(() => {
    if (!order) return;

    const subscription = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        },
        (payload) => {
          console.log('Order update received:', payload);
          // Update the order status and scheduled time in real-time
          if (payload.new) {
            setOrder(prev => prev ? {
              ...prev,
              status: payload.new.status,
              scheduledTime: payload.new.scheduledTime || prev.scheduledTime
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [order?.id]);

  const fetchOrderByOtp = async (otp: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('otp', otp)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Order not found');
      
      // Format the data to match our expected format
      const orderDetails: OrderDetails = {
        id: data.id,
        items: data.order_items,
        itemTotal: data.item_total,
        gst: data.gst,
        platformFee: data.platform_fee,
        deliveryCharge: data.delivery_charge,
        discountAmount: data.discount_amount || 0,
        finalTotal: data.final_total,
        orderType: data.order_type,
        deliveryAddress: data.delivery_address,
        scheduledTime: data.scheduled_time,
        paymentMethod: data.payment_method,
        otp: data.otp,
        status: data.status,
        createdAt: data.created_at,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        couponCode: data.coupon_code,
        expiresAt: data.expires_at
      };
      
      return orderDetails;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const orderDetails = await fetchOrderByOtp(otp);
      setOrder(orderDetails);
    } catch (err: any) {
      console.error('Failed to fetch order:', err);
      setError('Order not found. Please check your code and try again.');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the status text and color
  const getStatusDetails = (status: string) => {
    const statusMap: Record<string, { text: string, color: string }> = {
      'pending': { text: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
      'confirmed': { text: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
      'preparing': { text: 'Preparing', color: 'bg-orange-100 text-orange-700' },
      'ready': { text: 'Ready for Pickup', color: 'bg-green-100 text-green-700' },
      'delivered': { text: 'Completed', color: 'bg-green-100 text-green-700' },
      'cancelled': { text: 'Cancelled', color: 'bg-red-100 text-red-700' },
    };
    
    return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-700' };
  };

  // Check if order is delivered and can be rated
  const canLeaveFeedback = order?.status === 'delivered';

  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-[#FFFDF7] overflow-hidden flex flex-col">
      <Toaster position="top-center" />
      <header className="bg-[#FFFDF7] border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <Link href="/" className="text-gray-700 hover:text-gray-900 transition-colors">
            <span className="sr-only">Back to Home</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold ml-3 text-gray-900">Track Order</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3 bg-[#FFFDF7]">
        <div className="max-w-md mx-auto">
          {!order ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <label htmlFor="otp" className="block text-xs font-semibold text-gray-700 mb-2">
                    Enter Order Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-black focus:border-black text-lg tracking-wider text-center font-mono"
                    maxLength={6}
                    required
                    pattern="[0-9]{6}"
                  />
                  {error && (
                    <p className="mt-2 text-red-600 text-sm">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="w-full mt-4 bg-yellow-50 text-yellow-900 py-3 rounded-full font-semibold border-2 border-gray-900 hover:bg-white transition-all shadow-lg hover:shadow-xl active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Searching...' : 'Track Order'}
                  </button>
                </div>
              </form>

              {/* Recent Orders Section */}
              {recentOrders.length > 0 && (
                <>
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#FFFDF7] px-4 text-sm text-gray-500">or choose from recent orders</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-sm font-medium text-gray-700 mb-3">Recent Orders</h2>
                    <div className="space-y-3">
                      {/* Show only the latest order per id */}
                      {Array.from(
                        recentOrders
                          .sort((a, b) => b.expiresAt - a.expiresAt)
                          .reduce((map, order) => {
                            if (!map.has(order.id)) map.set(order.id, order);
                            return map;
                          }, new Map()),
                        ([, order]) => order
                      ).map((recentOrder) => (
                        <button
                          key={recentOrder.id}
                          onClick={async () => {
                            setIsLoading(true);
                            setError(null);
                            try {
                              const orderDetails = await fetchOrderByOtp(recentOrder.otp);
                              setOrder(orderDetails);
                            } catch (err) {
                              console.error('Failed to fetch order:', err);
                              setError('Failed to load order. Please try again.');
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-black transition-colors text-left flex items-center gap-4"
                        >
                          <div className={`flex-none w-12 h-12 rounded-full flex items-center justify-center ${
                            recentOrder.status === 'delivered' ? 'bg-green-100' :
                            recentOrder.status === 'cancelled' ? 'bg-red-100' :
                            'bg-yellow-100'
                          }`}>
                            <svg className={`w-6 h-6 ${
                              recentOrder.status === 'delivered' ? 'text-green-700' :
                              recentOrder.status === 'cancelled' ? 'text-red-700' :
                              'text-yellow-700'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {recentOrder.status === 'delivered' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              ) : recentOrder.status === 'cancelled' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm font-medium truncate">{recentOrder.customer_name}</div>
                                <div className="text-xs text-gray-500">Order #{recentOrder.otp}</div>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                recentOrder.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                recentOrder.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {recentOrder.status.charAt(0).toUpperCase() + recentOrder.status.slice(1)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Available until {new Date(recentOrder.expiresAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex-none text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Order Status */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Order Status</h2>
                  <span className={`px-3 py-1 ${getStatusDetails(order.status).color} rounded-full text-sm`}>
                    {getStatusDetails(order.status).text}
                  </span>
                </div>
                <div className="text-sm space-y-2">
                  <p className="mb-1">
                    <span className="text-gray-600">Order ID:</span>{' '}
                    <span className="text-red-600 font-medium">{order.otp}</span>
                  </p>
                  <p className="text-xs text-red-500 mb-3 italic">
                    Please save this order ID. You'll need it to track your order status and to receive your order at pickup.
                  </p>
                  <p>
                    <span className="text-gray-600">Order Type:</span>{' '}
                    {order.deliveryAddress ? (
                      order.deliveryAddress.toLowerCase().includes('take') ? (
                        <span>Takeaway - <span className="font-medium">{order.deliveryAddress}</span></span>
                      ) : (
                        <span>Delivery - <span className="font-medium">{order.deliveryAddress}</span></span>
                      )
                    ) : (
                      'Pickup'
                    )}
                  </p>
                  <p>
                    <span className="text-gray-600">Customer:</span>{' '}
                    {order.customer_name}
                  </p>
                  <p>
                    <span className="text-gray-600">Phone:</span>{' '}
                    {order.customer_phone}
                  </p>
                  <p>
                    <span className="text-gray-600">Pickup Time:</span>{' '}
                    {order.scheduledTime === 'ASAP' ? 'As soon as possible' : new Date(order.scheduledTime).toLocaleString()}
                  </p>
                  <p>
                    <span className="text-gray-600">Payment Method:</span>{' '}
                    {order.paymentMethod === 'card' ? 'Card' : 'Pay at Counter'}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h2 className="font-semibold mb-4">Order Items</h2>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Item Total</span>
                      <span>₹{order.itemTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST ({taxRate}%)</span>
                      <span>₹{order.gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Platform Fee</span>
                      <span>₹{order.platformFee.toFixed(2)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                        <span>-₹{order.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                      <span>Total</span>
                      <span>₹{Math.round(order.finalTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Form (only shown for delivered orders) */}
              {canLeaveFeedback && (
                <FeedbackForm orderId={order.id} items={order.items} />
              )}

              {/* Help Section */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h2 className="font-semibold mb-4">Need Help?</h2>
                <div className="space-y-4">
                  <a
                    href="tel:+918925824987"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-gray-600 hover:text-gray-900 text-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Call: 8925824987</span>
                  </a>
                </div>
              </div>

              <button
                onClick={() => {
                  setOrder(null);
                  setOtp('');
                  setError(null);
                }}
                className="w-full py-3 border-2 border-black rounded-full font-semibold hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl active:shadow-md"
              >
                Track Another Order
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Loading fallback
function TrackOrderLoading() {
  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
    </div>
  );
}

// Main component with Suspense boundary
export default function TrackOrderPage() {
  return (
    <Suspense fallback={<TrackOrderLoading />}>
      <TrackOrderContent />
    </Suspense>
  );
} 