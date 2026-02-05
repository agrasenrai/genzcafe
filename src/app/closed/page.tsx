'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getRestaurantSettings, getTodaysHours, isRestaurantOpen } from '@/lib/supabase/settings';
import { useRouter } from 'next/navigation';


export default function RestaurantClosedPage() {
  const router = useRouter();
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'GenZ Cafe',
    business_hours: null as string | null,
    phone: '+91 9369345467'
  });
  const [todaysHours, setTodaysHours] = useState<string>('Today: Closed');

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
        const [settings, hours] = await Promise.all([
          getRestaurantSettings(),
          getTodaysHours()
        ]);
        if (settings) {
          setRestaurantInfo({
            name: settings.name,
            business_hours: settings.business_hours,
            phone: settings.phone || '+91 9369345467'
          });
        }
        setTodaysHours(hours);
      } catch (error) {
        console.error('Error fetching restaurant info:', error);
      }
    }
    fetchInfo();
  }, []);

  const hoursText = restaurantInfo.business_hours?.trim();
  const hoursDisplay = hoursText && hoursText.toLowerCase() !== 'closed'
    ? hoursText
    : todaysHours;

  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-[#FFFDF7] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFDF7] via-white to-gray-50" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-black rounded-full"></div>
          <div className="absolute top-32 right-16 w-12 h-12 bg-gray-400 rounded-full"></div>
          <div className="absolute bottom-32 left-16 w-16 h-16 bg-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex flex-col justify-between overflow-y-auto overscroll-contain px-4 sm:px-8 md:px-12 py-safe text-center">
          {/* Header */}
          <div className="pt-8 sm:pt-12 md:pt-16">
            {/* Logo */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-6 opacity-70">
              <Image
                src="/assets/images/GENZ CAFE LOGO.png"
                alt={`${restaurantInfo.name} Logo`}
                fill
                className="object-contain grayscale"
                priority
                sizes="(max-width: 640px) 6rem, 8rem"
              />
            </div>

            {/* Closed Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Main Message */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">We're Closed</h1>
            <p className="text-base sm:text-lg text-gray-600">
              {restaurantInfo.name} is currently closed
            </p>
          </div>

          {/* Business Hours */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-sm w-full max-w-sm mx-auto my-6">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3 flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Opening Hours
            </h2>
            <p className="text-gray-700 font-medium">{hoursDisplay}</p>
            <p className="text-sm text-gray-500 mt-2">We'll be back soon!</p>
          </div>

          {/* Actions */}
          <div className="space-y-4 mb-6">
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
          <div className="text-center pb-6">
            <p className="text-sm text-gray-500 mb-3">Thank you for your patience</p>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}