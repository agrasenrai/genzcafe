-- Add delivery_points column to restaurant_settings table for managing pickup locations
alter table public.restaurant_settings
add column delivery_points text null;

-- Add comment to describe the column format
comment on column public.restaurant_settings.delivery_points is 'JSON array of delivery points: [{"name":"Main Store","address":"123 Main St","phone":"123-456-7890"}]';
