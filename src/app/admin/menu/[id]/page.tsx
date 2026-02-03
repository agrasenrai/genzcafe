'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getMenuItemById } from '@/lib/supabase/menu';
import { getMenuCategories } from '@/lib/supabase/menu';

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  is_veg: boolean;
  calories: number | null;
  protein: number | null;
  offer: string | null;
  available: boolean;
}

interface PageProps {
  params: {
    id: string;
  };
}

// Explicitly defining the component as a Client Component
export default function EditMenuItem({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    categoryId: '',
    isVeg: false,
    calories: '',
    protein: '',
    offer: '',
    available: true
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch menu categories and menu item details
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [categoriesData, menuItemData] = await Promise.all([
          getMenuCategories(),
          getMenuItemById(id)
        ]);

        setCategories(categoriesData as Category[]);
        
        if (menuItemData) {
          setMenuItem(menuItemData as MenuItem);
          setFormData({
            name: menuItemData.name,
            description: menuItemData.description,
            price: menuItemData.price.toString(),
            originalPrice: menuItemData.original_price?.toString() || '',
            categoryId: menuItemData.category_id,
            isVeg: menuItemData.is_veg,
            calories: menuItemData.calories?.toString() || '',
            protein: menuItemData.protein?.toString() || '',
            offer: menuItemData.offer || '',
            available: menuItemData.available
          });
          setImagePreview(menuItemData.image_url);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('Failed to load menu item data');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Upload new image if selected
      let imageUrl = menuItem?.image_url || '';
      
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${id}-${Date.now()}.${fileExt}`;
        const filePath = `menu_items/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, imageFile);
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }
      
      // Update menu item
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          original_price: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
          category_id: formData.categoryId,
          image_url: imageUrl,
          is_veg: formData.isVeg,
          calories: formData.calories ? parseInt(formData.calories) : null,
          protein: formData.protein ? parseInt(formData.protein) : null,
          offer: formData.offer || null,
          available: formData.available,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      setSuccess('Menu item updated successfully');
      
      // Reset error state
      setError(null);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/admin/menu');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error updating menu item:', err);
      setError(err.message || 'Failed to update menu item');
      setSuccess(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!menuItem && !isLoading) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        Menu item not found. Please check the ID and try again.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Menu Item</h1>
        <p className="text-gray-600">Update information for this menu item</p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic info */}
            <div className="space-y-4 md:col-span-2">
              <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            {/* Price and category */}
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                Category*
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹)*
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Original Price (₹)
              </label>
              <input
                type="number"
                id="originalPrice"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty if there's no discount</p>
            </div>
            
            <div>
              <label htmlFor="offer" className="block text-sm font-medium text-gray-700 mb-1">
                Offer Text
              </label>
              <input
                type="text"
                id="offer"
                name="offer"
                value={formData.offer}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            
            {/* Image */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Item Image (Optional)</h2>
              
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {imagePreview && (
                  <div className="w-40 h-40 relative rounded-lg overflow-hidden bg-gray-100">
                    {imagePreview.startsWith('data:') || imagePreview.startsWith('http') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt="Menu item preview"
                        className="object-cover w-full h-full"
                      />
                    ) : null}
                  </div>
                )}
                
                <div className="flex-1">
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                    Change Image
                  </label>
                  <input
                    type="file"
                    id="image"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to keep the current image</p>
                </div>
              </div>
            </div>
            
            {/* Additional info */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Additional Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="calories" className="block text-sm font-medium text-gray-700 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    id="calories"
                    name="calories"
                    value={formData.calories}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="protein" className="block text-sm font-medium text-gray-700 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    id="protein"
                    name="protein"
                    value={formData.protein}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Options */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isVeg"
                  name="isVeg"
                  checked={formData.isVeg}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-black focus:ring-black rounded"
                />
                <label htmlFor="isVeg" className="ml-2 block text-sm text-gray-700">
                  Vegetarian Item
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="available"
                  name="available"
                  checked={formData.available}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-black focus:ring-black rounded"
                />
                <label htmlFor="available" className="ml-2 block text-sm text-gray-700">
                  Item Available for Purchase
                </label>
              </div>
            </div>
          </div>
          
          {/* Submit buttons */}
          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/admin/menu')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 