'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getPlatformFees } from '@/lib/supabase/settings';

interface OrderDetails {
  id: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
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
  paymentId?: string;
  otp: string;
  couponCode?: string;
  couponName?: string;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  status: string;
  createdAt: string;
}

// Helper function to store order details
function storeOrder(orderData: any) {
  const existingOrders = JSON.parse(localStorage.getItem('recentOrders') || '[]');
  existingOrders.unshift(orderData);
  localStorage.setItem('recentOrders', JSON.stringify(existingOrders.slice(0, 10)));
}

export default function CheckoutConfirmation() {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [taxRate, setTaxRate] = useState(5);

  useEffect(() => {
    const loadOrderAndTaxRate = async () => {
      const orderData = localStorage.getItem('lastOrder');
      if (orderData) {
        const orderDetails = JSON.parse(orderData);
        setOrder(orderDetails);
        
        // Store in recent orders
        storeOrder({
          id: orderDetails.id,
          otp: orderDetails.otp,
          customer_name: orderDetails.customer.name,
          status: orderDetails.status,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });
      }
      
      // Fetch tax rate
      try {
        const fees = await getPlatformFees();
        setTaxRate(Math.round(fees.gstRate * 100));
      } catch (error) {
        console.error('Error fetching tax rate:', error);
      }
    };
    
    loadOrderAndTaxRate();
  }, []);

  if (!order) {
    return (
      <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-[#FFFDF7] overflow-hidden flex flex-col border-2 border-gray-300 rounded-xl shadow-lg">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-lg font-bold mb-2">Order Not Found</h1>
          <p className="text-sm text-gray-600 mb-4">We couldn't find your order details.</p>
          <Link
            href="/menu"
            className="inline-block bg-yellow-50 text-yellow-900 px-6 py-3 rounded-lg font-semibold text-sm border border-gray-900 hover:bg-white transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  const orderCancelled = order.status === 'cancelled';

  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-[#FFFDF7] overflow-hidden flex flex-col border-2 border-gray-300 rounded-xl shadow-lg">
      <header className="bg-[#FFFDF7] border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <Link href="/menu" className="text-gray-700 hover:text-gray-900 transition-colors">
            <span className="sr-only">Back to Menu</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold ml-3 text-gray-900">Order Confirmation</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-20 overflow-y-auto">
        <div className="mb-6 text-center">
          {orderCancelled ? (
            <>
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">
                We couldn't process your payment. Your order has been cancelled.
              </p>
              <Link
                href="/checkout"
                className="inline-block bg-yellow-50 text-yellow-900 px-6 py-3 rounded-lg font-medium border border-gray-900 hover:bg-white transition-colors"
              >
                Try Again
              </Link>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Order Confirmed!</h2>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Order Placed
                </span>
              </div>
              <div className="text-sm space-y-2">
                <p className="mb-1">
                  <span className="text-gray-600">Order ID:</span>{' '}
                  <span className="text-red-600 font-medium">{order.otp}</span>
                </p>
                <p className="text-xs text-red-500 mb-3 italic">
                  Important: Save this order ID. You'll need it to track your order status and to receive your order at pickup.
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
              </div>
            </>
          )}
        </div>

        {!orderCancelled && (
          <>
            {/* Order Information */}
            <div className="bg-white rounded-lg p-6 shadow-sm mb-4 border border-gray-200">
              <h2 className="font-semibold mb-4">Order Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID</span>
                  <span className="font-medium">{order.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup OTP</span>
                  <span className="font-medium text-lg">{order.otp}</span>
                </div>
                {order.deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location</span>
                    <span className="font-medium">{order.deliveryAddress}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Time</span>
                  <span>{order.scheduledTime === 'ASAP' ? 'As soon as possible' : order.scheduledTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  {/* <span className="capitalize font-semibold bg-yellow-100 px-3 py-1 rounded-full text-yellow-900">{order.paymentMethod}</span> */}
                  <span className="capitalize font-semibold bg-yellow-100 px-3 py-1 rounded-full text-yellow-900">{"Pay at Counter"}</span>

                </div>
                {order.paymentId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID</span>
                    <span className="font-mono text-xs">{order.paymentId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg p-6 shadow-sm mb-4 border border-gray-200">
              <h2 className="font-semibold mb-4">Customer Information</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span> {order.customer.name}
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span> {order.customer.phone}
                </div>
                {order.customer.email && (
                  <div>
                    <span className="text-gray-600">Email:</span> {order.customer.email}
                  </div>
                )}
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
                <div className="border-t pt-2 mt-2 space-y-1">
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
                  {order.deliveryCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Charge</span>
                      <span>₹{order.deliveryCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                      <span>-₹{order.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>₹{Math.round(order.finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}
      </main>
      
      {/* Fixed Track Order Button */}
      {!orderCancelled && (
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl bg-[#FFFDF7] border-t border-gray-200 p-4">
          <Link
            href={`/track?otp=${order.otp}`}
            className="block w-full bg-yellow-50 text-yellow-900 text-center py-3 rounded-lg font-medium border border-gray-900 hover:bg-white transition-colors"
          >
            Track Order
          </Link>
        </div>
      )}
    </div>
  );
} 