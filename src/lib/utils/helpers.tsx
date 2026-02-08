// Helper functions for the app

// Format price to Indian Rupees format
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
}

// Format date to DD/MM/YYYY
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format time to HH:MM AM/PM
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Get status info (text and color) for order status
export function getOrderStatusInfo(status: string): { text: string; color: string } {
  switch (status) {
    case 'pending':
      return { text: 'Pending', color: 'text-yellow-500' };
    case 'confirmed':
      return { text: 'Confirmed', color: 'text-blue-500' };
    case 'preparing':
      return { text: 'Preparing', color: 'text-blue-700' };
    case 'ready':
      return { text: 'Ready', color: 'text-green-500' };
    case 'out_for_delivery':
      return { text: 'Out for Delivery', color: 'text-orange-500' };
    case 'delivered':
      return { text: 'Delivered', color: 'text-green-700' };
    case 'cancelled':
      return { text: 'Cancelled', color: 'text-red-500' };
    default:
      return { text: 'Unknown', color: 'text-gray-500' };
  }
}

// Generate a zero-padded OTP placeholder (DB generates real OTPs)
export function generateOTP(length: number = 6): string {
  const normalizedLength = Math.max(1, Math.min(6, length));
  return ''.padStart(normalizedLength, '0');
} 