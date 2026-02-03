import { supabase } from './client';

export interface RestaurantSettings {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  business_hours: string | null;
  delivery_fee: number | null;
  minimum_order_amount: number | null;
  tax_rate: number | null;
  platform_fee: number | null;
  platform_fee_enabled: boolean;
  is_open: boolean;
  accept_credit_cards: boolean;
  accept_cash: boolean;
  offer_takeout: boolean;
  offer_delivery: boolean;
  delivery_radius_km: number | null;
  delivery_points: string | null;  // JSON array of delivery points
  currency: string;
  instagram_handle: string | null;
  facebook_handle: string | null;
  twitter_handle: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get restaurant settings
 */
export async function getRestaurantSettings(): Promise<RestaurantSettings | null> {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*')
    .single();
  
  if (error) {
    console.error('Error fetching restaurant settings:', error);
    return null;
  }
  
  return data as RestaurantSettings;
}

/**
 * Update restaurant settings
 */
export async function updateRestaurantSettings(settings: Partial<RestaurantSettings>) {
  // Get the current settings first to get the ID
  const currentSettings = await getRestaurantSettings();
  if (!currentSettings) {
    throw new Error('No restaurant settings found');
  }

  const { data, error } = await supabase
    .from('restaurant_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentSettings.id)
    .select()
    .single();
  
  if (error) throw error;
  return data as RestaurantSettings;
}

/**
 * Helper function to parse time string to 24-hour format
 */
function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return -1;
  
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  return hour * 60 + minute; // Return minutes since midnight
}

/**
 * Helper function to get current day name
 */
function getCurrentDayName(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

/**
 * Check if restaurant is open
 */
export async function isRestaurantOpen(): Promise<boolean> {
  const settings = await getRestaurantSettings();
  if (!settings) return false;
  
  // First check if manually closed
  if (!settings.is_open) return false;
  
  // Then check business hours
  if (!settings.business_hours) return true; // If no hours set, assume open
  
  try {
    const hours = settings.business_hours;
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = getCurrentDayName();
    
    // Handle complex format: "Mon, Tue, Wed: 9:00 AM - 5:00 PM; Thu, Fri: 10:00 AM - 6:00 PM"
    const scheduleSegments = hours.split(';').map(s => s.trim());
    
    for (const segment of scheduleSegments) {
      // Parse each segment like "Mon, Tue, Wed: 9:00 AM - 5:00 PM"
      const colonIndex = segment.indexOf(':');
      if (colonIndex === -1) continue;
      
      const daysStr = segment.substring(0, colonIndex).trim();
      const timeStr = segment.substring(colonIndex + 1).trim();
      
      // Parse days (Mon, Tue, Wed, etc.)
      const dayAbbreviations = daysStr.split(',').map(d => d.trim().toLowerCase());
      const dayMap: { [key: string]: string } = {
        'mon': 'monday', 'tue': 'tuesday', 'wed': 'wednesday', 'thu': 'thursday',
        'fri': 'friday', 'sat': 'saturday', 'sun': 'sunday',
        'monday': 'monday', 'tuesday': 'tuesday', 'wednesday': 'wednesday', 
        'thursday': 'thursday', 'friday': 'friday', 'saturday': 'saturday', 'sunday': 'sunday'
      };
      
      const applicableDays = dayAbbreviations
        .map(abbr => dayMap[abbr])
        .filter(day => day); // Remove undefined values
      
      // Check if current day is in this segment
      if (!applicableDays.includes(currentDay)) continue;
      
      // Parse time range "9:00 AM - 5:00 PM"
      const timeMatch = timeStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
      if (!timeMatch) continue;
      
      const openTimeInMinutes = parseTime(timeMatch[1]);
      const closeTimeInMinutes = parseTime(timeMatch[2]);
      
      if (openTimeInMinutes === -1 || closeTimeInMinutes === -1) continue;
      
      // Handle overnight hours (e.g., 9:00 PM - 4:00 AM)
      if (closeTimeInMinutes < openTimeInMinutes) {
        // Overnight schedule
        if (currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes <= closeTimeInMinutes) {
          return true;
        }
      } else {
        // Regular schedule (same day)
        if (currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes) {
          return true;
        }
      }
    }
    
    // If no matching schedule found for current day, try simple format as fallback
    const simpleMatch = hours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (simpleMatch) {
      const openTimeInMinutes = parseTime(simpleMatch[1]);
      const closeTimeInMinutes = parseTime(simpleMatch[2]);
      
      if (openTimeInMinutes !== -1 && closeTimeInMinutes !== -1) {
        // Handle overnight hours
        if (closeTimeInMinutes < openTimeInMinutes) {
          return currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes <= closeTimeInMinutes;
        } else {
          return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes;
        }
      }
    }
    
    return false; // No valid schedule found for current day
    
  } catch (error) {
    console.error('Error parsing business hours:', error);
    return true; // If parsing fails, assume open
  }
}

/**
 * Toggle restaurant open/closed status manually
 */
export async function toggleRestaurantStatus(isOpen: boolean) {
  return await updateRestaurantSettings({ is_open: isOpen });
}

// Legacy functions for backward compatibility
export async function getPlatformFees() {
  try {
    const settings = await getRestaurantSettings();
    
    // Ensure we have valid numeric values, with proper fallbacks
    const taxRate = settings?.tax_rate;
    const gstRate = (typeof taxRate === 'number' && taxRate >= 0) ? taxRate / 100 : 0.05;
    
    const platformFee = settings?.platform_fee;
    const validPlatformFee = (typeof platformFee === 'number' && platformFee >= 0) ? platformFee : 15.00;
    
    const result = {
      platformFee: validPlatformFee,
      platformFeeEnabled: settings?.platform_fee_enabled ?? true,
      deliveryCharge: settings?.delivery_fee || 40.00,
      freeDeliveryThreshold: settings?.minimum_order_amount || 500.00,
      gstRate: gstRate
    };
    
    console.log('getPlatformFees result:', result);
    console.log('Original settings tax_rate:', settings?.tax_rate);
    
    return result;
  } catch (error) {
    console.error('Error in getPlatformFees:', error);
    // Return safe fallback values
    return {
      platformFee: 15.00,
      platformFeeEnabled: true,
      deliveryCharge: 40.00,
      freeDeliveryThreshold: 500.00,
      gstRate: 0.05 // 5%
    };
  }
}

export async function getRestaurantInfo() {
  const settings = await getRestaurantSettings();
  return {
    name: settings?.name || 'GenZ Cafe',
    phone: settings?.phone || '+91 9876543210',
    email: settings?.email || 'contact@genzcafe.com',
    address: settings?.address || '123 Tech Street',
    openingHours: settings?.business_hours || '11:00 AM - 10:00 PM',
    description: settings?.description || 'Modern cafe ordering platform for the new generation'
  };
}

/**
 * Get today's opening and closing time with day name
 */
export async function getTodaysHours(): Promise<string> {
  const settings = await getRestaurantSettings();
  if (!settings || !settings.business_hours) return 'Today: 11:00 AM - 10:00 PM';
  
  try {
    const hours = settings.business_hours;
    const currentDay = getCurrentDayName();
    const dayNames: { [key: string]: string } = {
      'sunday': 'Sunday',
      'monday': 'Monday',
      'tuesday': 'Tuesday',
      'wednesday': 'Wednesday',
      'thursday': 'Thursday',
      'friday': 'Friday',
      'saturday': 'Saturday'
    };
    
    // Handle complex format: "Mon, Tue, Wed: 9:00 AM - 5:00 PM; Thu, Fri: 10:00 AM - 6:00 PM"
    const scheduleSegments = hours.split(';').map(s => s.trim());
    
    for (const segment of scheduleSegments) {
      const colonIndex = segment.indexOf(':');
      if (colonIndex === -1) continue;
      
      const daysStr = segment.substring(0, colonIndex).trim();
      const timeStr = segment.substring(colonIndex + 1).trim();
      
      // Parse days (Mon, Tue, Wed, etc.)
      const dayAbbreviations = daysStr.split(',').map(d => d.trim().toLowerCase());
      const dayMap: { [key: string]: string } = {
        'mon': 'monday', 'tue': 'tuesday', 'wed': 'wednesday', 'thu': 'thursday',
        'fri': 'friday', 'sat': 'saturday', 'sun': 'sunday',
        'monday': 'monday', 'tuesday': 'tuesday', 'wednesday': 'wednesday', 
        'thursday': 'thursday', 'friday': 'friday', 'saturday': 'saturday', 'sunday': 'sunday'
      };
      
      const applicableDays = dayAbbreviations
        .map(abbr => dayMap[abbr])
        .filter(day => day);
      
      // Check if current day is in this segment
      if (!applicableDays.includes(currentDay)) continue;
      
      // Return with day name and time
      return `${dayNames[currentDay]}: ${timeStr}`;
    }
    
    // If no specific schedule found, return generic hours with day
    const simpleMatch = hours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (simpleMatch) {
      return `${dayNames[currentDay]}: ${simpleMatch[1]} - ${simpleMatch[2]}`;
    }
    
    return `${dayNames[currentDay]}: ${hours}`;
  } catch (error) {
    console.error('Error parsing business hours:', error);
    return settings?.business_hours || 'Today: 11:00 AM - 10:00 PM';
  }
}

/**
 * Get delivery points from restaurant settings
 */
export function getDeliveryPointsFromSettings(settings: RestaurantSettings | null): Array<{name: string; address: string; phone?: string}> {
  if (!settings?.delivery_points) return [];
  
  try {
    return JSON.parse(settings.delivery_points);
  } catch (error) {
    console.error('Error parsing delivery points:', error);
    return [];
  }
}
