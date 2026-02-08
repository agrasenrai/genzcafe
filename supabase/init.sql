-- Create schema for tables
CREATE SCHEMA IF NOT EXISTS public;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create menu_categories table
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  image_url TEXT NOT NULL,
  is_veg BOOLEAN NOT NULL DEFAULT false,
  rating DECIMAL(3, 1),
  rating_count INTEGER,
  calories INTEGER,
  protein INTEGER,
  offer TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'cash')),
  item_total DECIMAL(10, 2) NOT NULL,
  gst DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  delivery_charge DECIMAL(10, 2) NOT NULL,
  final_total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')) DEFAULT 'pending',
  otp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  packaging BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data for platform fees
INSERT INTO public.settings (key, value) 
VALUES ('platform_fees', '{"platformFee": 15.00, "deliveryCharge": 40.00, "freeDeliveryThreshold": 500.00, "gstRate": 0.05}')
ON CONFLICT (key) DO NOTHING;

-- Insert initial data for restaurant info
INSERT INTO public.settings (key, value) 
VALUES ('restaurant_info', '{"name": "Restaurant", "phone": "1234567890", "email": "contact@restaurant.com", "address": "123 Food Street, Foodville", "openingHours": "11:00 AM - 10:00 PM", "description": "Delicious food at your doorstep"}')
ON CONFLICT (key) DO NOTHING;

-- Create initial menu categories
INSERT INTO public.menu_categories (name, display_order)
VALUES 
('South Indian Specialties', 1),
('Gujarati Specialties', 2),
('Mumbai Street Food', 3),
('Indo-Chinese', 4)
ON CONFLICT DO NOTHING;

-- Create function to insert sample menu items
CREATE OR REPLACE FUNCTION insert_sample_menu_items() RETURNS void AS $$
DECLARE
  south_indian_id UUID;
  gujarati_id UUID;
  mumbai_street_id UUID;
  indo_chinese_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO south_indian_id FROM public.menu_categories WHERE name = 'South Indian Specialties' LIMIT 1;
  SELECT id INTO gujarati_id FROM public.menu_categories WHERE name = 'Gujarati Specialties' LIMIT 1;
  SELECT id INTO mumbai_street_id FROM public.menu_categories WHERE name = 'Mumbai Street Food' LIMIT 1;
  SELECT id INTO indo_chinese_id FROM public.menu_categories WHERE name = 'Indo-Chinese' LIMIT 1;
  
  -- Insert sample menu items
  -- South Indian
  INSERT INTO public.menu_items (
    category_id, name, description, price, original_price, image_url, is_veg, 
    rating, rating_count, calories, protein, offer
  ) VALUES (
    south_indian_id,
    'Masala Dosa',
    'Crispy rice and lentil crepe filled with spiced potato, served with sambar and chutneys. Made with high-quality ingredients and traditional spices.',
    149.00,
    179.00,
    '/assets/images/menu/masala-dosa.jpg',
    true,
    4.4,
    351,
    245,
    8,
    'Buy 1 Get 1 Free'
  ) ON CONFLICT DO NOTHING;
  
  INSERT INTO public.menu_items (
    category_id, name, description, price, original_price, image_url, is_veg, 
    rating, rating_count, calories, protein
  ) VALUES (
    south_indian_id,
    'Medu Vada',
    'Crispy lentil doughnuts seasoned with spices, curry leaves, and black pepper. A protein-rich South Indian delicacy.',
    99.00,
    129.00,
    '/assets/images/menu/medu-vada.jpg',
    true,
    4.3,
    289,
    185,
    12
  ) ON CONFLICT DO NOTHING;
  
  -- Gujarati
  INSERT INTO public.menu_items (
    category_id, name, description, price, original_price, image_url, is_veg, 
    rating, rating_count, calories, protein, offer
  ) VALUES (
    gujarati_id,
    'Dhokla',
    'Soft and spongy steamed snack made from fermented rice and chickpea batter, tempered with mustard seeds and curry leaves. High in protein, low in calories.',
    89.00,
    119.00,
    '/assets/images/menu/dhokla.jpg',
    true,
    4.6,
    423,
    120,
    10,
    '25% OFF'
  ) ON CONFLICT DO NOTHING;
  
  -- Mumbai Street Food
  INSERT INTO public.menu_items (
    category_id, name, description, price, image_url, is_veg, 
    rating, rating_count, calories, protein
  ) VALUES (
    mumbai_street_id,
    'Pav Bhaji',
    'Spiced mashed vegetables served with buttered pav bread, onions, and lemon. A Mumbai street food classic made healthy.',
    159.00,
    '/assets/images/menu/pav bhaji.jpg',
    true,
    4.7,
    512,
    325,
    9
  ) ON CONFLICT DO NOTHING;
  
  -- Indo-Chinese
  INSERT INTO public.menu_items (
    category_id, name, description, price, original_price, image_url, is_veg,
    rating, rating_count, calories, protein
  ) VALUES (
    indo_chinese_id,
    'Schezwan Noodles',
    'Spicy stir-fried noodles with vegetables in a flavorful Schezwan sauce. Made with whole wheat noodles for added nutrition.',
    179.00,
    199.00,
    '/assets/images/menu/noodles.jpg',
    true,
    4.2,
    345,
    385,
    14
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to insert sample menu items
SELECT insert_sample_menu_items();

-- Create RLS (Row Level Security) policies
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for menu (publicly readable)
CREATE POLICY "Menu categories are publicly viewable" ON public.menu_categories
  FOR SELECT USING (true);
  
CREATE POLICY "Menu items are publicly viewable" ON public.menu_items
  FOR SELECT USING (true);

-- Create policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));
  
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  
CREATE POLICY "Users can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    ) OR 
    auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
  );

-- Create policies for settings (admin only)
CREATE POLICY "Settings are publicly viewable" ON public.settings
  FOR SELECT USING (true);

-- Create stored procedure for order creation with items
CREATE OR REPLACE FUNCTION create_order(
  user_id UUID,
  order_type TEXT,
  delivery_address TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  item_total DECIMAL,
  gst DECIMAL,
  platform_fee DECIMAL,
  delivery_charge DECIMAL,
  final_total DECIMAL,
  status TEXT,
  otp TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  items JSONB
) RETURNS JSONB AS $$
DECLARE
  order_id UUID;
  item JSONB;
BEGIN
  -- Insert order
  INSERT INTO public.orders (
    user_id, order_type, delivery_address, scheduled_time, 
    payment_method, item_total, gst, platform_fee, delivery_charge, 
    final_total, status, otp, created_at, updated_at
  ) VALUES (
    user_id, order_type, delivery_address, scheduled_time, 
    payment_method, item_total, gst, platform_fee, delivery_charge, 
    final_total, status, otp, created_at, updated_at
  ) RETURNING id INTO order_id;
  
  -- Insert order items
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    INSERT INTO public.order_items (
      order_id, menu_item_id, name, price, quantity, created_at, updated_at
    ) VALUES (
      order_id,
      (item->>'menuItemId')::UUID,
      item->>'name',
      (item->>'price')::DECIMAL,
      (item->>'quantity')::INTEGER,
      created_at,
      updated_at
    );
  END LOOP;
  
  -- Return the created order
  RETURN (
    SELECT row_to_json(o) 
    FROM (
      SELECT o.*, 
      (
        SELECT json_agg(row_to_json(i)) 
        FROM public.order_items i 
        WHERE i.order_id = o.id
      ) as items
      FROM public.orders o
      WHERE o.id = order_id
    ) o
  );
END;
$$ LANGUAGE plpgsql; 