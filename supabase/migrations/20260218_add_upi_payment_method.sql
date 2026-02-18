-- Add UPI to payment_method constraint
-- Update the payment_method constraint to include 'upi'

ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('card', 'cash', 'upi'));

COMMENT ON COLUMN public.orders.payment_method IS 'Payment method: card, cash, or upi';
