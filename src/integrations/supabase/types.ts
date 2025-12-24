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
      abuse_flags: {
        Row: {
          action_taken: string | null
          created_at: string | null
          details: Json | null
          device_fingerprint: string | null
          flag_type: string
          id: string
          ip_address: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          details?: Json | null
          device_fingerprint?: string | null
          flag_type: string
          id?: string
          ip_address?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          details?: Json | null
          device_fingerprint?: string | null
          flag_type?: string
          id?: string
          ip_address?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_bug_reports: {
        Row: {
          affected_section: string
          assignee_id: string | null
          created_at: string | null
          description: string
          id: string
          internal_notes: Json | null
          logs: Json | null
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          screenshots: Json | null
          severity: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          affected_section: string
          assignee_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          internal_notes?: Json | null
          logs?: Json | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshots?: Json | null
          severity?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          affected_section?: string
          assignee_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          internal_notes?: Json | null
          logs?: Json | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshots?: Json | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_bug_reports_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_bug_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_valid: boolean | null
          last_access: string | null
          play_count: number | null
          session_token: string
          song_id: string | null
          started_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          last_access?: string | null
          play_count?: number | null
          session_token: string
          song_id?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          last_access?: string | null
          play_count?: number | null
          session_token?: string
          song_id?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_watermarks: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          song_id: string
          transaction_id: string | null
          watermark_code: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          song_id: string
          transaction_id?: string | null
          watermark_code: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          song_id?: string
          transaction_id?: string | null
          watermark_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_watermarks_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_watermarks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_carts: {
        Row: {
          buyer_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          base_price: number
          created_at: string
          final_price: number
          id: string
          is_exclusive: boolean | null
          license_tier_id: string
          platform_commission: number
          seller_id: string | null
          song_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          final_price?: number
          id?: string
          is_exclusive?: boolean | null
          license_tier_id: string
          platform_commission?: number
          seller_id?: string | null
          song_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_price?: number
          created_at?: string
          final_price?: number
          id?: string
          is_exclusive?: boolean | null
          license_tier_id?: string
          platform_commission?: number
          seller_id?: string | null
          song_id?: string
          updated_at?: string | null
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
      checkout_sessions: {
        Row: {
          acknowledgment_accepted: boolean | null
          acknowledgment_timestamp: string | null
          buyer_id: string
          cart_snapshot: Json
          cashfree_order_id: string | null
          cashfree_payment_session_id: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          platform_fee: number
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          user_agent: string | null
        }
        Insert: {
          acknowledgment_accepted?: boolean | null
          acknowledgment_timestamp?: string | null
          buyer_id: string
          cart_snapshot: Json
          cashfree_order_id?: string | null
          cashfree_payment_session_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          platform_fee: number
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          user_agent?: string | null
        }
        Update: {
          acknowledgment_accepted?: boolean | null
          acknowledgment_timestamp?: string | null
          buyer_id?: string
          cart_snapshot?: Json
          cashfree_order_id?: string | null
          cashfree_payment_session_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          platform_fee?: number
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      cms_content: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          content_html: string | null
          content_json: Json
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          no_index: boolean | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published_at: string | null
          scheduled_at: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          content_html?: string | null
          content_json?: Json
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          content_html?: string | null
          content_json?: Json
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_content_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          public_url: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          public_url: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          public_url?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "disputes_against_profiles_fkey"
            columns: ["against"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_profiles_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      download_access: {
        Row: {
          access_type: string | null
          buyer_id: string
          expires_at: string | null
          granted_at: string | null
          id: string
          is_active: boolean | null
          order_item_id: string
          song_id: string
        }
        Insert: {
          access_type?: string | null
          buyer_id: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          is_active?: boolean | null
          order_item_id: string
          song_id: string
        }
        Update: {
          access_type?: string | null
          buyer_id?: string
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          is_active?: boolean | null
          order_item_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_access_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_access_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      exclusive_reservations: {
        Row: {
          buyer_id: string
          expires_at: string
          id: string
          license_tier_id: string | null
          released_at: string | null
          released_reason: string | null
          reserved_at: string | null
          song_id: string
          status: string | null
        }
        Insert: {
          buyer_id: string
          expires_at: string
          id?: string
          license_tier_id?: string | null
          released_at?: string | null
          released_reason?: string | null
          reserved_at?: string | null
          song_id: string
          status?: string | null
        }
        Update: {
          buyer_id?: string
          expires_at?: string
          id?: string
          license_tier_id?: string | null
          released_at?: string | null
          released_reason?: string | null
          reserved_at?: string | null
          song_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exclusive_reservations_license_tier_id_fkey"
            columns: ["license_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exclusive_reservations_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
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
      featured_content: {
        Row: {
          content_id: string | null
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          starts_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          starts_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
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
      license_documents: {
        Row: {
          buyer_id: string
          buyer_name: string
          created_at: string | null
          document_hash: string
          id: string
          license_number: string
          license_type: Database["public"]["Enums"]["license_type"]
          metadata: Json | null
          order_item_id: string | null
          pdf_storage_path: string
          price: number
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          seller_id: string
          seller_name: string
          song_id: string
          song_title: string
          status: string | null
          template_id: string | null
          template_version: number
        }
        Insert: {
          buyer_id: string
          buyer_name: string
          created_at?: string | null
          document_hash: string
          id?: string
          license_number: string
          license_type: Database["public"]["Enums"]["license_type"]
          metadata?: Json | null
          order_item_id?: string | null
          pdf_storage_path: string
          price: number
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          seller_id: string
          seller_name: string
          song_id: string
          song_title: string
          status?: string | null
          template_id?: string | null
          template_version: number
        }
        Update: {
          buyer_id?: string
          buyer_name?: string
          created_at?: string | null
          document_hash?: string
          id?: string
          license_number?: string
          license_type?: Database["public"]["Enums"]["license_type"]
          metadata?: Json | null
          order_item_id?: string | null
          pdf_storage_path?: string
          price?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          seller_id?: string
          seller_name?: string
          song_id?: string
          song_title?: string
          status?: string | null
          template_id?: string | null
          template_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "license_documents_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_documents_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "license_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      license_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          governing_law: string | null
          id: string
          indemnification_clause: string
          is_active: boolean | null
          legal_clauses: Json
          license_type: Database["public"]["Enums"]["license_type"]
          ownership_clause: string
          permitted_uses: string[]
          platform_disclaimer: string
          prohibited_uses: string[]
          template_name: string
          termination_conditions: string
          updated_at: string | null
          version: number
          warranty_disclaimer: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          governing_law?: string | null
          id?: string
          indemnification_clause: string
          is_active?: boolean | null
          legal_clauses?: Json
          license_type: Database["public"]["Enums"]["license_type"]
          ownership_clause: string
          permitted_uses?: string[]
          platform_disclaimer: string
          prohibited_uses?: string[]
          template_name: string
          termination_conditions: string
          updated_at?: string | null
          version?: number
          warranty_disclaimer: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          governing_law?: string | null
          id?: string
          indemnification_clause?: string
          is_active?: boolean | null
          legal_clauses?: Json
          license_type?: Database["public"]["Enums"]["license_type"]
          ownership_clause?: string
          permitted_uses?: string[]
          platform_disclaimer?: string
          prohibited_uses?: string[]
          template_name?: string
          termination_conditions?: string
          updated_at?: string | null
          version?: number
          warranty_disclaimer?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      order_items: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          download_count: number | null
          id: string
          is_exclusive: boolean | null
          license_pdf_url: string | null
          license_tier_id: string
          license_type: string
          max_downloads: number | null
          order_id: string
          price: number
          seller_amount: number
          seller_id: string
          song_id: string
          watermark_code: string | null
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          download_count?: number | null
          id?: string
          is_exclusive?: boolean | null
          license_pdf_url?: string | null
          license_tier_id: string
          license_type: string
          max_downloads?: number | null
          order_id: string
          price: number
          seller_amount: number
          seller_id: string
          song_id: string
          watermark_code?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          download_count?: number | null
          id?: string
          is_exclusive?: boolean | null
          license_pdf_url?: string | null
          license_tier_id?: string
          license_type?: string
          max_downloads?: number | null
          order_id?: string
          price?: number
          seller_amount?: number
          seller_id?: string
          song_id?: string
          watermark_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_license_tier_id_fkey"
            columns: ["license_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          cashfree_order_id: string | null
          cashfree_payment_id: string | null
          checkout_session_id: string | null
          created_at: string | null
          currency: string | null
          fulfilled_at: string | null
          fulfillment_status: string | null
          id: string
          order_number: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          platform_fee: number
          subtotal: number
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          buyer_id: string
          cashfree_order_id?: string | null
          cashfree_payment_id?: string | null
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string | null
          id?: string
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee: number
          subtotal: number
          tax_amount?: number | null
          total_amount: number
        }
        Update: {
          buyer_id?: string
          cashfree_order_id?: string | null
          cashfree_payment_id?: string | null
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string | null
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee?: number
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      piracy_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          evidence: Json | null
          id: string
          notes: string | null
          platform: string | null
          reported_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          song_id: string
          status: string | null
          watermark_code: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          evidence?: Json | null
          id?: string
          notes?: string | null
          platform?: string | null
          reported_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          song_id: string
          status?: string | null
          watermark_code?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          evidence?: Json | null
          id?: string
          notes?: string | null
          platform?: string | null
          reported_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          song_id?: string
          status?: string | null
          watermark_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "piracy_reports_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
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
          account_status: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          fraud_flags: Json | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          kyc_documents: Json | null
          kyc_status: string | null
          social_links: Json | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
          upload_limit: number | null
          website: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          fraud_flags?: Json | null
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          social_links?: Json | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          upload_limit?: number | null
          website?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          fraud_flags?: Json | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          social_links?: Json | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          upload_limit?: number | null
          website?: string | null
        }
        Relationships: []
      }
      seller_tier_history: {
        Row: {
          created_at: string | null
          id: string
          lifetime_sales_at_change: number | null
          new_tier: number
          notes: string | null
          previous_tier: number | null
          seller_id: string
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_sales_at_change?: number | null
          new_tier: number
          notes?: string | null
          previous_tier?: number | null
          seller_id: string
          trigger_type: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_sales_at_change?: number | null
          new_tier?: number
          notes?: string | null
          previous_tier?: number | null
          seller_id?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_tier_history_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_tier_history_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_tier_status: {
        Row: {
          created_at: string | null
          current_tier_level: number
          frozen_at: string | null
          frozen_by: string | null
          frozen_reason: string | null
          id: string
          last_tier_check: string | null
          lifetime_sales_amount: number
          seller_id: string
          tier_frozen: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_tier_level?: number
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          last_tier_check?: string | null
          lifetime_sales_amount?: number
          seller_id: string
          tier_frozen?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_tier_level?: number
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          last_tier_check?: string | null
          lifetime_sales_amount?: number
          seller_id?: string
          tier_frozen?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_tier_status_current_tier_level_fkey"
            columns: ["current_tier_level"]
            isOneToOne: false
            referencedRelation: "seller_tiers"
            referencedColumns: ["tier_level"]
          },
          {
            foreignKeyName: "seller_tier_status_frozen_by_fkey"
            columns: ["frozen_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_tier_status_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_tiers: {
        Row: {
          badge_color: string | null
          badge_label: string
          created_at: string | null
          description: string | null
          id: string
          max_price_lyrics_only: number | null
          max_price_with_audio: number | null
          min_lifetime_sales: number
          name: string
          tier_level: number
          updated_at: string | null
        }
        Insert: {
          badge_color?: string | null
          badge_label: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_price_lyrics_only?: number | null
          max_price_with_audio?: number | null
          min_lifetime_sales?: number
          name: string
          tier_level: number
          updated_at?: string | null
        }
        Update: {
          badge_color?: string | null
          badge_label?: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_price_lyrics_only?: number | null
          max_price_with_audio?: number | null
          min_lifetime_sales?: number
          name?: string
          tier_level?: number
          updated_at?: string | null
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
          exclusive_buyer_id: string | null
          exclusive_sold: boolean | null
          exclusive_sold_at: string | null
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
          exclusive_buyer_id?: string | null
          exclusive_sold?: boolean | null
          exclusive_sold_at?: string | null
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
          exclusive_buyer_id?: string | null
          exclusive_sold?: boolean | null
          exclusive_sold_at?: string | null
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
          {
            foreignKeyName: "songs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_error_logs: {
        Row: {
          action_performed: string | null
          browser_info: Json | null
          context: Json | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          linked_bug_report_id: string | null
          module: string
          resolved: boolean | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          action_performed?: string | null
          browser_info?: Json | null
          context?: Json | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          linked_bug_report_id?: string | null
          module: string
          resolved?: boolean | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          action_performed?: string | null
          browser_info?: Json | null
          context?: Json | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          linked_bug_report_id?: string | null
          module?: string
          resolved?: boolean | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_error_logs_linked_bug_report_id_fkey"
            columns: ["linked_bug_report_id"]
            isOneToOne: false
            referencedRelation: "admin_bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_abuse_flags: {
        Row: {
          action_taken: string | null
          buyer_id: string | null
          created_at: string | null
          details: Json | null
          flag_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          seller_id: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          action_taken?: string | null
          buyer_id?: string | null
          created_at?: string | null
          details?: Json | null
          flag_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          action_taken?: string | null
          buyer_id?: string | null
          created_at?: string | null
          details?: Json | null
          flag_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_abuse_flags_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_abuse_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_abuse_flags_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_abuse_flags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
            foreignKeyName: "transactions_buyer_id_profiles_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_license_tier_id_fkey"
            columns: ["license_tier_id"]
            isOneToOne: false
            referencedRelation: "license_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_profiles_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_freeze_seller_tier: {
        Args: {
          p_admin_id?: string
          p_freeze: boolean
          p_reason?: string
          p_seller_id: string
        }
        Returns: undefined
      }
      calculate_and_update_tier: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
      check_self_purchase: {
        Args: { p_buyer_id: string; p_song_id: string }
        Returns: Json
      }
      generate_order_number: { Args: never; Returns: string }
      get_seller_tier: {
        Args: { p_seller_id: string }
        Returns: {
          amount_to_next_tier: number
          badge_color: string
          badge_label: string
          frozen_reason: string
          is_frozen: boolean
          lifetime_sales: number
          max_price_lyrics_only: number
          max_price_with_audio: number
          next_tier_threshold: number
          tier_level: number
          tier_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_play_count: { Args: { song_uuid: string }; Returns: undefined }
      increment_view_count: { Args: { song_uuid: string }; Returns: undefined }
      validate_song_price: {
        Args: { p_has_audio: boolean; p_price: number; p_seller_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer"
      content_status: "draft" | "published" | "scheduled" | "archived"
      content_type: "page" | "post"
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
      content_status: ["draft", "published", "scheduled", "archived"],
      content_type: ["page", "post"],
      dispute_status: ["open", "in_review", "resolved", "closed"],
      license_type: ["personal", "youtube", "commercial", "film", "exclusive"],
      song_status: ["pending", "approved", "rejected"],
      withdrawal_status: ["pending", "approved", "processed", "rejected"],
    },
  },
} as const
