/**
 * Server-side function to handle KOT printing trigger
 * This function should be called when order status changes to "confirmed"
 */

import { supabase } from './client';

interface KOTPrintRequest {
  orderId: string;
  copies?: number;
}

/**
 * Get full order details for KOT generation
 */
export async function getOrderForKOT(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching order for KOT:', error);
    throw error;
  }
}

/**
 * Format order data for KOT display
 */
export function formatOrderForKOT(order: any) {
  const orderTime = new Date(order.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const scheduledTime = order.scheduled_time 
    ? new Date(order.scheduled_time).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : undefined;

  return {
    orderId: order.id,
    orderNumber: order.otp,
    customerName: order.customer_name,
    orderTime: orderTime,
    items: order.order_items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      specialInstructions: undefined,
      packaging: item.packaging ?? false
    })),
    deliveryAddress: order.delivery_address,
    scheduledTime: scheduledTime
  };
}

/**
 * Format order data for Bill display
 */
export function formatOrderForBill(order: any) {
  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN');
  const orderTime = new Date(order.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return {
    orderId: order.id,
    orderNumber: order.otp,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    orderDate: orderDate,
    orderTime: orderTime,
    deliveryAddress: order.delivery_address,
    items: order.order_items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    })),
    itemTotal: order.item_total,
    gst: order.gst,
    platformFee: order.platform_fee,
    packagingFee: order.packaging_fee || 0,
    deliveryCharge: order.delivery_charge,
    finalTotal: order.final_total,
    paymentMethod: order.payment_method === 'card' ? 'Card Payment' : 'Cash',
    paymentStatus: order.payment_status
  };
}
