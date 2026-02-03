import { supabase } from './client';

export interface OrderRow {
  orderId: string;
  itemName: string;
  quantity: number;
  itemPrice: number;
  itemTotal: number;
  gst: number;
  finalTotal: number;
  isFirstItemOfOrder?: boolean;
  isLastItemOfOrder?: boolean;
  rowSpan?: number;
}

interface OrderData {
  id: string;
  otp: string;
  item_total: number;
  gst: number;
  final_total: number;
  order_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

/**
 * Convert UTC timestamp to IST (Indian Standard Time)
 */
export function convertUTCtoIST(utcDate: string): Date {
  const date = new Date(utcDate);
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate;
}

/**
 * Format date for display
 */
export function formatDateIST(utcDate: string): string {
  const istDate = convertUTCtoIST(utcDate);
  return istDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Fetch today's orders with items
 */
export async function getTodaysOrders() {
  // Get today's date in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Get tomorrow's date for the range query
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      otp,
      item_total,
      gst,
      final_total,
      created_at,
      order_items (
        name,
        quantity,
        price
      )
    `)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }

  return orders as OrderData[];
}

/**
 * Transform orders into rows for the report
 */
export function transformOrdersToRows(orders: OrderData[]): OrderRow[] {
  const rows: OrderRow[] = [];

  orders.forEach((order) => {
    const items = order.order_items || [];
    const itemCount = items.length;

    // Add rows for each item in the order
    items.forEach((item, index) => {
      rows.push({
        orderId: '-',
        itemName: item.name,
        quantity: item.quantity,
        itemPrice: item.price,
        itemTotal: 0,
        gst: 0,
        finalTotal: 0,
        isFirstItemOfOrder: index === 0,
        isLastItemOfOrder: false,
        rowSpan: itemCount
      });
    });

    // Add summary row at the end of each order
    rows.push({
      orderId: order.otp,
      itemName: '-',
      quantity: 0,
      itemPrice: 0,
      itemTotal: order.item_total,
      gst: order.gst,
      finalTotal: order.final_total,
      isFirstItemOfOrder: false,
      isLastItemOfOrder: true,
      rowSpan: 1
    });
  });

  return rows;
}

/**
 * Calculate daily statistics
 */
export function calculateDailyStats(orders: OrderData[]) {
  const stats = {
    totalOrders: orders.length,
    totalItems: orders.reduce((sum, order) => sum + (order.order_items?.length || 0), 0),
    totalItemTotal: 0,
    totalGST: 0,
    totalRevenue: 0
  };

  orders.forEach((order) => {
    stats.totalItemTotal += order.item_total;
    stats.totalGST += order.gst;
    stats.totalRevenue += order.final_total;
  });

  return stats;
}
