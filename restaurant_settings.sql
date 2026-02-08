-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create restaurant_settings table for admin settings (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'GenZ Cafe',
    description TEXT DEFAULT 'Modern cafe ordering platform for the new generation',
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    business_hours TEXT DEFAULT '11:00 AM - 10:00 PM',
    delivery_fee DECIMAL(10, 2) DEFAULT 40.00,
    minimum_order_amount DECIMAL(10, 2) DEFAULT 100.00,
    tax_rate DECIMAL(5, 2) DEFAULT 5.00,
    accept_credit_cards BOOLEAN DEFAULT true,
    accept_cash BOOLEAN DEFAULT true,
    offer_takeout BOOLEAN DEFAULT true,
    offer_delivery BOOLEAN DEFAULT false,
    delivery_radius_km DECIMAL(5, 1) DEFAULT 10.0,
    currency TEXT DEFAULT 'INR',
    instagram_handle TEXT,
    facebook_handle TEXT,
    twitter_handle TEXT,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add platform_fee column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_settings' AND column_name = 'platform_fee') THEN
        ALTER TABLE public.restaurant_settings ADD COLUMN platform_fee DECIMAL(10, 2) DEFAULT 15.00;
    END IF;
    
    -- Add platform_fee_enabled column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_settings' AND column_name = 'platform_fee_enabled') THEN
        ALTER TABLE public.restaurant_settings ADD COLUMN platform_fee_enabled BOOLEAN DEFAULT true;
    END IF;
    
    -- Add is_open column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_settings' AND column_name = 'is_open') THEN
        ALTER TABLE public.restaurant_settings ADD COLUMN is_open BOOLEAN DEFAULT true;
    END IF;
    
    -- Add packaging_fee column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_settings' AND column_name = 'packaging_fee') THEN
        ALTER TABLE public.restaurant_settings ADD COLUMN packaging_fee DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
    
    -- Add packaging_fee_enabled column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_settings' AND column_name = 'packaging_fee_enabled') THEN
        ALTER TABLE public.restaurant_settings ADD COLUMN packaging_fee_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Insert default settings row (only if table is empty)
INSERT INTO public.restaurant_settings (
    name,
    description,
    business_hours,
    phone,
    email,
    address,
    city,
    state,
    country,
    delivery_fee,
    minimum_order_amount,
    tax_rate,
    platform_fee,
    platform_fee_enabled,
    is_open,
    accept_credit_cards,
    accept_cash,
    offer_takeout,
    offer_delivery,
    delivery_radius_km,
    currency
)
SELECT 
    'GenZ Cafe',
    'Modern cafe ordering platform for the new generation',
    '11:00 AM - 10:00 PM',
    '+91 9876543210',
    'contact@genzcafe.com',
    '123 Tech Street',
    'Bangalore',
    'Karnataka',
    'India',
    40.00,
    100.00,
    5.00,
    15.00,
    true,
    true,
    true,
    true,
    true,
    false,
    10.0,
    'INR'
WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_settings LIMIT 1);

-- Enable RLS (Row Level Security)
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'restaurant_settings' 
        AND policyname = 'Allow all operations for authenticated users'
    ) THEN
        CREATE POLICY "Allow all operations for authenticated users" ON public.restaurant_settings
            FOR ALL USING (true);
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_restaurant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at (drop if exists first)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_restaurant_settings_updated_at_trigger'
    ) THEN
        DROP TRIGGER update_restaurant_settings_updated_at_trigger ON public.restaurant_settings;
    END IF;
    
    CREATE TRIGGER update_restaurant_settings_updated_at_trigger
        BEFORE UPDATE ON public.restaurant_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_restaurant_settings_updated_at();
END $$;

-- Grant necessary permissions (these are safe to run multiple times)
GRANT ALL ON public.restaurant_settings TO authenticated;
GRANT ALL ON public.restaurant_settings TO anon;
