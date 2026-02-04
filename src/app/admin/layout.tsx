'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Bars3Icon, 
  XMarkIcon, 
  HomeIcon, 
  ShoppingBagIcon, 
  SquaresPlusIcon, 
  TagIcon, 
  UsersIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

interface AdminLayoutProps {
  children: ReactNode;
}

interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

function AdminNavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);
  
  return (
    <Link
      href={href}
      className={`
        flex items-center px-4 py-3 text-sm font-medium rounded-md
        ${isActive 
          ? 'bg-gray-100 text-black'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon && <span className="mr-3">{icon}</span>}
      {children}
    </Link>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsLoading(false);
      return;
    }

    // Check if user is authenticated as admin
    const adminUserData = localStorage.getItem('adminUser');
    if (!adminUserData) {
      router.push('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(adminUserData) as AdminUser;
      if (!user.isAdmin) {
        router.push('/admin/login');
        return;
      }
      
      setAdminUser(user);
      setIsAuthenticated(true);
    } catch (err) {
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  // Show login page directly
  if (pathname === '/admin/login') {
    return children;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Router will redirect
  }

  // Admin dashboard layout
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="bg-gray-800 text-white w-64 flex-shrink-0">
        <div className="p-4">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-300 mt-1">Welcome, {adminUser?.username}</p>
        </div>
        <nav className="mt-6">
          <ul className="space-y-1">
            <li>
              <Link 
                href="/admin" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname === '/admin' ? 'bg-gray-700' : ''}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/orders" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname?.startsWith('/admin/orders') ? 'bg-gray-700' : ''}`}
              >
                Orders
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/counter" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname?.startsWith('/admin/counter') ? 'bg-gray-700' : ''}`}
              >
                Counter Booking (POS)
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/menu" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname?.startsWith('/admin/menu') ? 'bg-gray-700' : ''}`}
              >
                Menu
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/categories" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname?.startsWith('/admin/categories') ? 'bg-gray-700' : ''}`}
              >
                Categories
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/users" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname?.startsWith('/admin/users') ? 'bg-gray-700' : ''}`}
              >
                Users
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/coupons" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname?.startsWith('/admin/coupons') ? 'bg-gray-700' : ''}`}
              >
                Coupons
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/settings" 
                className={`block px-4 py-2 hover:bg-gray-700 ${pathname?.startsWith('/admin/settings') ? 'bg-gray-700' : ''}`}
              >
                Restaurant Settings
              </Link>
            </li>
            <li>
              <button 
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-300"
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm">
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              {pathname === '/admin' && 'Dashboard'}
              {pathname === '/admin/orders' && 'Orders'}
              {pathname === '/admin/counter' && 'Counter Booking (POS)'}
              {pathname === '/admin/menu' && 'Menu Management'}
              {pathname === '/admin/categories' && 'Categories Management'}
              {pathname === '/admin/users' && 'User Management'}
              {pathname?.startsWith('/admin/coupons') && 'Coupon Management'}
              {pathname?.startsWith('/admin/settings') && 'Restaurant Settings'}
            </h1>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 