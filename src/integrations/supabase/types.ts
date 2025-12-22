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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          created_at: string
          id: string
          license_tier_id: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          license_tier_id: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          license_tier_id?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_license_tier_id_fkey"
            columns: ["license_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          against: string
          created_at: string
          description: string | null
          id: string
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"] | null
          transaction_id: string
        }
        Insert: {
          against: string
          created_at?: string
          description?: string | null
          id?: string
          raised_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          transaction_id: string
        }
        Update: {
          against?: string
          created_at?: string
          description?: string | null
          id?: string
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      license_tiers: {
        Row: {
          created_at: string
          current_sales: number | null
          description: string | null
          id: string
          is_available: boolean | null
          license_type: Database["public"]["Enums"]["license_type"]
          max_sales: number | null
          price: number
          song_id: string
          terms: string | null
        }
        Insert: {
          created_at?: string
          current_sales?: number | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          license_type: Database["public"]["Enums"]["license_type"]
          max_sales?: number | null
          price: number
          song_id: string
          terms?: string | null
        }
        Update: {
          created_at?: string
          current_sales?: number | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          license_type?: Database["public"]["Enums"]["license_type"]
          max_sales?: number | null
          price?: number
          song_id?: string
          terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_tiers_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      moods: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          social_links: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          social_links?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          social_links?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      seller_wallets: {
        Row: {
          available_balance: number | null
          created_at: string
          id: string
          pending_balance: number | null
          total_earnings: number | null
          updated_at: string
          user_id: string
          withdrawal_threshold: number | null
        }
        Insert: {
          available_balance?: number | null
          created_at?: string
          id?: string
          pending_balance?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
          withdrawal_threshold?: number | null
        }
        Update: {
          available_balance?: number | null
          created_at?: string
          id?: string
          pending_balance?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
          withdrawal_threshold?: number | null
        }
        Relationships: []
      }
      songs: {
        Row: {
          audio_url: string | null
          base_price: number
          bpm: number | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration: number | null
          full_lyrics: string | null
          genre_id: string | null
          has_audio: boolean | null
          has_lyrics: boolean | null
          id: string
          is_featured: boolean | null
          language: string | null
          mood_id: string | null
          play_count: number | null
          preview_audio_url: string | null
          preview_lyrics: string | null
          rejection_reason: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["song_status"]
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          audio_url?: string | null
          base_price?: number
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          full_lyrics?: string | null
          genre_id?: string | null
          has_audio?: boolean | null
          has_lyrics?: boolean | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          mood_id?: string | null
          play_count?: number | null
          preview_audio_url?: string | null
          preview_lyrics?: string | null
          rejection_reason?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["song_status"]
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          audio_url?: string | null
          base_price?: number
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          full_lyrics?: string | null
          genre_id?: string | null
          has_audio?: boolean | null
          has_lyrics?: boolean | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          mood_id?: string | null
          play_count?: number | null
          preview_audio_url?: string | null
          preview_lyrics?: string | null
          rejection_reason?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["song_status"]
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songs_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "moods"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          license_pdf_url: string | null
          license_tier_id: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          seller_amount: number
          seller_id: string
          song_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          license_pdf_url?: string | null
          license_tier_id: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          seller_amount: number
          seller_id: string
          song_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          license_pdf_url?: string | null
          license_tier_id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          seller_amount?: number
          seller_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_license_tier_id_fkey"
            columns: ["license_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payout_details: Json | null
          payout_method: string | null
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_details?: Json | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_details?: Json | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_play_count: { Args: { song_uuid: string }; Returns: undefined }
      increment_view_count: { Args: { song_uuid: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer"
      dispute_status: "open" | "in_review" | "resolved" | "closed"
      license_type: "personal" | "youtube" | "commercial" | "film" | "exclusive"
      song_status: "pending" | "approved" | "rejected"
      withdrawal_status: "pending" | "approved" | "processed" | "rejected"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "buyer"],
      dispute_status: ["open", "in_review", "resolved", "closed"],
      license_type: ["personal", "youtube", "commercial", "film", "exclusive"],
      song_status: ["pending", "approved", "rejected"],
      withdrawal_status: ["pending", "approved", "processed", "rejected"],
    },
  },
} as const
