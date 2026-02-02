'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { getAllMenuItems } from '@/lib/supabase/menu';
//redploy
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string;
  is_veg: boolean;
  rating: number | null;
  rating_count: number | null;
  calories: number | null;
  protein: number | null;
  original_price: number | null;
  offer: string | null;
  available: boolean;
  menu_categories: {
    name: string;
  };
}

export default function MenuPage() {
  const { addItem, itemCount, updateQuantity, items: cartItems } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Create refs for category sections
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch menu items from Supabase
  useEffect(() => {
    async function fetchMenuItems() {
      try {
        setIsLoading(true);
        const data = await getAllMenuItems();
        setMenuItems(data as MenuItem[]);
        setError(null);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError('Failed to load menu items. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMenuItems();
  }, []);

  // Initialize quantities from cart
  useEffect(() => {
    const newQuantities: Record<string, number> = {};
    cartItems.forEach(item => {
      newQuantities[item.id] = item.quantity;
    });
    setQuantities(newQuantities);
  }, [cartItems]);

  // Get unique categories from the menu items
  const categories = Array.from(new Set(menuItems.map(item => item.menu_categories.name)));

  // Filter menu items based on selected category, veg filter, and search term
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory ? item.menu_categories.name === selectedCategory : true;
    const matchesVegFilter = isVegOnly ? item.is_veg : true;
    const matchesSearch = searchTerm 
      ? item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return matchesCategory && matchesVegFilter && matchesSearch;
  });

  // Group items by category for display
  const itemsByCategory: Record<string, MenuItem[]> = {};
  
  if (selectedCategory) {
    itemsByCategory[selectedCategory] = filteredItems;
  } else {
    filteredItems.forEach(item => {
      const category = item.menu_categories.name;
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });
  }

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price
    });
    
    // Update quantities
    setQuantities(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    updateQuantity(itemId, newQuantity);
    setQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Function to scroll to a category section
  const scrollToCategory = (category: string) => {
    if (categoryRefs.current[category]) {
      categoryRefs.current[category]?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      // Close the menu after selection
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between gap-3 relative">
          <Link href="/" className="text-gray-800 flex-shrink-0">
            <span className="sr-only">Back to Home</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          {!isSearchOpen ? (
            <h1 className="text-xl font-bold text-center absolute left-1/2 -translate-x-1/2">Menu</h1>
          ) : (
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full py-2 pl-9 pr-3 border border-gray-200 rounded-full text-sm bg-gray-50 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Pure Veg toggle - green veg icon (Indian veg symbol: circle with dot) */}
            <button
              onClick={() => setIsVegOnly(!isVegOnly)}
              className={`p-2 rounded-full transition-colors ${isVegOnly ? 'bg-green-100' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
              title={isVegOnly ? 'Pure Veg Only (click to show all)' : 'Show Pure Veg only'}
              aria-label={isVegOnly ? 'Pure Veg filter active' : 'Pure Veg filter'}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isVegOnly ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                <div className={`w-2 h-2 rounded-full ${isVegOnly ? 'bg-green-600' : 'bg-gray-300'}`} />
              </div>
            </button>
            {/* Search icon / Close icon when search open */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              title={isSearchOpen ? 'Close search' : 'Search'}
              aria-label={isSearchOpen ? 'Close search' : 'Search'}
            >
              {isSearchOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Categories - only when search is closed, or always show */}
        <div className="px-4 pb-3 border-b border-gray-100">
          <div className="flex overflow-x-auto py-1 scrollbar-hide gap-2">
            <button
              className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-full flex-shrink-0 ${
                selectedCategory === null ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-full flex-shrink-0 ${
                  selectedCategory === category ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto pb-24">
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 m-4 rounded-md">
            {error}
          </div>
        )}
        
        {/* No results */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter to find what you're looking for.
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory(null);
                  setIsVegOnly(false);
                  setIsSearchOpen(false);
                }}
              >
                Reset filters
              </button>
            </div>
          </div>
        )}

        {/* Menu Items */}
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div 
            key={category} 
            className="mt-4"
            ref={el => { categoryRefs.current[category] = el; }}
          >
            <div className="px-4 mb-2 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{category}</h2>
              <span className="text-xs text-gray-400">{items.length} items</span>
            </div>
            <div className="px-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${!item.available ? 'opacity-60' : ''}`}
                  onClick={() => {
                    if (item.available) {
                      setSelectedItem(item);
                      setIsModalOpen(true);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="w-24 h-24 relative rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image_url || '/placeholder-food.jpg'}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                      {!item.available && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">OUT OF STOCK</span>
                        </div>
                      )}
                      {item.is_veg && item.available && (
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-semibold text-green-700 border border-green-100">
                          Veg
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-[15px] text-gray-900 leading-snug">
                          {item.name}
                        </h3>
                        {item.rating && item.available && (
                          <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-full">
                            <span className="font-semibold mr-1">★ {item.rating}</span>
                            {item.rating_count && (
                              <span className="text-gray-500">({item.rating_count})</span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-base font-semibold text-gray-900">
                          ₹{item.price.toFixed(2)}
                        </div>
                        
                        {!item.available ? (
                          <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 bg-gray-100 rounded-full uppercase cursor-not-allowed">
                            Out of Stock
                          </div>
                        ) : quantities[item.id] ? (
                          <div className="flex items-center">
                            <button 
                              className="w-8 h-8 flex items-center justify-center text-green-700 border border-green-600 rounded-full hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(item.id, quantities[item.id] - 1);
                              }}
                            >
                              -
                            </button>
                            <span className="mx-3 min-w-[1.5rem] text-center">{quantities[item.id]}</span>
                            <button 
                              className="w-8 h-8 flex items-center justify-center text-green-700 border border-green-600 rounded-full hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(item.id, quantities[item.id] + 1);
                              }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className="px-4 py-1.5 text-xs font-semibold text-green-700 border border-green-600 rounded-full uppercase hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Item details modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-h-[90vh] overflow-auto z-10 relative rounded-t-xl">
            <div className="relative">
              <div className="h-64 relative">
                <Image
                  src={selectedItem.image_url || '/placeholder-food.jpg'}
                  alt={selectedItem.name}
                  fill
                  className="object-cover"
                />
                {selectedItem.offer && (
                  <div className="absolute top-4 left-4">
                    <div className="bg-white text-orange-500 font-medium px-3 py-1 rounded-full text-sm">
                      {selectedItem.offer}
                    </div>
                  </div>
                )}
                <button
                  className="absolute top-4 right-4 bg-white rounded-full p-2"
                  onClick={() => setIsModalOpen(false)}
                >
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-800">{selectedItem.name}</h2>
                {selectedItem.is_veg && (
                  <div className="ml-2">
                    <div className="w-5 h-5 border border-green-600 flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center mt-1">
                {selectedItem.rating && (
                  <div className="flex items-center bg-green-50 px-2 py-1 rounded text-sm">
                    <span className="text-green-700 font-medium">★ {selectedItem.rating}</span>
                    {selectedItem.rating_count && (
                      <span className="text-gray-600 ml-1">({selectedItem.rating_count} ratings)</span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center mt-3">
                <span className="text-2xl font-bold">₹{selectedItem.price}</span>
                {selectedItem.original_price && (
                  <span className="ml-2 text-gray-500 line-through">₹{selectedItem.original_price}</span>
                )}
              </div>
              
              {(selectedItem.calories || selectedItem.protein) && (
                <div className="flex mt-4 text-sm text-gray-600">
                  {selectedItem.calories && (
                    <div className="mr-4">
                      <span>Energy - {selectedItem.calories}kcal</span>
                    </div>
                  )}
                  {selectedItem.protein && (
                    <div>
                      <span>Protein - {selectedItem.protein}gm</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-gray-700 text-base">{selectedItem.description}</p>
              </div>
              
              {!selectedItem.available ? (
                <div className="mt-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg text-center">
                  Out of Stock
                </div>
              ) : quantities[selectedItem.id] ? (
                <div className="mt-6 flex items-center justify-center">
                  <div className="flex items-center border-2 border-black rounded-lg overflow-hidden">
                    <button 
                      className="w-12 h-12 flex items-center justify-center text-black bg-white hover:bg-gray-50 font-bold text-xl transition-colors"
                      onClick={() => handleQuantityChange(selectedItem.id, quantities[selectedItem.id] - 1)}
                    >
                      -
                    </button>
                    <div className="w-16 h-12 flex items-center justify-center text-xl font-bold bg-white border-l border-r border-black">
                      {quantities[selectedItem.id]}
                    </div>
                    <button 
                      className="w-12 h-12 flex items-center justify-center text-white bg-black hover:bg-gray-800 font-bold text-xl transition-colors"
                      onClick={() => handleQuantityChange(selectedItem.id, quantities[selectedItem.id] + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    handleAddToCart(selectedItem);
                  }}
                  className="mt-6 w-full py-3 bg-black text-white font-medium rounded-lg"
                >
                  ADD
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart floating pill - updated to be more stretched and fully clickable */}
      {cartItems.length > 0 && (
        <Link href="/cart">
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-md mx-auto bg-black text-white py-3 px-6 rounded-full flex justify-between items-center shadow-lg z-20 cursor-pointer hover:bg-gray-800 transition-all">
            <div className="flex items-center">
              <div className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">
                {cartItems.reduce((total, item) => total + item.quantity, 0)}
              </div>
              <span className="font-medium">View Cart</span>
            </div>
            <div className="font-bold">₹{calculateCartTotal().toFixed(2)}</div>
          </div>
        </Link>
      )}

      {/* Floating menu button and categories submenu */}
      <div className="fixed bottom-20 right-4 z-10">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-12 h-12 rounded-full bg-black flex items-center justify-center shadow-lg text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Categories popup menu */}
        {isMenuOpen && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-3 min-w-[190px] border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Jump to</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="max-h-48 overflow-auto pr-1 space-y-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => scrollToCategory(category)}
                  className="w-full text-left text-sm py-1.5 px-2 hover:bg-gray-100 rounded-md transition-colors truncate"
                  title={category}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 