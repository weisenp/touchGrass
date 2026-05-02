import { LogOut } from "lucide-react";
import { Avatar } from "../components/Avatar";
import type { PlantState, Profile } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { formatCountdown } from "../lib/time";
import type { Cooldown } from "../types/app";

export function ProfileScreen({
  profile,
  plant,
  cooldown,
  friendCount,
}: {
  profile: Profile;
  plant: PlantState | null;
  cooldown: Cooldown | null;
  friendCount: number;
}) {
  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <div className="profile-screen">
      <Avatar profile={profile} large />
      <h2>{profile.display_name || profile.username}</h2>
      <p>@{profile.username}</p>
      <div className="profile-stats">
        <span>
          <strong>{plant?.level ?? 1}</strong> level
        </span>
        <span>
          <strong>{plant?.water_count ?? 0}</strong> waters
        </span>
        <span>
          <strong>{friendCount}</strong> friends
        </span>
      </div>
      <div className="profile-id">{profile.id}</div>
      <div className="profile-id">
        post: {formatCountdown(cooldown?.next_allowed_post_at)}
      </div>
      <button className="secondary-action" onClick={signOut} type="button">
        <LogOut size={18} />
        Sign out
      </button>
    </div>
  );
}
