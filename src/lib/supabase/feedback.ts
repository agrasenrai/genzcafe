import { supabase } from './client';

export interface OrderFeedback {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface ItemFeedback {
  orderItemId: string;
  menuItemId: string;
  orderId: string;
  rating: number;
  comment?: string;
}

/**
 * Submit feedback for an entire order
 */
export async function submitOrderFeedback(feedback: OrderFeedback) {
  const { data, error } = await supabase
    .from('order_feedback')
    .upsert({
      order_id: feedback.orderId,
      rating: feedback.rating,
      comment: feedback.comment || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'order_id' })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Submit feedback for an individual menu item in an order
 */
export async function submitItemFeedback(feedback: ItemFeedback) {
  const { data, error } = await supabase
    .from('item_feedback')
    .upsert({
      order_item_id: feedback.orderItemId,
      menu_item_id: feedback.menuItemId,
      order_id: feedback.orderId,
      rating: feedback.rating,
      comment: feedback.comment || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'order_item_id' })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Get feedback for a specific order
 */
export async function getOrderFeedback(orderId: string) {
  const { data, error } = await supabase
    .from('order_feedback')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return data;
}

/**
 * Get feedback for all items in a specific order
 */
export async function getItemsFeedback(orderId: string) {
  const { data, error } = await supabase
    .from('item_feedback')
    .select('*')
    .eq('order_id', orderId);

  if (error) {
    return [];
  }
  return data || [];
}

/**
 * Check if an order already has feedback
 */
export async function hasOrderFeedback(orderId: string): Promise<boolean> {
  const { data } = await getOrderFeedback(orderId);
  return !!data;
}

/**
 * Check if an order item already has feedback
 */
export async function hasItemFeedback(orderItemId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('item_feedback')
    .select('id')
    .eq('order_item_id', orderItemId)
    .single();

  return !!data;
} 