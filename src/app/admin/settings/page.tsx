'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface RestaurantSettings {
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
  packaging_fee: number | null;
  packaging_fee_enabled: boolean;
  is_open: boolean;
  accept_credit_cards: boolean;
  accept_cash: boolean;
  offer_takeout: boolean;
  offer_delivery: boolean;
  delivery_radius_km: number | null;
  currency: string;
  instagram_handle: string | null;
  facebook_handle: string | null;
  twitter_handle: string | null;
  website_url: string | null;
}

interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'delivery' | 'appearance' | 'social'>('general');
  const [deliveryPoints, setDeliveryPoints] = useState<Array<{name: string; address: string; phone?: string}>>([]);
  const [newPoint, setNewPoint] = useState({ name: '', address: '', phone: '' });
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    monday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    sunday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
  });

  // Helper function to convert 24h time to 12h format
  const formatTime12h = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  // Helper function to parse business hours string into weekly schedule
  const parseBusinessHours = (hoursString: string | null): WeeklySchedule => {
    if (!hoursString) {
      return weeklySchedule; // Return default schedule
    }
    
    // Simple format: "9:00 AM - 10:00 PM" (same for all days)
    const simpleMatch = hoursString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (simpleMatch) {
      let openHour = parseInt(simpleMatch[1]);
      const openMinute = simpleMatch[2];
      const openPeriod = simpleMatch[3].toUpperCase();
      
      let closeHour = parseInt(simpleMatch[4]);
      const closeMinute = simpleMatch[5];
      const closePeriod = simpleMatch[6].toUpperCase();
      
      // Convert to 24h format
      if (openPeriod === 'PM' && openHour !== 12) openHour += 12;
      if (openPeriod === 'AM' && openHour === 12) openHour = 0;
      if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12;
      if (closePeriod === 'AM' && closeHour === 12) closeHour = 0;
      
      const openTime = `${openHour.toString().padStart(2, '0')}:${openMinute}`;
      const closeTime = `${closeHour.toString().padStart(2, '0')}:${closeMinute}`;
      
      const daySchedule: DaySchedule = { isOpen: true, openTime, closeTime };
      
      return {
        monday: daySchedule,
        tuesday: daySchedule,
        wednesday: daySchedule,
        thursday: daySchedule,
        friday: daySchedule,
        saturday: daySchedule,
        sunday: daySchedule,
      };
    }
    
    // Return default if can't parse
    return weeklySchedule;
  };

  // Helper function to convert weekly schedule to business hours string
  const formatBusinessHours = (schedule: WeeklySchedule): string => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    const openDays = days.filter(day => schedule[day].isOpen);
    
    if (openDays.length === 0) return 'Closed';
    
    // Check if all open days have the same hours
    const firstOpenDay = schedule[openDays[0]];
    const sameHours = openDays.every(day => 
      schedule[day].openTime === firstOpenDay.openTime && 
      schedule[day].closeTime === firstOpenDay.closeTime
    );
    
    if (sameHours && openDays.length === 7) {
      // All days same hours
      return `${formatTime12h(firstOpenDay.openTime)} - ${formatTime12h(firstOpenDay.closeTime)}`;
    } else if (sameHours) {
      // Some days same hours
      const dayNames = openDays.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3));
      return `${dayNames.join(', ')}: ${formatTime12h(firstOpenDay.openTime)} - ${formatTime12h(firstOpenDay.closeTime)}`;
    } else {
      // Different hours for different days - create a more detailed format
      const groupedHours = new Map<string, string[]>();
      
      openDays.forEach(day => {
        const timeString = `${formatTime12h(schedule[day].openTime)} - ${formatTime12h(schedule[day].closeTime)}`;
        const dayName = day.charAt(0).toUpperCase() + day.slice(1, 3);
        
        if (groupedHours.has(timeString)) {
          groupedHours.get(timeString)!.push(dayName);
        } else {
          groupedHours.set(timeString, [dayName]);
        }
      });
      
      // If we can group some days with same hours, show grouped format
      if (groupedHours.size <= 2) {
        const groups = Array.from(groupedHours.entries()).map(([hours, days]) => 
          `${days.join(', ')}: ${hours}`
        );
        return groups.join('; ');
      } else {
        // Too many different hour combinations, show simplified format
        return `${formatTime12h(firstOpenDay.openTime)} - ${formatTime12h(firstOpenDay.closeTime)} (varies by day)`;
      }
    }
  };

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);
        const { data, error: fetchError } = await supabase
          .from('restaurant_settings')
          .select('*')
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        
        if (data) {
          const restaurantSettings = data as RestaurantSettings;
          setSettings(restaurantSettings);
          // Parse business hours into weekly schedule
          const parsedSchedule = parseBusinessHours(restaurantSettings.business_hours);
          setWeeklySchedule(parsedSchedule);
        } else {
          // Create default settings if none exist
          const defaultSettings: Omit<RestaurantSettings, 'id'> = {
            name: 'GenZ Cafe',
            description: 'Modern cafe ordering platform for the new generation',
            logo_url: null,
            phone: '+91 9876543210',
            email: 'contact@genzcafe.com',
            address: '123 Tech Street',
            city: 'Bangalore',
            state: 'Karnataka',
            zip_code: '560001',
            country: 'India',
            business_hours: '11:00 AM - 10:00 PM',
            delivery_fee: 40,
            minimum_order_amount: 100,
            tax_rate: 5,
            platform_fee: 15,
            platform_fee_enabled: true,
            packaging_fee: 0,
            packaging_fee_enabled: false,
            is_open: true,
            accept_credit_cards: true,
            accept_cash: true,
            offer_takeout: true,
            offer_delivery: false,
            delivery_radius_km: 10,
            currency: 'INR',
            instagram_handle: '',
            facebook_handle: '',
            twitter_handle: '',
            website_url: '',
          };
          
          const { data: newSettings, error: insertError } = await supabase
            .from('restaurant_settings')
            .insert(defaultSettings)
            .select()
            .single();
            
          if (insertError) throw insertError;
          
          setSettings(newSettings as RestaurantSettings);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSettings();
  }, []);

  // Parse and load delivery points when settings change
  useEffect(() => {
    if (settings?.delivery_points) {
      try {
        setDeliveryPoints(JSON.parse(settings.delivery_points));
      } catch (err) {
        console.error('Error parsing delivery points:', err);
        setDeliveryPoints([]);
      }
    } else {
      setDeliveryPoints([]);
    }
  }, [settings?.delivery_points]);
  
  // Handle weekly schedule changes
  const handleDayToggle = (day: keyof WeeklySchedule) => {
    const newSchedule = {
      ...weeklySchedule,
      [day]: {
        ...weeklySchedule[day],
        isOpen: !weeklySchedule[day].isOpen
      }
    };
    setWeeklySchedule(newSchedule);
    updateBusinessHoursString(newSchedule);
  };

  const handleTimeChange = (day: keyof WeeklySchedule, timeType: 'openTime' | 'closeTime', value: string) => {
    const newSchedule = {
      ...weeklySchedule,
      [day]: {
        ...weeklySchedule[day],
        [timeType]: value
      }
    };
    setWeeklySchedule(newSchedule);
    updateBusinessHoursString(newSchedule);
  };

  const updateBusinessHoursString = (newSchedule?: WeeklySchedule) => {
    if (!settings) return;
    const scheduleToUse = newSchedule || weeklySchedule;
    const businessHoursString = formatBusinessHours(scheduleToUse);
    setSettings({
      ...settings,
      business_hours: businessHoursString
    });
    
    // Auto-save the updated hours to database
    saveBusinessHours(businessHoursString);
  };

  const saveBusinessHours = async (businessHours: string) => {
    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ business_hours: businessHours })
        .eq('id', settings?.id);
        
      if (error) {
        console.error('Error saving business hours:', error);
      }
    } catch (err) {
      console.error('Error auto-saving business hours:', err);
    }
  };

  const applyToAllDays = (sourceDay: keyof WeeklySchedule) => {
    const sourceSchedule = weeklySchedule[sourceDay];
    const newSchedule = Object.keys(weeklySchedule).reduce((acc, day) => {
      acc[day as keyof WeeklySchedule] = { ...sourceSchedule };
      return acc;
    }, {} as WeeklySchedule);
    
    setWeeklySchedule(newSchedule);
    updateBusinessHoursString(newSchedule);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (!settings) return;
    
    let updatedValue: any = value;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      updatedValue = (e.target as HTMLInputElement).checked;
    }
    
    // Handle number inputs
    if (type === 'number') {
      updatedValue = value === '' ? null : parseFloat(value);
    }
    
    setSettings({
      ...settings,
      [name]: updatedValue
    });
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      setIsSaving(true);
      setSuccess(null);
      setError(null);
      
      const { error: updateError } = await supabase
        .from('restaurant_settings')
        .update(settings)
        .eq('id', settings.id);
        
      if (updateError) throw updateError;
      
      setSuccess('Settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error saving settings:', err);
      const message = err?.message || 'Failed to save settings';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
      </div>
    );
  }
  
  // If no settings exist, show error
  if (!settings) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Failed to load restaurant settings
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Restaurant Settings</h1>
        <p className="text-gray-600">Configure your restaurant details and preferences</p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        {/* Settings Tabs */}
        <div className="flex border-b overflow-x-auto">
          <button
            className={`px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap ${
              activeTab === 'general' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('general')}
          >
            General Information
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap ${
              activeTab === 'payment' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('payment')}
          >
            Payment Options
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap ${
              activeTab === 'delivery' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('delivery')}
          >
            Delivery & Pickup
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap ${
              activeTab === 'appearance' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap ${
              activeTab === 'social' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('social')}
          >
            Social Media
          </button>
        </div>
        
        <div className="p-6">
          {/* General Information Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Restaurant Status</h3>
                    <p className="text-sm text-gray-600">Manually open or close your restaurant</p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_open"
                      name="is_open"
                      checked={settings.is_open || false}
                      onChange={handleChange}
                      className="h-6 w-6 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_open" className="ml-3 text-sm font-medium text-gray-700">
                      {settings.is_open ? 'Restaurant is Open' : 'Restaurant is Closed'}
                    </label>
                  </div>
                </div>
                {!settings.is_open && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      ⚠️ Restaurant is manually closed. Customers will see a "closed" message and cannot place orders.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={settings.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={settings.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={settings.description || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={settings.phone || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={settings.email || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Business Hours
                </label>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-800">Weekly Schedule</h4>
                    <p className="text-xs text-gray-600">
                      Current: {settings.business_hours || 'Not set'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(weeklySchedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center space-x-4 py-2">
                        <div className="w-20">
                          <span className="text-sm font-medium capitalize text-gray-700">
                            {day.slice(0, 3)}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={schedule.isOpen}
                            onChange={() => handleDayToggle(day as keyof WeeklySchedule)}
                            className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            {schedule.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        
                        {schedule.isOpen && (
                          <>
                            <div className="flex items-center space-x-2">
                              <input
                                type="time"
                                value={schedule.openTime}
                                onChange={(e) => handleTimeChange(day as keyof WeeklySchedule, 'openTime', e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-black focus:border-black"
                              />
                              <span className="text-sm text-gray-500">to</span>
                              <input
                                type="time"
                                value={schedule.closeTime}
                                onChange={(e) => handleTimeChange(day as keyof WeeklySchedule, 'closeTime', e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-black focus:border-black"
                              />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => applyToAllDays(day as keyof WeeklySchedule)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              Copy to all
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      💡 Tip: Set hours for one day and click "Copy to all" to apply the same hours to all days.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={settings.address || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={settings.city || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={settings.state || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    name="zip_code"
                    value={settings.zip_code || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={settings.country || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Payment Options Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    id="tax_rate"
                    name="tax_rate"
                    value={settings.tax_rate === null ? '' : settings.tax_rate}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">GST/Tax percentage applied to orders</p>
                </div>
                
                <div>
                  <label htmlFor="platform_fee" className="block text-sm font-medium text-gray-700 mb-1">
                    Platform Fee ({settings.currency})
                  </label>
                  <input
                    type="number"
                    id="platform_fee"
                    name="platform_fee"
                    value={settings.platform_fee === null ? '' : settings.platform_fee}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      id="platform_fee_enabled"
                      name="platform_fee_enabled"
                      checked={settings.platform_fee_enabled || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                    <label htmlFor="platform_fee_enabled" className="ml-2 text-sm text-gray-700">
                      Enable Platform Fee
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Methods
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="accept_credit_cards"
                      name="accept_credit_cards"
                      checked={settings.accept_credit_cards || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                    <label htmlFor="accept_credit_cards" className="ml-2 text-sm text-gray-700">
                      Accept Credit/Debit Cards
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="accept_cash"
                      name="accept_cash"
                      checked={settings.accept_cash || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                    <label htmlFor="accept_cash" className="ml-2 text-sm text-gray-700">
                      Accept Cash on Pickup/Delivery
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="packaging_fee" className="block text-sm font-medium text-gray-700 mb-1">
                    Packaging Fee ({settings.currency})
                  </label>
                  <input
                    type="number"
                    id="packaging_fee"
                    name="packaging_fee"
                    value={settings.packaging_fee === null ? '' : settings.packaging_fee}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      id="packaging_fee_enabled"
                      name="packaging_fee_enabled"
                      checked={settings.packaging_fee_enabled || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                    <label htmlFor="packaging_fee_enabled" className="ml-2 text-sm text-gray-700">
                      Enable Packaging Fee (Per Item)
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Charge per item when customer selects packaging</p>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">Additional Payment Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  To configure payment gateways like Stripe, PayPal, or other providers, contact your platform administrator to set up the necessary API keys and configurations.
                </p>
              </div>
            </div>
          )}
          
          {/* Delivery & Pickup Tab */}
          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Options
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="offer_delivery"
                        name="offer_delivery"
                        checked={settings.offer_delivery || false}
                        onChange={handleChange}
                        className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                      />
                      <label htmlFor="offer_delivery" className="ml-2 text-sm text-gray-700">
                        Offer Delivery
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="offer_takeout"
                        name="offer_takeout"
                        checked={settings.offer_takeout || false}
                        onChange={handleChange}
                        className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                      />
                      <label htmlFor="offer_takeout" className="ml-2 text-sm text-gray-700">
                        Offer Takeout/Pickup
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="delivery_radius_km" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Radius (km)
                  </label>
                  <input
                    type="number"
                    id="delivery_radius_km"
                    name="delivery_radius_km"
                    value={settings.delivery_radius_km === null ? '' : settings.delivery_radius_km}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="delivery_fee" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Fee ({settings.currency})
                  </label>
                  <input
                    type="number"
                    id="delivery_fee"
                    name="delivery_fee"
                    value={settings.delivery_fee === null ? '' : settings.delivery_fee}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="minimum_order_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Order Amount ({settings.currency})
                  </label>
                  <input
                    type="number"
                    id="minimum_order_amount"
                    name="minimum_order_amount"
                    value={settings.minimum_order_amount === null ? '' : settings.minimum_order_amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>

              {/* Delivery Points Management */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Pickup Locations</h3>
                <div className="space-y-3 mb-4">
                  {deliveryPoints.map((point, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{point.name}</p>
                        <p className="text-sm text-gray-600">{point.address}</p>
                        {point.phone && <p className="text-sm text-gray-600">{point.phone}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = deliveryPoints.filter((_, i) => i !== idx);
                          setDeliveryPoints(updated);
                          if (settings) {
                            setSettings({
                              ...settings,
                              delivery_points: JSON.stringify(updated)
                            });
                          }
                        }}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Add New Pickup Location</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Location name (e.g., Main Store, Downtown)"
                      value={newPoint.name}
                      onChange={(e) => setNewPoint({...newPoint, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={newPoint.address}
                      onChange={(e) => setNewPoint({...newPoint, address: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={newPoint.phone}
                      onChange={(e) => setNewPoint({...newPoint, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newPoint.name && newPoint.address) {
                          const updated = [...deliveryPoints, newPoint];
                          setDeliveryPoints(updated);
                          if (settings) {
                            setSettings({
                              ...settings,
                              delivery_points: JSON.stringify(updated)
                            });
                          }
                          setNewPoint({ name: '', address: '', phone: '' });
                        }
                      }}
                      className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
                    >
                      Add Location
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  id="logo_url"
                  name="logo_url"
                  value={settings.logo_url || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the direct URL to your logo image. For best results, use a square image (1:1 ratio).
                </p>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">Logo Preview</h3>
                <div className="h-32 w-32 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                  {settings.logo_url ? (
                    <img 
                      src={settings.logo_url} 
                      alt="Restaurant Logo" 
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-logo.png';
                      }}
                    />
                  ) : (
                    <div className="text-gray-400 text-sm text-center p-2">
                      No logo uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Social Media Tab */}
          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                    Website URL
                  </label>
                  <div className="mt-1 flex rounded-lg shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      https://
                    </span>
                    <input
                      type="text"
                      id="website_url"
                      name="website_url"
                      value={(settings.website_url || '').replace(/^https?:\/\//, '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: 'website_url',
                            value: value ? `https://${value}` : ''
                          }
                        } as React.ChangeEvent<HTMLInputElement>);
                      }}
                      placeholder="example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="instagram_handle" className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Handle
                  </label>
                  <div className="mt-1 flex rounded-lg shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      id="instagram_handle"
                      name="instagram_handle"
                      value={settings.instagram_handle || ''}
                      onChange={handleChange}
                      placeholder="username"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="facebook_handle" className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook Page Name
                  </label>
                  <div className="mt-1 flex rounded-lg shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      facebook.com/
                    </span>
                    <input
                      type="text"
                      id="facebook_handle"
                      name="facebook_handle"
                      value={settings.facebook_handle || ''}
                      onChange={handleChange}
                      placeholder="pagename"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="twitter_handle" className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter/X Handle
                  </label>
                  <div className="mt-1 flex rounded-lg shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      id="twitter_handle"
                      name="twitter_handle"
                      value={settings.twitter_handle || ''}
                      onChange={handleChange}
                      placeholder="username"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : 'Save Settings'}
        </button>
      </div>
    </div>
  );
} 