import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Post = {
  id: string;
  author_id: string;
  selfie_url: string;
  outside_url: string;
  caption: string | null;
  verification_status: "pending" | "approved" | "rejected" | "needs_retry";
  created_at: string;
  author?: Profile;
};

export type PlantState = {
  user_id: string;
  level: number;
  growth_points: number;
  pity_points: number;
  water_count: number;
  updated_at: string;
};

export type FriendRow = {
  friendship_id: string;
  friend_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | "friend";
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};
