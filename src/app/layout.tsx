import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from '@/lib/context/CartContext';
import { AuthProvider } from '@/lib/context/AuthContext';
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GenZ Cafe",
  description: "Modern cafe ordering platform for the new generation",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Better for notched devices
    title: "GenZ Cafe",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on mobile (better for fixed layouts)
  userScalable: false, // Disable pinch-to-zoom (cleaner mobile experience)
  themeColor: '#000000',
  viewportFit: 'cover', // Important: allows content to extend into safe areas
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Mobile-specific meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`}>
        <AuthProvider>
          <CartProvider>
            {children}
            <Analytics />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}