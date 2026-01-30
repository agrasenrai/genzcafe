// 'use client';

// import Link from 'next/link';
// import Image from 'next/image';
// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { isRestaurantOpen, getRestaurantInfo } from '@/lib/supabase/settings';

// export default function Home() {
//   const router = useRouter();
//   const [restaurantInfo, setRestaurantInfo] = useState({
//     openingHours: 'Opens: 11:00 AM - 10:00 PM'
//   });
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     async function checkStatus() {
//       try {
//         const [open, info] = await Promise.all([
//           isRestaurantOpen(),
//           getRestaurantInfo()
//         ]);
        
//         if (!open) {
//           router.push('/closed');
//           return;
//         }
        
//         setRestaurantInfo({
//           openingHours: `Opens: ${info.openingHours}`
//         });
//       } catch (error) {
//         console.error('Error checking restaurant status:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     }
    
//     checkStatus();
//   }, [router]);

//   if (isLoading) {
//     return (
//       <div className="fixed inset-0 w-full max-w-md mx-auto bg-white flex items-center justify-center">
//         <div className="flex flex-col items-center space-y-3">
//           <div className="relative">
//             <div className="w-12 h-12 border-3 border-gray-200 rounded-full animate-spin">
//               <div className="absolute top-0 left-0 w-12 h-12 border-3 border-transparent border-t-yellow-500 rounded-full animate-spin" />
//             </div>
//           </div>
//           <p className="text-yellow-600 text-sm font-medium">Loading...</p>
//         </div>
//       </div>
//     );
//   }
//   return (
//     <div className="fixed inset-0 w-full max-w-md mx-auto bg-white overflow-hidden">
//       {/* GenZ Background Image */}
//       <div className="absolute inset-0">
//         <Image
//           src="/assets/images/genZ background.png"
//           alt="GenZ Cafe Background"
//           fill
//           className="object-cover opacity-30"
//           priority
//           quality={100}
//         />
        
//         {/* Light overlay for brightness */}
//         <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20" />
        
//         {/* Subtle geometric accents over the background */}
//         <div className="absolute top-16 right-6 w-24 h-24 bg-yellow-500/20 rounded-full blur-2xl" />
//         <div className="absolute bottom-24 left-8 w-20 h-20 bg-yellow-400/15 rounded-full blur-xl" />
//         <div className="absolute top-1/3 left-4 w-16 h-16 bg-yellow-600/20 rounded-full blur-lg" />
//       </div>

//       {/* Main Content */}
//       <div className="relative z-10 flex flex-col justify-between h-full p-6">
//         {/* Header Section */}
//         <div className="pt-16">
//           {/* Status Badge */}
//           <div className="flex justify-center mb-12">
//             <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-yellow-200/50 shadow-sm">
//               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
//               <span className="text-xs font-semibold text-yellow-600 tracking-wide uppercase">Open Now</span>
//             </div>
//           </div>

//           {/* Logo Section - Dark Theme with Animation */}
//           <div className="text-center mb-12">
//             {/* Logo Container */}
//             <div className="relative w-56 h-56 mx-auto mb-8 group">
//               <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl border border-yellow-200/30 shadow-lg group-hover:bg-white/90 group-hover:border-yellow-400/40 transition-all duration-300" />
//               <div className="relative w-full h-full p-10">
//                 {/* Logo Shadow (positioned slightly offset) */}
//                 <div className="absolute inset-0 p-10 translate-x-px translate-y-px">
//                   <Image
//                     src="/assets/images/GENZ CAFE LOGO.png"
//                     alt="GenZ Cafe Logo Shadow"
//                     fill
//                     className="object-contain opacity-20 group-hover:scale-105 transition-all duration-300"
//                     priority
//                     sizes="14rem"
//                     quality={100}
//                   />
//                 </div>
                
//                 {/* Main Logo */}
//                 <div className="absolute inset-0 p-10">
//                   <Image
//                     src="/assets/images/GENZ CAFE LOGO.png"
//                     alt="GenZ Cafe Logo"
//                     fill
//                     className="object-contain group-hover:scale-105 transition-all duration-300 drop-shadow-lg"
//                     priority
//                     sizes="14rem"
//                     quality={100}
//                   />
//                 </div>
//               </div>
//             </div>
            
//             {/* Clean Typography */}
//             <div className="space-y-4">
//               <h1 className="text-3xl font-bold text-gray-800 leading-tight">
//                 Cafe for the
//                 <span className="block text-4xl bg-gradient-to-r from-yellow-500 to-yellow-700 bg-clip-text text-transparent">
//                   New Generation
//                 </span>
//               </h1>
//             </div>
//           </div>
//         </div>

//         {/* Bottom Section */}
//         <div className="space-y-8">
//           {/* Hours Display */}
//           <div className="text-center">
//             <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/70 backdrop-blur-sm rounded-full border border-yellow-200/50 shadow-sm">
//               <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               <span className="text-sm font-medium text-gray-700">{restaurantInfo.openingHours}</span>
//             </div>
//           </div>
          
//           {/* Quick Actions */}
//           <div className="flex justify-center">
//             <Link 
//               href="/track" 
//               className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/60 backdrop-blur-sm rounded-full border border-yellow-200/50 shadow-sm text-sm text-gray-600 hover:text-yellow-600 hover:border-yellow-400/50 hover:bg-white/80 transition-all duration-300 group"
//             >
//               <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//               </svg>
//               Track Your Order
//             </Link>
//           </div>
          
//           {/* Main CTA - Orange accent */}
//           <div className="w-full">
//             <Link
//               href="/menu"
//               className="group block w-full py-4 px-6 text-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 transition-all duration-300 hover:scale-[1.02]"
//             >
//               <span className="flex items-center justify-center gap-2">
//                 Order Now
//                 <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
//                 </svg>
//               </span>
//             </Link>
//           </div>
          
//           {/* Bottom branding - Light theme */}
//           <div className="text-center space-y-3 pb-2">
//             <div className="flex items-center justify-center opacity-60">
//               <span className="text-xs text-gray-500 mr-2 font-light">powered by</span>
//               <Image
//                 src="/assets/images/srmhotel.png"
//                 alt="SRM Hotel Logo"
//                 width={60}
//                 height={18}
//                 className="object-contain opacity-80"
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isRestaurantOpen, getRestaurantInfo } from '@/lib/supabase/settings';

