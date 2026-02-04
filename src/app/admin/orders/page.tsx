'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { playNotificationSound } from '@/lib/utils/notificationSound';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { updateOrderStatus } from '@/lib/supabase/orders';
import { formatPrice, formatDate, formatTime } from '@/lib/utils/helpers';
import { getOrderFeedback, getItemsFeedback } from '@/lib/supabase/feedback';
import { printMultipleKOTs } from '@/lib/utils/kotGenerator';
import { printBill as printBillDocument, printBillAutomatically } from '@/lib/utils/billGenerator';
import { getOrderForKOT, formatOrderForKOT, formatOrderForBill } from '@/lib/supabase/kotService';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  menu_item_id: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  created_at: string;
  status: string;
  order_type: 'pickup' | 'delivery';
  delivery_address: string | null;
  scheduled_time: string;
  payment_method: 'card' | 'cash';
  payment_id?: string;
  payment_status?: string;
  item_total: number;
  gst: number;
  platform_fee: number;
  delivery_charge: number;
  final_total: number;
  otp: string;
  order_items: OrderItem[];
}

interface OrderWithFeedback extends Order {
  feedback?: {
    rating: number;
    comment?: string;
  } | null;
  itemFeedback?: Array<{
    item_name: string;
    rating: number;
    comment?: string;
  }> | null;
}
//redpployment test
//redd
//redddd
export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'takeaway' | 'delivery'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithFeedback | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const printMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Notification state
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*, order_items(*)');
      
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: true });
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Format orders and fetch feedback data
      const formattedOrders = await Promise.all((data || []).map(async (order) => {
        // Get order feedback
        let orderFeedback = null;
        try {
          orderFeedback = await getOrderFeedback(order.id);
        } catch (err) {
          console.error(`Error fetching feedback for order ${order.id}:`, err);
        }
        
        // Get item feedback
        let itemsFeedbackData: Array<{ item_name: string; rating: number; comment?: string }> = [];
        try {
          const itemsFeedbackRaw = await getItemsFeedback(order.id);
          if (itemsFeedbackRaw && itemsFeedbackRaw.length > 0) {
            itemsFeedbackData = itemsFeedbackRaw.map(feedback => {
              // Find the item name from order_items
              const item = order.order_items.find(item => item.id === feedback.order_item_id);
              return {
                item_name: item ? item.name : 'Unknown Item',
                rating: feedback.rating,
                comment: feedback.comment
              };
            });
          }
        } catch (err) {
          console.error(`Error fetching item feedback for order ${order.id}:`, err);
        }
        
        return {
          ...order,
          feedback: orderFeedback,
          itemFeedback: itemsFeedbackData
        };
      }));
      
      setOrders(formattedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchOrders();

    // Set up real-time subscription for new orders
    const subscription = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // We'll fetch orders, then detect new ones
          fetchOrders();
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [fetchOrders]);

  // Detect new pending orders and play sound
  useEffect(() => {
    if (loading) return;
    const currentPending = orders.filter(o => o.status === 'pending');
    const currentIds = new Set(currentPending.map(o => o.id));
    const prevIds = prevOrderIdsRef.current;

    // Only play sound for new pending orders (not for status changes or refresh)
    let newOrderDetected = false;
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        newOrderDetected = true;
        break;
      }
    }
    if (newOrderDetected && currentPending.length > 0) {
      playNotificationSound();
      setShowNewOrderAlert(true);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => setShowNewOrderAlert(false), 2500);
    }
    prevOrderIdsRef.current = currentIds;
  }, [orders, loading]);

  // Filter orders by status
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter === 'all') {
      // continue
    } else if (statusFilter === 'active') {
      if (!['pending', 'confirmed', 'preparing'].includes(order.status)) {
        return false;
      }
    } else if (order.status !== statusFilter) {
      return false;
    }

    // Location filter
    if (locationFilter === 'takeaway') {
      return order.delivery_address && order.delivery_address.toLowerCase().includes('take');
    } else if (locationFilter === 'delivery') {
      return order.delivery_address && !order.delivery_address.toLowerCase().includes('take');
    }

    return true;
  });

  // Handle status update
  type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'awaiting_payment';
  
  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(true);
      await updateOrderStatus(orderId, newStatus);
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      // Auto-print KOT when order is confirmed
      if (newStatus === 'confirmed') {
        try {
          const order = await getOrderForKOT(orderId);
          const kotData = formatOrderForKOT(order);
          
          // Print 2 KOTs automatically
          setTimeout(() => {
            printMultipleKOTs(kotData, 2);
          }, 500);
        } catch (kotError) {
          console.error('Error printing KOT:', kotError);
          // Don't fail the status update if KOT printing fails
        }
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get the next status in the flow
  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | undefined => {
    const statusFlow: Record<OrderStatus, OrderStatus | undefined> = {
      'pending': 'confirmed',
      'confirmed': 'ready',
      'preparing': 'ready',
      'ready': undefined,
      'out_for_delivery': undefined,
      'delivered': undefined,
      'cancelled': undefined,
      'awaiting_payment': undefined
    };
    return statusFlow[currentStatus];
  };

  // Quick status update
  const handleQuickStatusUpdate = async (e: React.MouseEvent, orderId: string, currentStatus: OrderStatus) => {
    e.stopPropagation(); // Prevent opening the modal
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      await handleStatusUpdate(orderId, nextStatus);
    }
  };

  // Helper function to render stars based on rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 relative">
      {/* Visual Alert for New Order */}
      {showNewOrderAlert && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-yellow-200 text-yellow-900 px-4 py-2 rounded shadow-lg animate-bounce">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
          <span className="font-semibold">New Order Received!</span>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
        <p className="text-gray-600">Manage your restaurant orders</p>
      </div>

      {/* Counter Management Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Counter Management</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setLocationFilter('all')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              locationFilter === 'all'
                ? 'bg-black text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>All Orders</span>
              <span className="text-xs mt-1 opacity-80">{orders.length} orders</span>
            </div>
          </button>
          <button
            onClick={() => setLocationFilter('takeaway')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              locationFilter === 'takeaway'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Takeaway</span>
              <span className="text-xs mt-1 opacity-80">
                {orders.filter(o => o.delivery_address && o.delivery_address.toLowerCase().includes('take')).length} orders
              </span>
            </div>
          </button>
          <button
            onClick={() => setLocationFilter('delivery')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              locationFilter === 'delivery'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>Delivery</span>
              <span className="text-xs mt-1 opacity-80">
                {orders.filter(o => o.delivery_address && !o.delivery_address.toLowerCase().includes('take')).length} orders
              </span>
            </div>
          </button>
        </div>
      </div>

      <div className={isFullscreen ? 'fixed inset-0 z-40 bg-white overflow-hidden flex flex-col' : ''}>
        {/* Fullscreen Icon - Visible in both modes */}
        {isFullscreen && (
          <div className="absolute top-2 right-2 z-50">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md"
              title="Exit fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className={`bg-white p-4 rounded-lg shadow-sm mb-6 ${isFullscreen ? 'rounded-none mb-0 flex-shrink-0' : ''}`}>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
                <div className="flex flex-wrap gap-3">
                  {['all', 'active', 'pending', 'confirmed', 'ready', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                        statusFilter === status
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      {status === 'all' ? 'All Orders' : status === 'active' ? 'Active Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Sort By</h3>
                <div className="flex gap-3">
                  {['newest', 'oldest'].map((sort) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                        sortBy === sort
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      }`}
                    >
                      {sort === 'newest' ? 'Newest First' : 'Oldest First'}
                    </button>
                  ))}
                </div>
              </div>
              {!isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md ml-4"
                  title="Enter fullscreen"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 20v-4m0 4h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={isFullscreen ? 'flex-1 overflow-y-auto p-6' : ''}>
          {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No orders found.</p>
          </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Point
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pickup Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => {
                    setSelectedOrder(order);
                    setModalOpen(true);
                  }} 
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">#{order.otp}</span>
                      <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                      <span className="text-sm text-gray-500">{formatPrice(Math.round(order.final_total))}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.delivery_address || <span className="text-gray-400">Not specified</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                      </span>
                      {getNextStatus(order.status as OrderStatus) && !['delivered', 'cancelled'].includes(order.status) && (
                        <button
                          onClick={(e) => handleQuickStatusUpdate(e, order.id, order.status as OrderStatus)}
                          disabled={updatingStatus}
                          className={`px-2 py-1 text-xs font-medium rounded-full bg-black text-white hover:bg-gray-800 transition-colors ${
                            updatingStatus ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                            → {getNextStatus(order.status as OrderStatus)
                              ? getNextStatus(order.status as OrderStatus)!.charAt(0).toUpperCase() + getNextStatus(order.status as OrderStatus)!.slice(1)
                              : ''}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {order.scheduled_time ? (() => {
                        const scheduledDate = new Date(order.scheduled_time);
                        const createdDate = new Date(order.created_at);
                        const timeDiff = Math.abs(scheduledDate.getTime() - createdDate.getTime());
                        const minutesDiff = timeDiff / (1000 * 60);
                        const isASAP = minutesDiff <= 5; // Consider ASAP if within 5 minutes of order creation
                        
                        return (
                          <span className={`text-xs font-medium ${isASAP ? 'text-purple-700' : 'text-yellow-700'}`}>
                            {isASAP ? 'ASAP' : new Date(order.scheduled_time).toLocaleString()}
                          </span>
                        );
                      })() : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                      {order.scheduled_time && [5, 10, 20].map((min) => (
                        <button
                          key={min}                       
                          //uu
                          className="ml-1 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold"
                          title={`Add ${min} minutes to pickup time`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newTime = new Date(order.scheduled_time);
                            newTime.setMinutes(newTime.getMinutes() + min);
                            const { error } = await supabase
                              .from('orders')
                              .update({ scheduled_time: newTime.toISOString() })
                              .eq('id', order.id);
                            if (!error) {
                              setOrders(orders => orders.map(o => o.id === order.id ? { ...o, scheduled_time: newTime.toISOString() } : o));
                              if (selectedOrder && selectedOrder.id === order.id) {
                                setSelectedOrder({ ...selectedOrder, scheduled_time: newTime.toISOString() });
                              }
                            } else {
                              alert('Failed to update pickup time');
                            }
                          }}
                        >
                          +{min}m
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          const billData = formatOrderForBill(order);
                          printBillAutomatically(billData);
                        } catch (error) {
                          console.error('Error printing bill:', error);
                          alert('Failed to print bill');
                        }
                      }}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium flex items-center gap-1.5 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {modalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Order #{selectedOrder.otp}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      selectedOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1).replace('_', ' ')}
                    </span>
                    {selectedOrder.status === 'confirmed' && (
                      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        KOTs Printed
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Customer Info</h4>
                  <p className="mt-1">{selectedOrder.customer_name}</p>
                  <p>{selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && <p>{selectedOrder.customer_email}</p>}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Order Info</h4>
                  <p className="mt-1">Date: {formatDate(selectedOrder.created_at)}</p>
                  <p>Time: {formatTime(selectedOrder.created_at)}</p>
                  <p>Type: {selectedOrder.order_type === 'pickup' ? 'Pickup' : 'Delivery'}</p>
                  {selectedOrder.delivery_address && (
                    <p className="font-medium text-gray-900">Pickup Point: {selectedOrder.delivery_address}</p>
                  )}
                  {selectedOrder.scheduled_time && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Pickup Time:</span>{' '}
                      <span>{new Date(selectedOrder.scheduled_time).toLocaleString()}</span>
                      {[5, 10, 20].map((min) => (
                        <button
                          key={min}
                          className="ml-1 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold"
                          title={`Add ${min} minutes to pickup time`}
                          onClick={async () => {
                            const newTime = new Date(selectedOrder.scheduled_time);
                            newTime.setMinutes(newTime.getMinutes() + min);
                            // Update in DB
                            const { error } = await supabase
                              .from('orders')
                              .update({ scheduled_time: newTime.toISOString() })
                              .eq('id', selectedOrder.id);
                            if (!error) {
                              setSelectedOrder({ ...selectedOrder, scheduled_time: newTime.toISOString() });
                              // Also update in orders list
                              setOrders(orders => orders.map(o => o.id === selectedOrder.id ? { ...o, scheduled_time: newTime.toISOString() } : o));
                            } else {
                              alert('Failed to update pickup time');
                            }
                          }}
                        >
                          +{min}m
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
                <div className="flex flex-wrap gap-2">
                  {(['pending', 'confirmed', 'ready', 'cancelled'] as OrderStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => !updatingStatus && handleStatusUpdate(selectedOrder.id, status)}
                      disabled={updatingStatus || selectedOrder.status === status}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedOrder.status === status 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.order_items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{formatPrice(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-500" colSpan={2}>Subtotal</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatPrice(selectedOrder.item_total)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-500" colSpan={2}>GST</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatPrice(selectedOrder.gst)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-500" colSpan={2}>Platform Fee</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatPrice(selectedOrder.platform_fee)}</td>
                      </tr>
                      {selectedOrder.delivery_charge > 0 && (
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-500" colSpan={2}>Delivery Fee</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatPrice(selectedOrder.delivery_charge)}</td>
                        </tr>
                      )}
                      <tr className="font-bold">
                        <td className="px-4 py-2 text-sm text-gray-900" colSpan={2}>Total</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatPrice(Math.round(selectedOrder.final_total))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
                          
              {/* Payment Info */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Payment</h4>
                <p>Method: {selectedOrder.payment_method === 'card' ? 'Card' : 'Cash'}</p>
                {selectedOrder.payment_id && <p>Payment ID: {selectedOrder.payment_id}</p>}
                {selectedOrder.payment_status && <p>Status: {selectedOrder.payment_status}</p>}
              </div>

              {/* Feedback Section */}
              {selectedOrder.feedback && (
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Feedback</h3>
                  <div className="flex items-center mb-2">
                    <span className="font-medium mr-2">Overall Rating:</span>
                    {renderStars(selectedOrder.feedback.rating)}
                  </div>
                  {selectedOrder.feedback.comment && (
                    <div className="mb-4">
                      <span className="font-medium">Comment:</span>
                      <p className="mt-1 text-gray-600 italic">"{selectedOrder.feedback.comment}"</p>
                    </div>
                  )}
                  
                  {selectedOrder.itemFeedback && selectedOrder.itemFeedback.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-800 mb-2">Item Ratings:</h4>
                      <div className="space-y-3">
                        {selectedOrder.itemFeedback.map((feedback, index) => (
                          <div key={index} className="border-t pt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{feedback.item_name}</span>
                              {renderStars(feedback.rating)}
                            </div>
                            {feedback.comment && (
                              <p className="text-sm text-gray-600 italic mt-1">"{feedback.comment}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-between gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    try {
                      const kotData = formatOrderForKOT(selectedOrder);
                      const billData = formatOrderForBill(selectedOrder);
                      printMultipleKOTs(kotData, 2);
                      setPrintMessage('KOT printing initiated - 2 copies');
                      if (printMessageTimeoutRef.current) clearTimeout(printMessageTimeoutRef.current);
                      
                      // After KOTs are printed, automatically print bill as well
                      printMessageTimeoutRef.current = setTimeout(() => {
                        printBillAutomatically(billData);
                        setPrintMessage('Bill printing automatically');
                        printMessageTimeoutRef.current = setTimeout(() => setPrintMessage(null), 3000);
                      }, 3500); // Wait for 2 KOTs to complete printing
                    } catch (error) {
                      console.error('Error printing KOT/Bill:', error);
                      setPrintMessage('Failed to print KOT/Bill');
                      if (printMessageTimeoutRef.current) clearTimeout(printMessageTimeoutRef.current);
                      printMessageTimeoutRef.current = setTimeout(() => setPrintMessage(null), 3000);
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                  </svg>
                  Print KOT (x2)
                </button>
                <button
                  onClick={() => {
                    try {
                      const billData = formatOrderForBill(selectedOrder);
                      printBillDocument(billData);
                      setPrintMessage('Bill printing initiated');
                      if (printMessageTimeoutRef.current) clearTimeout(printMessageTimeoutRef.current);
                      printMessageTimeoutRef.current = setTimeout(() => setPrintMessage(null), 3000);
                    } catch (error) {
                      console.error('Error printing Bill:', error);
                      setPrintMessage('Failed to print Bill');
                      if (printMessageTimeoutRef.current) clearTimeout(printMessageTimeoutRef.current);
                      printMessageTimeoutRef.current = setTimeout(() => setPrintMessage(null), 3000);
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                  </svg>
                  Print Bill
                </button>
              </div>
              {printMessage && (
                <div className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                  printMessage.includes('Failed') 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {!printMessage.includes('Failed') && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                  {printMessage}
                </div>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 