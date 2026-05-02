import type { Profile } from "../lib/supabase";

export type Cooldown = {
  user_id: string;
  next_allowed_post_at: string | null;
};

export type Notice = {
  tone: "ok" | "warn" | "bad";
  text: string;
};

export type SearchResult = Profile & {
  friendship_status: "none" | "pending" | "accepted" | "incoming";
};

export type CaptureStep = "outside" | "selfie" | "caption";
