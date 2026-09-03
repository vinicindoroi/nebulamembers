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
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          target: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          target?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          target?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          id: string
          image_url: string | null
          lesson_id: string | null
          post_id: string
          status: string
          user_id: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lesson_id?: string | null
          post_id: string
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lesson_id?: string | null
          post_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_stories: {
        Row: {
          content: string
          created_at: string
          gradient: string
          id: string
          image_url: string | null
          user_avatar: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          gradient: string
          id?: string
          image_url?: string | null
          user_avatar: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          gradient?: string
          id?: string
          image_url?: string | null
          user_avatar?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          max_uses: number | null
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          max_uses?: number | null
          uses?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          max_uses?: number | null
          uses?: number
          value?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          access_level: string
          category_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          gradient_from: string | null
          gradient_to: string | null
          id: string
          is_premium: boolean
          offer_id: string | null
          price: number | null
          status: string
          tag: string | null
          title: string
        }
        Insert: {
          access_level?: string
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string
          is_premium?: boolean
          offer_id?: string | null
          price?: number | null
          status?: string
          tag?: string | null
          title: string
        }
        Update: {
          access_level?: string
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string
          is_premium?: boolean
          offer_id?: string | null
          price?: number | null
          status?: string
          tag?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          mentorship: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          mentorship: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mentorship?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      forum_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "forum_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_service: boolean
          pinned: boolean
          service_price: string | null
          title: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_service?: boolean
          pinned?: boolean
          service_price?: string | null
          title: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_service?: boolean
          pinned?: boolean
          service_price?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_tags: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_type: string
          fbclid: string | null
          funnel_id: string | null
          gclid: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          node_id: string
          page_url: string | null
          referrer: string | null
          session_id: string | null
          ttclid: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_type: string
          fbclid?: string | null
          funnel_id?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          node_id: string
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_type?: string
          fbclid?: string | null
          funnel_id?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          node_id?: string
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      funnels: {
        Row: {
          created_at: string
          description: string | null
          edges: Json | null
          folder_id: string | null
          funnel_type: string
          id: string
          name: string
          nodes: Json | null
          organization_id: string | null
          tracking_token: string | null
          updated_at: string
          user_id: string
          viewport: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json | null
          folder_id?: string | null
          funnel_type?: string
          id?: string
          name: string
          nodes?: Json | null
          organization_id?: string | null
          tracking_token?: string | null
          updated_at?: string
          user_id: string
          viewport?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json | null
          folder_id?: string | null
          funnel_type?: string
          id?: string
          name?: string
          nodes?: Json | null
          organization_id?: string | null
          tracking_token?: string | null
          updated_at?: string
          user_id?: string
          viewport?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "funnels_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "funnel_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          created_at: string
          credits_used: number
          id: string
          model_id: string | null
          payload: Json | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          id?: string
          model_id?: string | null
          payload?: Json | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          id?: string
          model_id?: string | null
          payload?: Json | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          id: string
          logo_url: string
          name: string
          primary_color: string
          restrict_to_leads: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          logo_url?: string
          name?: string
          primary_color?: string
          restrict_to_leads?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          logo_url?: string
          name?: string
          primary_color?: string
          restrict_to_leads?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      lesson_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          lesson_id: string
          mime_type: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          lesson_id: string
          mime_type?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          lesson_id?: string
          mime_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_bookmarks: {
        Row: {
          created_at: string
          id: string
          label: string | null
          lesson_id: string
          time_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          lesson_id: string
          time_seconds: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          lesson_id?: string
          time_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_bookmarks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          resume_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          resume_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          resume_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_video_progress: {
        Row: {
          current_time: number
          duration: number | null
          lesson_id: string
          playback_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_time?: number
          duration?: number | null
          lesson_id: string
          playback_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_time?: number
          duration?: number | null
          lesson_id?: string
          playback_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_video_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          allow_download: boolean | null
          autoplay_next: boolean | null
          captions_url: string | null
          chapters: Json | null
          content: string | null
          course_id: string
          created_at: string
          default_playback_rate: number | null
          description: string | null
          duration: number | null
          duration_min: number | null
          id: string
          is_free: boolean
          is_premium: boolean
          module_id: string | null
          offer_id: string | null
          position: number
          poster_url: string | null
          title: string
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          allow_download?: boolean | null
          autoplay_next?: boolean | null
          captions_url?: string | null
          chapters?: Json | null
          content?: string | null
          course_id: string
          created_at?: string
          default_playback_rate?: number | null
          description?: string | null
          duration?: number | null
          duration_min?: number | null
          id?: string
          is_free?: boolean
          is_premium?: boolean
          module_id?: string | null
          offer_id?: string | null
          position?: number
          poster_url?: string | null
          title: string
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          allow_download?: boolean | null
          autoplay_next?: boolean | null
          captions_url?: string | null
          chapters?: Json | null
          content?: string | null
          course_id?: string
          created_at?: string
          default_playback_rate?: number | null
          description?: string | null
          duration?: number | null
          duration_min?: number | null
          id?: string
          is_free?: boolean
          is_premium?: boolean
          module_id?: string | null
          offer_id?: string | null
          position?: number
          poster_url?: string | null
          title?: string
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_premium: boolean
          offer_id: string | null
          position: number
          title: string
        }
        Insert: {
          course_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          offer_id?: string | null
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          offer_id?: string | null
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          recipient_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          audience?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          audience?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          badge_text: string | null
          checkout_url: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          badge_text?: string | null
          checkout_url?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
        }
        Update: {
          active?: boolean
          badge_text?: string | null
          checkout_url?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      player_settings: {
        Row: {
          accent_color: string
          autoplay_next: boolean
          block_devtools: boolean
          block_download: boolean
          block_right_click: boolean
          bookmarks_enabled: boolean
          controls_bg: string
          created_at: string
          id: string
          logo_url: string | null
          notes_enabled: boolean
          progress_color: string
          resume_playback: boolean
          speed_control: boolean
          updated_at: string
          watermark_enabled: boolean
          watermark_opacity: number
          watermark_position: string
          watermark_text: string | null
        }
        Insert: {
          accent_color?: string
          autoplay_next?: boolean
          block_devtools?: boolean
          block_download?: boolean
          block_right_click?: boolean
          bookmarks_enabled?: boolean
          controls_bg?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          notes_enabled?: boolean
          progress_color?: string
          resume_playback?: boolean
          speed_control?: boolean
          updated_at?: string
          watermark_enabled?: boolean
          watermark_opacity?: number
          watermark_position?: string
          watermark_text?: string | null
        }
        Update: {
          accent_color?: string
          autoplay_next?: boolean
          block_devtools?: boolean
          block_download?: boolean
          block_right_click?: boolean
          bookmarks_enabled?: boolean
          controls_bg?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          notes_enabled?: boolean
          progress_color?: string
          resume_playback?: boolean
          speed_control?: boolean
          updated_at?: string
          watermark_enabled?: boolean
          watermark_opacity?: number
          watermark_position?: string
          watermark_text?: string | null
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      private_settings: {
        Row: {
          api_key: string
          deploy_hook_url: string
          gateway: string
          id: string
          min_password_len: number
          public_key: string
          require_2fa_admins: boolean
          sender: string
          smtp_host: string
          updated_at: string
          webhook_url: string
        }
        Insert: {
          api_key?: string
          deploy_hook_url?: string
          gateway?: string
          id?: string
          min_password_len?: number
          public_key?: string
          require_2fa_admins?: boolean
          sender?: string
          smtp_host?: string
          updated_at?: string
          webhook_url?: string
        }
        Update: {
          api_key?: string
          deploy_hook_url?: string
          gateway?: string
          id?: string
          min_password_len?: number
          public_key?: string
          require_2fa_admins?: boolean
          sender?: string
          smtp_host?: string
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          instagram: string | null
          last_seen_at: string | null
          location: string | null
          phone: string | null
          plan: string | null
          status: string
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          last_seen_at?: string | null
          location?: string | null
          phone?: string | null
          plan?: string | null
          status?: string
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          last_seen_at?: string | null
          location?: string | null
          phone?: string | null
          plan?: string | null
          status?: string
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          post_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          post_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          plan: string
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          plan: string
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          plan?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          color: string | null
          content: string
          created_at: string
          id: string
          lesson_id: string | null
          pinned: boolean
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          pinned?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          pinned?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_profiles: {
        Args: never
        Returns: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          instagram: string | null
          last_seen_at: string | null
          location: string | null
          phone: string | null
          plan: string | null
          status: string
          updated_at: string
          xp: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      check_email_in_leads: { Args: { check_email: string }; Returns: boolean }
      generate_tracking_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "member"],
    },
  },
} as const
