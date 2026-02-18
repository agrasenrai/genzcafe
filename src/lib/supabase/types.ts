export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          email: string | null
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          email?: string | null
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          email?: string | null
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string
          price: number
          original_price: number | null
          image_url: string
          is_veg: boolean
          rating: number | null
          rating_count: number | null
          calories: number | null
          protein: number | null
          offer: string | null
          available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description: string
          price: number
          original_price?: number | null
          image_url: string
          is_veg: boolean
          rating?: number | null
          rating_count?: number | null
          calories?: number | null
          protein?: number | null
          offer?: string | null
          available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string
          price?: number
          original_price?: number | null
          image_url?: string
          is_veg?: boolean
          rating?: number | null
          rating_count?: number | null
          calories?: number | null
          protein?: number | null
          offer?: string | null
          available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          order_type: 'pickup' | 'delivery'
          delivery_address: string | null
          scheduled_time: string
          payment_method: 'card' | 'cash' | 'upi'
          item_total: number
          gst: number
          platform_fee: number
          delivery_charge: number
          final_total: number
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          otp: string
          coupon_id: string | null
          coupon_code: string | null
          discount_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_type: 'pickup' | 'delivery'
          delivery_address?: string | null
          scheduled_time: string
          payment_method: 'card' | 'cash' | 'upi'
          item_total: number
          gst: number
          platform_fee: number
          delivery_charge: number
          final_total: number
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          otp: string
          coupon_id?: string | null
          coupon_code?: string | null
          discount_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          order_type?: 'pickup' | 'delivery'
          delivery_address?: string | null
          scheduled_time?: string
          payment_method?: 'card' | 'cash' | 'upi'
          item_total?: number
          gst?: number
          platform_fee?: number
          delivery_charge?: number
          final_total?: number
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          otp?: string
          coupon_id?: string | null
          coupon_code?: string | null
          discount_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          name: string
          price: number
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          name: string
          price: number
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          name?: string
          price?: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      coupons: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          minimum_order_amount: number
          maximum_discount_amount: number | null
          usage_limit: number | null
          used_count: number
          per_user_limit: number
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          minimum_order_amount?: number
          maximum_discount_amount?: number | null
          usage_limit?: number | null
          used_count?: number
          per_user_limit?: number
          start_date: string
          end_date: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          discount_type?: 'percentage' | 'fixed'
          discount_value?: number
          minimum_order_amount?: number
          maximum_discount_amount?: number | null
          usage_limit?: number | null
          used_count?: number
          per_user_limit?: number
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      coupon_usage: {
        Row: {
          id: string
          coupon_id: string
          user_id: string | null
          order_id: string | null
          discount_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          user_id?: string | null
          order_id?: string | null
          discount_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          user_id?: string | null
          order_id?: string | null
          discount_amount?: number
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 