export default function Home() {
  const router = useRouter();
  const [restaurantInfo, setRestaurantInfo] = useState({
    openingHours: 'Opens: 11:00 AM - 10:00 PM'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const [open, info] = await Promise.all([
          isRestaurantOpen(),
          getRestaurantInfo()
        ]);
        
        if (!open) {
          router.push('/closed');
          return;
        }
        
        setRestaurantInfo({
          openingHours: `Opens: ${info.openingHours}`
        });
      } catch (error) {
        console.error('Error checking restaurant status:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkStatus();
  }, [router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full max-w-md mx-auto bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-12 h-12 border-3 border-transparent border-t-yellow-500 rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-yellow-600 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white overflow-hidden">
      {/* GenZ Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/assets/images/genZ background.png"
          alt="GenZ Cafe Background"
          fill
          className="object-cover opacity-30"
          priority
          quality={100}
        />
        
        {/* Light overlay for brightness */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20" />
        
        {/* Subtle geometric accents over the background */}
        <div className="absolute top-16 right-6 w-24 h-24 bg-yellow-500/20 rounded-full blur-2xl" />
        <div className="absolute bottom-24 left-8 w-20 h-20 bg-yellow-400/15 rounded-full blur-xl" />
        <div className="absolute top-1/3 left-4 w-16 h-16 bg-yellow-600/20 rounded-full blur-lg" />
      </div>

      {/* Main Content - Updated with proper spacing */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Scrollable container with safe area padding */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto overscroll-contain px-4 sm:px-8 md:px-12 py-safe">
          {/* Header Section */}
          <div className="flex-shrink-0 pt-8 sm:pt-12 md:pt-16">
            {/* Status Badge */}
            <div className="flex justify-center mb-6 sm:mb-8 md:mb-12">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-yellow-200/50 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-yellow-600 tracking-wide uppercase">Open Now</span>
              </div>
            </div>

            {/* Logo Section - Responsive sizes */}
            <div className="text-center mb-6 sm:mb-8 md:mb-12">
              {/* Logo Container - Smaller on mobile */}
              <div className="relative w-32 h-32 xs:w-36 xs:h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 mx-auto mb-4 sm:mb-6 md:mb-8 group">
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl border border-yellow-200/30 shadow-lg group-hover:bg-white/90 group-hover:border-yellow-400/40 transition-all duration-300" />
                <div className="relative w-full h-full p-8 sm:p-10">
                  {/* Logo Shadow */}
                  <div className="absolute inset-0 p-8 sm:p-10 translate-x-px translate-y-px">
                    <Image
                      src="/assets/images/GENZ CAFE LOGO.png"
                      alt="GenZ Cafe Logo Shadow"
                      fill
                      className="object-contain opacity-20 group-hover:scale-105 transition-all duration-300"
                      priority
                      sizes="(max-width: 640px) 8rem, 14rem"
                      quality={100}
                    />
                  </div>
                  
                  {/* Main Logo */}
                  <div className="absolute inset-0 p-8 sm:p-10">
                    <Image
                      src="/assets/images/GENZ CAFE LOGO.png"
                      alt="GenZ Cafe Logo"
                      fill
                      className="object-contain group-hover:scale-105 transition-all duration-300 drop-shadow-lg"
                      priority
                      sizes="(max-width: 640px) 8rem, 14rem"
                      quality={100}
                    />
                  </div>
                </div>
              </div>
              
              {/* Clean Typography - Responsive text */}
              <div className="space-y-2 sm:space-y-3 md:space-y-4 px-4">
                <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
                  Cafe for the
                  <span className="block text-2xl xs:text-3xl sm:text-4xl md:text-5xl bg-gradient-to-r from-yellow-500 to-yellow-700 bg-clip-text text-transparent">
                    New Generation
                  </span>
                </h1>
              </div>
            </div>
          </div>

          {/* Bottom Section - Compact spacing */}
          <div className="flex-shrink-0 space-y-4 sm:space-y-6 md:space-y-8 pb-6 sm:pb-8">
            {/* Hours Display */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 sm:py-3 bg-white/70 backdrop-blur-sm rounded-full border border-yellow-200/50 shadow-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium text-gray-700">{restaurantInfo.openingHours}</span>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex justify-center">
              <Link 
                href="/track" 
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/60 backdrop-blur-sm rounded-full border border-yellow-200/50 shadow-sm text-xs sm:text-sm text-gray-600 hover:text-yellow-600 hover:border-yellow-400/50 hover:bg-white/80 transition-all duration-300 group"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Track Your Order
              </Link>
            </div>
            
            {/* Main CTA - Compact on mobile */}
            <div className="w-full px-2 sm:px-0">
              <Link
                href="/menu"
                className="group block w-full py-3 sm:py-4 px-6 text-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center justify-center gap-2">
                  Order Now
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
            </div>
            
            {/* Bottom branding - Compact */}
            <div className="text-center space-y-2 pb-2">
              <div className="flex items-center justify-center opacity-60">
                <span className="text-xs text-gray-500 mr-2 font-light">powered by</span>
                <Image
                  src="/assets/images/srmhotel.png"
                  alt="SRM Hotel Logo"
                  width={60}
                  height={18}
                  className="object-contain opacity-80"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
