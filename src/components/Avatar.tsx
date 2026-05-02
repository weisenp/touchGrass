import type { Profile } from "../lib/supabase";

export function Avatar({
  profile,
  large = false,
}: {
  profile: Profile;
  large?: boolean;
}) {
  return (
    <div className={large ? "avatar large" : "avatar"}>
      {profile.avatar_url ? (
        <img alt="" src={profile.avatar_url} />
      ) : (
        profile.username.slice(0, 1)
      )}
    </div>
  );
}
