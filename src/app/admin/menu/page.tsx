'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getAllMenuItemsAdmin, getMenuCategories } from '@/lib/supabase/menu';
import { formatPrice } from '@/lib/utils/helpers';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  is_veg: boolean;
  category_id: string;
  available: boolean;
  category: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function MenuItemsPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vegFilter, setVegFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [displayMode, setDisplayMode] = useState<'grid' | 'table'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Fetch menu items and categories
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [itemsData, categoriesData] = await Promise.all([
          getAllMenuItemsAdmin(),
          getMenuCategories()
        ]);
        
        setMenuItems(itemsData as MenuItem[]);
        setCategories(categoriesData as Category[]);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching menu data:', err);
        setError('Failed to load menu items');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Filter and sort menu items
  useEffect(() => {
    let filtered = [...menuItems];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category_id === categoryFilter);
    }
    
    // Apply vegetarian filter
    if (vegFilter === 'veg') {
      filtered = filtered.filter(item => item.is_veg);
    } else if (vegFilter === 'non-veg') {
      filtered = filtered.filter(item => !item.is_veg);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item => 
          item.name.toLowerCase().includes(query) || 
          item.description.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    switch(sortOrder) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    
    setFilteredItems(filtered);
  }, [menuItems, categoryFilter, vegFilter, searchQuery, sortOrder]);
  
  // Handle bulk selection toggle
  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };
  
  // Handle item selection toggle
  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };
  
  // Handle bulk availability toggle
  const handleBulkAvailabilityToggle = async (makeAvailable: boolean) => {
    if (selectedItems.length === 0) return;
    
    try {
      setBulkActionLoading(true);
      
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ 
          available: makeAvailable,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedItems);
      
      if (updateError) throw updateError;
      
      // Update local state
      setMenuItems(menuItems.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, available: makeAvailable } 
          : item
      ));
      
      // Clear selection
      setSelectedItems([]);
      
    } catch (err: any) {
      console.error('Error updating items:', err);
      setError('Failed to update items');
    } finally {
      setBulkActionLoading(false);
    }
  };
  
  // Handle individual item availability toggle
  const handleIndividualAvailabilityToggle = async (id: string, currentAvailable: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ 
          available: !currentAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setMenuItems(menuItems.map(item => 
        item.id === id 
          ? { ...item, available: !currentAvailable } 
          : item
      ));
      
    } catch (err: any) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
    }
  };
  
  // Handle item delete
  const handleDeleteItem = async (id: string) => {
    const item = menuItems.find(item => item.id === id);
    const itemName = item ? item.name : 'this item';
    
    if (!window.confirm(`Are you sure you want to delete "${itemName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setMenuItems(menuItems.filter(item => item.id !== id));
      
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
          <p className="text-gray-600">Manage your restaurant menu ({menuItems.length} items)</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/menu/new"
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Item
          </Link>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              className={`px-3 py-2 ${displayMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-600'}`}
              onClick={() => setDisplayMode('grid')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              className={`px-3 py-2 ${displayMode === 'table' ? 'bg-gray-100 text-gray-800' : 'text-gray-600'}`}
              onClick={() => setDisplayMode('table')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Items
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Category filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Sort order */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              id="sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
            </select>
          </div>
        </div>
        
        {/* Additional filters */}
        <div className="mt-4 flex items-center">
          <label className="text-sm font-medium text-gray-700 mr-4">Show:</label>
          
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="vegFilter"
                value="all"
                checked={vegFilter === 'all'}
                onChange={() => setVegFilter('all')}
                className="h-4 w-4 text-black focus:ring-black border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">All</span>
            </label>
            
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="vegFilter"
                value="veg"
                checked={vegFilter === 'veg'}
                onChange={() => setVegFilter('veg')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Vegetarian Only</span>
            </label>
            
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="vegFilter"
                value="non-veg"
                checked={vegFilter === 'non-veg'}
                onChange={() => setVegFilter('non-veg')}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Non-Vegetarian Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <span className="font-medium">{selectedItems.length}</span> items selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleBulkAvailabilityToggle(true)}
              disabled={bulkActionLoading}
              className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Mark Available
            </button>
            <button
              onClick={() => handleBulkAvailabilityToggle(false)}
              disabled={bulkActionLoading}
              className="px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              Mark Unavailable
            </button>
            <button
              onClick={() => setSelectedItems([])}
              className="px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
        </div>
      ) : filteredItems.length === 0 ? (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No menu items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || categoryFilter !== 'all' ? 'Try adjusting your filters.' : 'Get started by adding a new item.'}
          </p>
          <div className="mt-6">
            <Link
              href="/admin/menu/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Item
            </Link>
          </div>
        </div>
      ) : displayMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative pt-[60%]">
                <Image
                  src={item.image_url || '/placeholder-food.jpg'}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
                {!item.available && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium">
                      Not Available
                    </span>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                    className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded"
                  />
                </div>
                <div className="absolute top-2 right-2">
                  {item.is_veg ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Veg
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      Non-Veg
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatPrice(item.price)}</div>
                    {item.original_price && (
                      <div className="text-sm text-gray-500 line-through">
                        {formatPrice(item.original_price)}
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  Category: {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                </div>
                <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-100">
                  <Link
                    href={`/admin/menu/${item.id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                  >
                    Edit
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleIndividualAvailabilityToggle(item.id, item.available)}
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        item.available 
                          ? 'text-orange-600 hover:text-orange-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {item.available ? 'Mark Out' : 'Mark In'}
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table View
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veg/Non-Veg
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 mr-3 relative rounded overflow-hidden">
                        <Image
                          src={item.image_url || '/placeholder-food.jpg'}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price)}
                    </div>
                    {item.original_price && (
                      <div className="text-xs text-gray-500 line-through">
                        {formatPrice(item.original_price)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.is_veg 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.is_veg ? 'Veg' : 'Non-Veg'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/menu/${item.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleIndividualAvailabilityToggle(item.id, item.available)}
                      className={`mr-4 text-xs font-medium ${
                        item.available 
                          ? 'text-orange-600 hover:text-orange-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {item.available ? 'Mark Out' : 'Mark In'}
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 