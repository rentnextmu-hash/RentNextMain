export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      add_ons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_quantity: number
          name: string
          price_mur: number
          price_type: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_quantity?: number
          name: string
          price_mur: number
          price_type?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_quantity?: number
          name?: string
          price_mur?: number
          price_type?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_add_ons: {
        Row: {
          add_on_id: string
          booking_id: string
          created_at: string
          id: string
          quantity: number
          total_mur: number
          unit_price_mur: number
          updated_at: string
        }
        Insert: {
          add_on_id: string
          booking_id: string
          created_at?: string
          id?: string
          quantity?: number
          total_mur: number
          unit_price_mur: number
          updated_at?: string
        }
        Update: {
          add_on_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          quantity?: number
          total_mur?: number
          unit_price_mur?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_add_ons_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "add_ons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_add_ons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reference_counters: {
        Row: {
          last_sequence: number
          reference_date: string
        }
        Insert: {
          last_sequence?: number
          reference_date: string
        }
        Update: {
          last_sequence?: number
          reference_date?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          addons_total_mur: number
          cancelled_at: string | null
          car_total_mur: number
          category_id: string
          confirmed_at: string | null
          created_at: string
          customer_id: string
          days: number
          hotel_id: string | null
          id: string
          internal_notes: string | null
          internal_notes_updated_at: string | null
          internal_notes_updated_by: string | null
          notes: string | null
          original_total_mur: number | null
          picked_up_at: string | null
          pickup_at: string
          pickup_location_id: string
          price_override_reason: string | null
          reference: string
          return_at: string
          return_location_id: string
          returned_at: string | null
          source: string
          status: string
          terms_accepted_at: string | null
          total_mur: number
          updated_at: string
          vehicle_assigned_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          addons_total_mur?: number
          cancelled_at?: string | null
          car_total_mur: number
          category_id: string
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          days: number
          hotel_id?: string | null
          id?: string
          internal_notes?: string | null
          internal_notes_updated_at?: string | null
          internal_notes_updated_by?: string | null
          notes?: string | null
          original_total_mur?: number | null
          picked_up_at?: string | null
          pickup_at: string
          pickup_location_id: string
          price_override_reason?: string | null
          reference: string
          return_at: string
          return_location_id: string
          returned_at?: string | null
          source?: string
          status?: string
          terms_accepted_at?: string | null
          total_mur: number
          updated_at?: string
          vehicle_assigned_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          addons_total_mur?: number
          cancelled_at?: string | null
          car_total_mur?: number
          category_id?: string
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          days?: number
          hotel_id?: string | null
          id?: string
          internal_notes?: string | null
          internal_notes_updated_at?: string | null
          internal_notes_updated_by?: string | null
          notes?: string | null
          original_total_mur?: number | null
          picked_up_at?: string | null
          pickup_at?: string
          pickup_location_id?: string
          price_override_reason?: string | null
          reference?: string
          return_at?: string
          return_location_id?: string
          returned_at?: string | null
          source?: string
          status?: string
          terms_accepted_at?: string | null
          total_mur?: number
          updated_at?: string
          vehicle_assigned_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_partner_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_internal_notes_updated_by_fkey"
            columns: ["internal_notes_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          country: string | null
          created_at: string
          email: string
          first_name: string
          flight_number: string | null
          hotel_id: string | null
          id: string
          last_name: string
          marketing_consent: boolean
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          flight_number?: string | null
          hotel_id?: string | null
          id?: string
          last_name: string
          marketing_consent?: boolean
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          flight_number?: string | null
          hotel_id?: string | null
          id?: string
          last_name?: string
          marketing_consent?: boolean
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          commission_rate: number
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_start_date: string | null
          contract_status: string
          created_at: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          pickup_notes: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_start_date?: string | null
          contract_status?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          pickup_notes?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_start_date?: string | null
          contract_status?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          pickup_notes?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          display_order: number
          drive_times: Json
          faqs: Json
          id: string
          image_path: string | null
          intro_content: string | null
          is_active: boolean
          is_pickup_point: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: string | null
          region: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          display_order?: number
          drive_times?: Json
          faqs?: Json
          id?: string
          image_path?: string | null
          intro_content?: string | null
          is_active?: boolean
          is_pickup_point?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: string | null
          region?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          display_order?: number
          drive_times?: Json
          faqs?: Json
          id?: string
          image_path?: string | null
          intro_content?: string | null
          is_active?: boolean
          is_pickup_point?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: string | null
          region?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_mur: number
          booking_id: string
          created_at: string
          id: string
          method: string | null
          paid_at: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_mur: number
          booking_id: string
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_mur?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          location_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          location_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: {
          air_conditioning: boolean
          best_for: string | null
          category: string
          created_at: string
          daily_rate_mur: number | null
          description: string | null
          display_order: number
          doors: number
          features: Json
          fuel_type: string
          id: string
          image_path: string | null
          is_active: boolean
          luggage_capacity: number | null
          make: string | null
          model: string | null
          name: string
          rate_1_2_mur: number
          rate_3_5_mur: number
          rate_6_plus_mur: number
          rate_class: string | null
          seats: number
          slug: string
          tagline: string | null
          transmission: string
          updated_at: string
        }
        Insert: {
          air_conditioning?: boolean
          best_for?: string | null
          category: string
          created_at?: string
          daily_rate_mur?: number | null
          description?: string | null
          display_order?: number
          doors?: number
          features?: Json
          fuel_type?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          luggage_capacity?: number | null
          make?: string | null
          model?: string | null
          name: string
          rate_1_2_mur: number
          rate_3_5_mur: number
          rate_6_plus_mur: number
          rate_class?: string | null
          seats?: number
          slug: string
          tagline?: string | null
          transmission?: string
          updated_at?: string
        }
        Update: {
          air_conditioning?: boolean
          best_for?: string | null
          category?: string
          created_at?: string
          daily_rate_mur?: number | null
          description?: string | null
          display_order?: number
          doors?: number
          features?: Json
          fuel_type?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          luggage_capacity?: number | null
          make?: string | null
          model?: string | null
          name?: string
          rate_1_2_mur?: number
          rate_3_5_mur?: number
          rate_6_plus_mur?: number
          rate_class?: string | null
          seats?: number
          slug?: string
          tagline?: string | null
          transmission?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          acquired_at: string | null
          category_id: string
          code: string
          colour: string | null
          created_at: string
          id: string
          location_id: string
          mileage_km: number
          notes: string | null
          registration: string
          status: string
          updated_at: string
          year: number | null
        }
        Insert: {
          acquired_at?: string | null
          category_id: string
          code: string
          colour?: string | null
          created_at?: string
          id?: string
          location_id: string
          mileage_km?: number
          notes?: string | null
          registration: string
          status?: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          acquired_at?: string | null
          category_id?: string
          code?: string
          colour?: string | null
          created_at?: string
          id?: string
          location_id?: string
          mileage_km?: number
          notes?: string | null
          registration?: string
          status?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      category_available_counts: {
        Row: {
          available_count: number | null
          category_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      location_fleet_counts: {
        Row: {
          location_id: string | null
          vehicle_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_partner_hotels: {
        Row: {
          id: string | null
          location_id: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          location_id?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          location_id?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_booking_vehicle: {
        Args: { p_booking_id: string; p_vehicle_id: string }
        Returns: undefined
      }
      create_booking_request: {
        Args: {
          p_add_ons: Json
          p_addons_total_mur: number
          p_car_total_mur: number
          p_category_id: string
          p_customer: Json
          p_days: number
          p_hotel_id: string
          p_notes: string
          p_pickup_at: string
          p_pickup_location_id: string
          p_return_at: string
          p_return_location_id: string
          p_total_mur: number
        }
        Returns: {
          booking_id: string
          reference: string
        }[]
      }
      create_staff_booking: {
        Args: {
          p_add_ons: Json
          p_addons_total_mur: number
          p_car_total_mur: number
          p_category_id: string
          p_customer_id: string
          p_days: number
          p_hotel_id: string
          p_internal_notes: string
          p_new_customer: Json
          p_original_total_mur: number
          p_pickup_at: string
          p_pickup_location_id: string
          p_price_override_reason: string
          p_return_at: string
          p_return_location_id: string
          p_source: string
          p_staff_id: string
          p_status: string
          p_total_mur: number
          p_vehicle_id: string
        }
        Returns: {
          booking_id: string
          reference: string
        }[]
      }
      generate_booking_reference: { Args: never; Returns: string }
      is_role: { Args: { roles: string[] }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      release_vehicle_if_free: {
        Args: { p_except_booking_id: string; p_vehicle_id: string }
        Returns: undefined
      }
      transition_booking: {
        Args: {
          p_booking_id: string
          p_return_mileage_km?: number
          p_to_status: string
          p_vehicle_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
