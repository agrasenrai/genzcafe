'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/helpers';
import { printMultipleKOTs } from '@/lib/utils/kotGenerator';
import { printBillAutomatically } from '@/lib/utils/billGenerator';
import { formatOrderForKOT, formatOrderForBill } from '@/lib/supabase/kotService';
import { getPlatformFees } from '@/lib/supabase/settings';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  available: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
  packaging: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function CounterBookingPage() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Counter');
  const [loading, setLoading] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [feeSettings, setFeeSettings] = useState({
    gstRate: 0.05,
    packagingFee: 0,
    packagingFeeEnabled: false
  });

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    getPlatformFees().then(fees => {
      setFeeSettings({
        gstRate: fees.gstRate ?? 0.05,
        packagingFee: fees.packagingFee ?? 0,
        packagingFeeEnabled: fees.packagingFeeEnabled ?? false
      });
    });
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .order('display_order');
      
      if (error) {
        console.error('Error fetching categories:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Continue without categories - user can still use "All" view
        return;
      }
      
      if (data) {
        console.log('Fetched categories:', data);
        setCategories(data);
      }
    } catch (err) {
      console.error('Exception fetching categories:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('name');
      
      if (error) {
        console.error('Error fetching menu items:', error);
        return;
      }
      
      if (data) {
        console.log('Fetched menu items:', data);
        setMenuItems(data);
      }
    } catch (err) {
      console.error('Exception fetching menu items:', err);
    }
  };

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategory);

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(i => i.id === item.id);
    if (existingItem) {
      setCart(cart.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1, packaging: false }]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(i => i.id !== itemId));
    } else {
      setCart(cart.map(i => 
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      ));
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  const togglePackaging = (itemId: string) => {
    setCart(cart.map(i =>
      i.id === itemId ? { ...i, packaging: !i.packaging } : i
    ));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('Counter');
    setLastOrder(null);
  };

  const calculateTotal = () => {
    // Prices are GST-inclusive. Compute item total excluding GST, GST amount, and final (gross) total.
    const gross = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstRate = feeSettings.gstRate || 0.05;
    const itemTotal = Number((gross / (1 + gstRate)).toFixed(2)); // excluding GST
    const gst = Number((gross - itemTotal).toFixed(2)); // total GST amount
    const packagingCount = cart.reduce((count, item) => count + (item.packaging ? item.quantity : 0), 0);
    const packagingFee = feeSettings.packagingFeeEnabled
      ? Number((feeSettings.packagingFee * packagingCount).toFixed(2))
      : 0;
    const finalTotal = Number((gross + packagingFee).toFixed(2)); // gross + packaging
    return { itemTotal, gst, packagingFee, finalTotal };
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setPrintMessage('Please add items to cart');
      setTimeout(() => setPrintMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const { itemTotal, gst, packagingFee, finalTotal } = calculateTotal();
      
      // Create order with counter defaults
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName || 'Counter',
          customer_phone: 'counter',
          customer_email: 'counter@counter.com',
          order_type: 'pickup',
          delivery_address: 'Counter',
          scheduled_time: new Date().toISOString(),
          payment_method: 'cash',
          payment_status: 'completed',
          item_total: itemTotal,
          gst: gst,
          platform_fee: 0,
          packaging_fee: packagingFee,
          delivery_charge: 0,
          final_total: finalTotal,
          status: 'ready'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items with name field
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        packaging: item.packaging ?? false
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Fetch complete order for printing
      const { data: completeOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            name,
            quantity,
            price,
            menu_item_id,
            packaging
          )
        `)
        .eq('id', order.id)
        .single();

      if (fetchError) throw fetchError;

      // Format for printing
      const kotData = formatOrderForKOT(completeOrder);
      const billData = formatOrderForBill(completeOrder);

      // Store last order for reprinting
      setLastOrder({ kotData, billData });

      // Print KOTs
      printMultipleKOTs(kotData, 2);
      setPrintMessage('Printing 2 KOTs...');

      // Print Bill after KOTs
      setTimeout(() => {
        printBillAutomatically(billData);
        setPrintMessage('Order placed & printing completed!');
        setTimeout(() => setPrintMessage(null), 3000);
      }, 1100);

      // Do not clear cart here — keep it until user explicitly reprints the bill
      
      // Show success message without alert dialog
      console.log(`Order placed successfully! Order #${order.otp}`);
    } catch (error: any) {
      console.error('Error placing order:', error);
      setPrintMessage(`Failed to place order: ${error.message || 'Unknown error'}`);
      setTimeout(() => setPrintMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const { itemTotal, gst, packagingFee, finalTotal } = calculateTotal();

  useEffect(() => {
    if (searchParams?.get('fullscreen') === '1') {
      setIsFullscreen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('pos-hide-sidebar');
    } else {
      document.body.classList.remove('pos-hide-sidebar');
    }

    return () => {
      document.body.classList.remove('pos-hide-sidebar');
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-3 relative">
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-50 p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 shadow-lg transition-all"
        title={isFullscreen ? "Show Sidebar" : "Hide Sidebar"}
      >
        {isFullscreen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 20v-4m0 4h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        )}
      </button>
      {isFullscreen && (
        <Link
          href="/admin/orders?fullscreen=1"
          className="fixed top-16 right-4 z-50 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-md transition-all"
          title="Go to Orders"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </Link>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-3">
          <h1 className="text-3xl font-bold text-orange-600 flex items-center gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Counter POS
          </h1>
          <p className="text-gray-700 mt-1 text-base">Fast & Easy Order Management</p>
        </div>

        {printMessage && (
          <div className={`mb-4 p-4 rounded-lg font-semibold text-center ${
            (printMessage?.includes('Failed') || printMessage?.includes('error'))
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {printMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Menu Section */}
          <div className="lg:col-span-3">
            {/* Categories */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-3 border border-orange-200">
              <h2 className="text-lg font-bold mb-3 text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categories
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-6 py-2 rounded-full font-bold transition-all text-sm shadow ${
                    selectedCategory === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-6 py-2 rounded-full font-bold transition-all text-sm shadow ${
                      selectedCategory === category.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-orange-200">
              <h2 className="text-lg font-bold mb-3 text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Menu Items
              </h2>
              {filteredItems.length === 0 ? (
                <p className="text-gray-500 text-center py-12 text-lg">No items available in this category</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredItems.map(item => {
                    const cartItem = cart.find(i => i.id === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className={`bg-white border rounded-lg p-3 hover:shadow-lg transition-all text-left relative ${
                          cartItem ? 'border-green-500 ring-1 ring-green-300' : 'border-gray-300 hover:border-orange-400'
                        }`}
                      >
                        {cartItem && (
                          <span className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            {cartItem.quantity}
                          </span>
                        )}
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-20 object-cover rounded-md mb-2"
                          />
                        )}
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-gray-800">{item.name}</h3>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 mb-1 line-clamp-1">{item.description}</p>
                        )}
                        <p className="text-orange-600 font-bold text-sm">{formatPrice(item.price)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-4 sticky top-6 border border-orange-200">
              <h2 className="text-lg font-bold mb-3 text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Current Order
              </h2>

              {/* Customer Name */}
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium"
                  placeholder="Enter customer name"
                />
              </div>

              {/* Cart Items */}
              <div className="mb-3 max-h-72 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 text-sm">Cart is empty</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="p-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-md border border-orange-200">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                            <p className="text-xs text-orange-600 font-semibold">{formatPrice(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-bold"
                            >
                              -
                            </button>
                            <span className="w-7 text-center font-bold text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-bold"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-2 flex items-center">
                          <input
                            type="checkbox"
                            id={`counter-packaging-${item.id}`}
                            checked={item.packaging || false}
                            onChange={() => togglePackaging(item.id)}
                            className="h-3 w-3 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`counter-packaging-${item.id}`} className="ml-2 text-xs text-gray-600">
                            Add Packaging
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-orange-200 pt-3 space-y-2 bg-orange-50 -mx-4 px-4 py-3 mt-3">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700">Item Total:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(itemTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700">GST ({Math.round((feeSettings.gstRate || 0.05) * 100)}%):</span>
                  <span className="font-semibold text-gray-900">{formatPrice(gst)}</span>
                </div>
                {packagingFee > 0 && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-700">Packaging Fee:</span>
                    <span className="font-semibold text-gray-900">{formatPrice(packagingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-orange-300 pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-orange-600">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={placeOrder}
                  disabled={loading || cart.length === 0}
                  className={`w-full py-3 rounded-lg font-bold text-base text-white transition-all shadow ${
                    loading || cart.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : '🚀 Place Order & Print'}
                </button>

                {lastOrder && (
                  <button
                    onClick={() => {
                      printBillAutomatically(lastOrder.billData);
                      setPrintMessage('Printing bill...');
                      setTimeout(() => {
                        clearCart();
                        setPrintMessage(null);
                      }, 1500);
                    }}
                    className="w-full py-2 rounded-lg font-semibold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all shadow flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Print Bill
                  </button>
                )}

                <button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="w-full py-2 rounded-lg font-semibold text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  🗑️ Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        body.pos-hide-sidebar .bg-gray-800.text-white.w-64.flex-shrink-0 {
          display: none;
        }
        body.pos-hide-sidebar .min-h-screen.flex {
          flex-direction: column;
        }
        body.pos-hide-sidebar .min-h-screen.flex > .flex-1 {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
