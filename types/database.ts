// Hand-written to exactly match supabase/migrations/0001_initial_schema.sql
// and 0002_rls.sql, in the shape the Supabase CLI's `gen types typescript`
// produces. Regenerate for real with `npm run types:gen` once the
// migrations have been applied to the linked project (needs `supabase
// login` first) — this file should then diff cleanly against that output.
// Until then, this is the source of truth the query layer builds against.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VehicleCategoryClass = "economy" | "comfort" | "suv" | "premium";
export type Transmission = "automatic" | "manual";
export type FuelType = "petrol" | "diesel" | "hybrid" | "electric";
export type VehicleStatus = "available" | "booked" | "maintenance" | "inactive";
export type LocationType = "branch" | "airport" | "hotel" | "custom";
export type ContractStatus = "active" | "pending" | "inactive";
export type BookingStatus = "requested" | "confirmed" | "active" | "completed" | "cancelled";
export type BookingSource = "website" | "phone" | "hotel" | "walk_in";
export type AddOnPriceType = "per_day" | "per_booking";
export type PaymentMethod = "cash" | "card" | "transfer" | "online";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type StaffRole = "owner" | "manager" | "staff";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: StaffRole;
          location_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: StaffRole;
          location_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          type: LocationType;
          region: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          is_pickup_point: boolean;
          seo_title: string | null;
          seo_description: string | null;
          intro_content: string | null;
          image_path: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          type?: LocationType;
          region?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_pickup_point?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          intro_content?: string | null;
          image_path?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
        Relationships: [];
      };
      vehicle_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          make: string | null;
          model: string | null;
          category: VehicleCategoryClass;
          transmission: Transmission;
          seats: number;
          doors: number;
          fuel_type: FuelType;
          air_conditioning: boolean;
          daily_rate_mur: number;
          description: string | null;
          features: Json;
          image_path: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          make?: string | null;
          model?: string | null;
          category: VehicleCategoryClass;
          transmission?: Transmission;
          seats?: number;
          doors?: number;
          fuel_type?: FuelType;
          air_conditioning?: boolean;
          daily_rate_mur: number;
          description?: string | null;
          features?: Json;
          image_path?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicle_categories"]["Insert"]>;
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          category_id: string;
          code: string;
          registration: string;
          location_id: string;
          status: VehicleStatus;
          mileage_km: number;
          year: number | null;
          colour: string | null;
          notes: string | null;
          acquired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          code: string;
          registration: string;
          location_id: string;
          status?: VehicleStatus;
          mileage_km?: number;
          year?: number | null;
          colour?: string | null;
          notes?: string | null;
          acquired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
        Relationships: [];
      };
      hotels: {
        Row: {
          id: string;
          name: string;
          slug: string;
          location_id: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          contract_status: ContractStatus;
          commission_rate: number;
          pickup_notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          location_id?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          contract_status?: ContractStatus;
          commission_rate?: number;
          pickup_notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hotels"]["Insert"]>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          country: string | null;
          hotel_id: string | null;
          flight_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          country?: string | null;
          hotel_id?: string | null;
          flight_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      add_ons: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          price_mur: number;
          price_type: AddOnPriceType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          price_mur: number;
          price_type?: AddOnPriceType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["add_ons"]["Insert"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          reference: string;
          customer_id: string;
          category_id: string;
          vehicle_id: string | null;
          pickup_location_id: string;
          return_location_id: string;
          pickup_at: string;
          return_at: string;
          days: number;
          status: BookingStatus;
          car_total_mur: number;
          addons_total_mur: number;
          total_mur: number;
          source: BookingSource;
          hotel_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          customer_id: string;
          category_id: string;
          vehicle_id?: string | null;
          pickup_location_id: string;
          return_location_id: string;
          pickup_at: string;
          return_at: string;
          days: number;
          status?: BookingStatus;
          car_total_mur: number;
          addons_total_mur?: number;
          total_mur: number;
          source?: BookingSource;
          hotel_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      booking_add_ons: {
        Row: {
          id: string;
          booking_id: string;
          add_on_id: string;
          quantity: number;
          unit_price_mur: number;
          total_mur: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          add_on_id: string;
          quantity?: number;
          unit_price_mur: number;
          total_mur: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["booking_add_ons"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          amount_mur: number;
          method: PaymentMethod | null;
          status: PaymentStatus;
          reference: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          amount_mur: number;
          method?: PaymentMethod | null;
          status?: PaymentStatus;
          reference?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };
      booking_reference_counters: {
        Row: {
          reference_date: string;
          last_sequence: number;
        };
        Insert: {
          reference_date: string;
          last_sequence?: number;
        };
        Update: Partial<Database["public"]["Tables"]["booking_reference_counters"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_booking_reference: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_role: {
        Args: { roles: string[] };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
};
