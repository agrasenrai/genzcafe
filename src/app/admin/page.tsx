'use client';

import { useState, useEffect, useRef } from 'react';
import { playNotificationSound } from '@/lib/utils/notificationSound';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils/helpers';
import { getRestaurantSettings } from '@/lib/supabase/settings';
import { getTodaysOrders, transformOrdersToRows, calculateDailyStats, formatDateIST } from '@/lib/supabase/reports';
import { generateDailyReportPDF } from '@/lib/utils/pdfGenerator';

export default function AdminDashboard() {
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalMenuItems: 0,
    totalCategories: 0,
    revenueToday: 0,
    revenueWeek: 0,
    revenueMonth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'Loading...',
    business_hours: 'Loading...',
    phone: 'Loading...',
    email: 'Loading...'
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        // Get counts
        const { count: totalOrders, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        const { count: pendingOrders, error: pendingError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);
        const { count: totalMenuItems, error: menuError } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true });
        const { count: totalCategories, error: categoriesError } = await supabase
          .from('menu_categories')
          .select('*', { count: 'exact', head: true });

        // Get revenue stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - 1);
        monthStart.setHours(0, 0, 0, 0);

        const { data: todayOrders, error: todayError } = await supabase
          .from('orders')
          .select('final_total')
          .gte('created_at', today.toISOString())
          .not('status', 'eq', 'cancelled');
        const { data: weekOrders, error: weekError } = await supabase
          .from('orders')
          .select('final_total')
          .gte('created_at', weekStart.toISOString())
          .not('status', 'eq', 'cancelled');
        const { data: monthOrders, error: monthError } = await supabase
          .from('orders')
          .select('final_total')
          .gte('created_at', monthStart.toISOString())
          .not('status', 'eq', 'cancelled');

        // Get recent orders
        const { data: recent, error: recentError } = await supabase
          .from('orders')
          .select(`
            id, 
            created_at, 
            otp, 
            final_total, 
            status, 
            order_type
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        // Get restaurant settings
        const settings = await getRestaurantSettings();
        if (settings) {
          setRestaurantInfo({
            name: settings.name || 'GenZ Cafe',
            business_hours: settings.business_hours || '11:00 AM - 10:00 PM',
            phone: settings.phone || '+91 9876543210',
            email: settings.email || 'contact@genzcafe.com'
          });
        }

        // Get popular items (mock data for now)
        setPopularItems([
          { id: 1, name: 'Butter Chicken', orders: 42, revenue: 8400 },
          { id: 2, name: 'Paneer Tikka', orders: 38, revenue: 6840 },
          { id: 3, name: 'Veg Biryani', orders: 35, revenue: 5250 },
          { id: 4, name: 'Chicken Biryani', orders: 30, revenue: 4800 },
          { id: 5, name: 'Masala Dosa', orders: 25, revenue: 3000 },
        ]);

        // Check for errors
        if (ordersError || pendingError || menuError || categoriesError || 
            todayError || weekError || monthError || recentError) {
          throw new Error('Error fetching dashboard data');
        }

        // Calculate revenue
        const revenueToday = todayOrders?.reduce((sum, order) => sum + order.final_total, 0) || 0;
        const revenueWeek = weekOrders?.reduce((sum, order) => sum + order.final_total, 0) || 0;
        const revenueMonth = monthOrders?.reduce((sum, order) => sum + order.final_total, 0) || 0;

        setStats({
          totalOrders: totalOrders || 0,
          pendingOrders: pendingOrders || 0,
          totalMenuItems: totalMenuItems || 0,
          totalCategories: totalCategories || 0,
          revenueToday,
          revenueWeek,
          revenueMonth
        });

        setRecentOrders(recent || []);

        setError(null);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();

    // Real-time subscription for new orders
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
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  // Detect new pending orders and play sound
  useEffect(() => {
    if (isLoading) return;
    const currentPending = recentOrders.filter((o) => o.status === 'pending');
    const currentIds = new Set(currentPending.map((o) => o.id));
    const prevIds = prevOrderIdsRef.current;
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
  }, [recentOrders, isLoading]);

  // Handle download daily report
  const handleDownloadReport = async () => {
    try {
      setIsGeneratingReport(true);
      
      // Fetch today's orders
      const orders = await getTodaysOrders();
      
      if (orders.length === 0) {
        alert('No orders found for today');
        setIsGeneratingReport(false);
        return;
      }

      // Transform orders to rows
      const reportRows = transformOrdersToRows(orders);
      
      // Calculate stats
      const dailyStats = calculateDailyStats(orders);
      
      // Get today's date
      const today = new Date();
      const dateString = today.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Generate PDF
      await generateDailyReportPDF(
        reportRows,
        dailyStats,
        dateString,
        restaurantInfo.name
      );

      setIsGeneratingReport(false);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
      setIsGeneratingReport(false);
    }
  };
  
  return (
    <div className="relative">
      {/* Visual Alert for New Order */}
      {showNewOrderAlert && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-yellow-200 text-yellow-900 px-4 py-2 rounded shadow-lg animate-bounce">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
          <span className="font-semibold">New Order Received!</span>
        </div>
      )}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of your restaurant business</p>
        </div>
        <button
          onClick={handleDownloadReport}
          disabled={isGeneratingReport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isGeneratingReport ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
              </svg>
              Download Daily Report (PDF)
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Orders */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-500">Total Orders</h2>
                <span className="p-2 bg-blue-50 rounded-full">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold text-gray-800">{stats.totalOrders}</p>
              <Link href="/admin/orders" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800">
                View all orders →
              </Link>
            </div>
            
            {/* Pending Orders */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-500">Active Orders</h2>
                <span className="p-2 bg-yellow-50 rounded-full">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold text-gray-800">{stats.pendingOrders}</p>
              <Link href="/admin/orders" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800">
                Manage orders →
              </Link>
            </div>
            
            {/* Menu Items */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-500">Menu Items</h2>
                <span className="p-2 bg-green-50 rounded-full">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold text-gray-800">{stats.totalMenuItems}</p>
              <Link href="/admin/menu" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800">
                Manage menu →
              </Link>
            </div>
            
            {/* Categories */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-500">Categories</h2>
                <span className="p-2 bg-purple-50 rounded-full">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold text-gray-800">{stats.totalCategories}</p>
              <Link href="/admin/categories" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800">
                Manage categories →
              </Link>
            </div>
          </div>
          
          {/* Main Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue Overview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-800">Revenue Overview</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Today</h3>
                      <p className="mt-2 text-2xl font-semibold text-gray-800">{formatPrice(stats.revenueToday)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Last 7 Days</h3>
                      <p className="mt-2 text-2xl font-semibold text-gray-800">{formatPrice(stats.revenueWeek)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Last 30 Days</h3>
                      <p className="mt-2 text-2xl font-semibold text-gray-800">{formatPrice(stats.revenueMonth)}</p>
                    </div>
                  </div>
                  
                  {/* Revenue chart would go here in a real app */}
                  <div className="mt-6 h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Revenue Chart (placeholder)</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Store Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Store Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Restaurant Name</h3>
                  <p className="mt-1 text-gray-800">{restaurantInfo.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Business Hours</h3>
                  <p className="mt-1 text-gray-800">{restaurantInfo.business_hours}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contact Info</h3>
                  <p className="mt-1 text-gray-800">Phone: {restaurantInfo.phone}</p>
                  <p className="text-gray-800">Email: {restaurantInfo.email}</p>
                </div>
                <Link href="/admin/settings" className="inline-block text-sm text-blue-600 hover:text-blue-800">
                  Edit store information →
                </Link>
              </div>
            </div>
          </div>
          
          {/* Recent Orders & Popular Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
                <Link href="/admin/orders" className="text-sm text-blue-600 hover:text-blue-800">
                  View all
                </Link>
              </div>
              <div className="divide-y">
                {recentOrders.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No recent orders found
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Order #{order.otp}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatPrice(Math.round(order.final_total))}</span>
                          <p className="text-xs text-gray-500 mt-1">{order.order_type}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Popular Items */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Popular Items</h2>
              </div>
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {popularItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-gray-900">{item.orders}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-gray-900">{formatPrice(item.revenue)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                href="/admin/menu/new" 
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="p-2 mr-3 bg-green-100 rounded-full">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </span>
                <span className="text-gray-700">Add New Menu Item</span>
              </Link>
              
              <Link 
                href="/admin/orders" 
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="p-2 mr-3 bg-blue-100 rounded-full">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
                <span className="text-gray-700">Manage Orders</span>
              </Link>
              
              <Link 
                href="/admin/categories" 
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="p-2 mr-3 bg-purple-100 rounded-full">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </span>
                <span className="text-gray-700">Manage Categories</span>
              </Link>
              
              <Link 
                href="/admin/users" 
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="p-2 mr-3 bg-indigo-100 rounded-full">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </span>
                <span className="text-gray-700">Manage Users</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 