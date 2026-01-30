'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getRestaurantSettings, isRestaurantOpen } from '@/lib/supabase/settings';
import { useRouter } from 'next/navigation';


export default function RestaurantClosedPage() {
  const router = useRouter();
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'GenZ Cafe',
    business_hours: '11:00 AM - 10:00 PM',
    phone: '+91 9876543210'
  });

  // Poll for open status every 5 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function checkOpen() {
      try {
        const open = await isRestaurantOpen();
        if (open) {
          router.replace('/');
        }
      } catch (e) {}
    }
    checkOpen();
    interval = setInterval(checkOpen, 5000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const settings = await getRestaurantSettings();
        if (settings) {
          setRestaurantInfo({
            name: settings.name,
            business_hours: settings.business_hours || '11:00 AM - 10:00 PM',
            phone: settings.phone || '+91 9876543210'
          });
        }
      } catch (error) {
        console.error('Error fetching restaurant info:', error);
      }
    }
    fetchInfo();
  }, []);

  return (
    <div className="fixed inset-0 w-full max-w-md mx-auto bg-white shadow-sm overflow-hidden">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 bg-black rounded-full"></div>
          <div className="absolute top-32 right-16 w-12 h-12 bg-gray-400 rounded-full"></div>
          <div className="absolute bottom-32 left-16 w-16 h-16 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center min-h-screen p-8 text-center">
        {/* Logo */}
        <div className="w-32 h-32 mx-auto relative mb-8 opacity-60">
          <Image
            src="/assets/images/GENZ CAFE LOGO.png"
            alt={`${restaurantInfo.name} Logo`}
            fill
            className="object-contain grayscale"
            priority
            sizes="8rem"
          />
        </div>

        {/* Closed Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Main Message */}
        <h1 className="text-3xl font-bold text-gray-800 mb-3">We're Closed</h1>
        <p className="text-lg text-gray-600 mb-6">
          {restaurantInfo.name} is currently closed
        </p>

        {/* Business Hours */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8 w-full max-w-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Opening Hours
          </h2>
          <p className="text-gray-600 font-medium">{restaurantInfo.business_hours}</p>
          <p className="text-sm text-gray-500 mt-2">We'll be back soon!</p>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 mb-8">
          <a
            href={`tel:${restaurantInfo.phone}`}
            className="flex items-center justify-center bg-black text-white py-3 px-6 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Us
          </a>

          <Link
            href="/track"
            className="block bg-white border-2 border-black text-black py-3 px-6 rounded-full font-medium hover:bg-gray-50 transition-colors"
          >
            Track Existing Order
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            Thank you for your patience
          </p>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}