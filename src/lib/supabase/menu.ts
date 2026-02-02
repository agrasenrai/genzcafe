import { supabase } from './client';

/**
 * Get all menu categories
 */
export async function getMenuCategories() {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return data;
}

/**
 * Get menu items by category
 */
export async function getMenuItemsByCategory(categoryId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .eq('available', true);
  
  if (error) throw error;
  return data;
}

/**
 * Get all menu items (for users - only available items)
 */
export async function getAllMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      menu_categories(name),
      item_feedback(rating)
    `);
  
  if (error) throw error;

  // Calculate average rating for each item
  const itemsWithRating = data.map(item => {
    const ratings = item.item_feedback?.map(f => f.rating) || [];
    const avgRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : null;
    
    return {
      ...item,
      rating: avgRating ? Number(avgRating.toFixed(1)) : null,
      rating_count: ratings.length
    };
  });

  return itemsWithRating;
}

/**
 * Get all menu items for admin (including unavailable items)
 */
export async function getAllMenuItemsAdmin() {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      menu_categories(name)
    `);
  
  if (error) throw error;
  return data;
}

/**
 * Get menu item by ID
 */
export async function getMenuItemById(itemId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Search menu items
 */
export async function searchMenuItems(query: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('available', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  
  if (error) throw error;
  return data;
}

/**
 * Get vegetarian menu items
 */
export async function getVegetarianItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_veg', true)
    .eq('available', true);
  
  if (error) throw error;
  return data;
} 