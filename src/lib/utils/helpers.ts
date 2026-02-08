/**
 * Format price to INR currency
 * @param {number} price - The price to format
 * @returns {string} Formatted price string
 */
export function formatCurrency(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

/**
 * Format date to a human-readable string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate time difference in minutes between two dates
 * @param {string} startDate - Start date ISO string
 * @param {string} endDate - End date ISO string
 * @returns {number} Time difference in minutes
 */
export function getTimeDifferenceInMinutes(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.floor((end - start) / (1000 * 60));
}

/**
 * Format price in Indian Rupees
 */
export function formatPrice(price: number): string {
  return `₹${price.toFixed(2)}`;
}

/**
 * Format time to a readable format
 */
export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get order status text and color
 */
export function getOrderStatusInfo(status: string): { text: string; color: string } {
  switch (status) {
    case 'pending':
      return { text: 'Order Received', color: 'text-blue-600' };
    case 'confirmed':
      return { text: 'Confirmed', color: 'text-indigo-600' };
    case 'preparing':
      return { text: 'Preparing', color: 'text-yellow-600' };
    case 'ready':
      return { text: 'Ready for Pickup', color: 'text-orange-600' };
    case 'out_for_delivery':
      return { text: 'Out for Delivery', color: 'text-orange-600' };
    case 'delivered':
      return { text: 'Delivered', color: 'text-green-600' };
    case 'cancelled':
      return { text: 'Cancelled', color: 'text-red-600' };
    default:
      return { text: 'Unknown', color: 'text-gray-600' };
  }
} 