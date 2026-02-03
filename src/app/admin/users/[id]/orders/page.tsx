'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserProfile } from '@/lib/supabase/auth';
import { getUserOrders } from '@/lib/supabase/orders';
import { formatPrice, formatDate, formatTime, getOrderStatusInfo } from '@/lib/utils/helpers';

interface Order {
  id: string;
  created_at: string;
  order_type: 'pickup' | 'delivery';
  scheduled_time: string;
  payment_method: 'card' | 'cash';
  final_total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  otp: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function UserOrdersPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Fetch user profile and orders
        const [userProfile, userOrders] = await Promise.all([
          getUserProfile(id),
          getUserOrders(id)
        ]);
        
        setUser(userProfile as User);
        setOrders(userOrders as Order[]);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (id) {
      fetchData();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!user && !isLoading) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        User not found. Please check the ID and try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders for {user?.name}</h1>
          <p className="text-gray-600">Phone: {user?.phone}</p>
        </div>
        <button
          onClick={() => router.push('/admin/users')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to Users
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            This user hasn't placed any orders yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Order #{order.otp}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          getOrderStatusInfo(order.status).color
                        } bg-opacity-10`}
                      >
                        {getOrderStatusInfo(order.status).text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(order.created_at)} at {formatTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(Math.round(order.final_total))}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.order_type === 'pickup' ? 'Pickup' : 'Delivery'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm">
                    <span className="text-gray-600">Payment:</span>{' '}
                    <span className="font-medium">{order.payment_method === 'card' ? 'Card' : 'Cash'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">Scheduled:</span>{' '}
                    <span className="font-medium">{formatTime(order.scheduled_time)}</span>
                  </p>
                </div>
                
                <Link
                  href={`/admin/orders?id=${order.id}`}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 