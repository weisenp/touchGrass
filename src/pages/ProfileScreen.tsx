import { LogOut } from "lucide-react";
import { Avatar } from "../components/Avatar";
import type { PlantState, Profile } from "../lib/supabase";
import { supabase } from "../lib/supabase";

export function ProfileScreen({
  profile,
  plant,
  friendCount,
}: {
  profile: Profile;
  plant: PlantState | null;
  friendCount: number;
}) {
  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <div className="profile-screen">
      <section className="profile-hero">
        <Avatar profile={profile} large />
        <div className="profile-name-block">
          <h2>{profile.display_name || profile.username}</h2>
          <p>@{profile.username}</p>
        </div>
      </section>

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

      <section className="profile-card">
        <div>
          <span>growth</span>
          <strong>{plant?.growth_points ?? 0} pts</strong>
        </div>
        <div>
          <span>backup chance</span>
          <strong>{plant?.pity_points ?? 0}/3</strong>
        </div>
      </section>

      <button className="secondary-action" onClick={signOut} type="button">
        <LogOut size={18} />
        Sign out
      </button>
    </div>
  );
}
