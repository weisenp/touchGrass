import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, X } from "lucide-react";
import { BottomNav, type Tab } from "./components/BottomNav";
import {
  FriendRow,
  PlantState,
  Post,
  Profile,
  isSupabaseConfigured,
  supabase,
} from "./lib/supabase";
import { getPlantChoice, plantChoiceStorageKey } from "./lib/plants";
import { CaptureScreen } from "./pages/CaptureScreen";
import { ChatScreen } from "./pages/ChatScreen";
import { ConfigMissing } from "./pages/ConfigMissing";
import { FeedScreen } from "./pages/FeedScreen";
import { FriendsScreen } from "./pages/FriendsScreen";
import { LoginScreen } from "./pages/LoginScreen";
import { PlantScreen } from "./pages/PlantScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { UsernameScreen } from "./pages/UsernameScreen";
import type { Cooldown, Notice } from "./types/app";
// test
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plant, setPlant] = useState<PlantState | null>(null);
  const [cooldown, setCooldown] = useState<Cooldown | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [plantChoiceKey, setPlantChoiceKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [activeChat, setActiveChat] = useState<FriendRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const userId = session?.user.id;
  const plantChoice = getPlantChoice(plantChoiceKey);

  const loadCore = useCallback(async () => {
    if (!supabase || !userId) return;

    const [profileRes, plantRes, cooldownRes, postsRes, friendsRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("plant_states")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("post_cooldowns")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("posts")
          .select("*, author:profiles(id, username, display_name, avatar_url)")
          .eq("verification_status", "approved")
          .neq("author_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.rpc("list_friendships"),
      ]);

    if (profileRes.error) throw profileRes.error;
    if (plantRes.error) throw plantRes.error;
    if (cooldownRes.error) throw cooldownRes.error;
    if (postsRes.error) throw postsRes.error;
    if (friendsRes.error) throw friendsRes.error;

    setProfile(profileRes.data);
    setPlant(plantRes.data);
    setCooldown(cooldownRes.data);
    setPosts((postsRes.data ?? []) as Post[]);
    setFriends((friendsRes.data ?? []) as FriendRow[]);
  }, [userId]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
      setPlant(null);
      setCooldown(null);
      setPosts([]);
      setFriends([]);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    if (session.user.id) {
      setPlantChoiceKey(localStorage.getItem(plantChoiceStorageKey(session.user.id)));
    }
    setLoading(true);
    loadCore()
      .catch((error) => setNotice({ tone: "bad", text: error.message }))
      .finally(() => setLoading(false));
  }, [loadCore, session]);

  const readyToPost = useMemo(() => {
    if (!cooldown?.next_allowed_post_at) return true;
    return new Date(cooldown.next_allowed_post_at).getTime() <= Date.now();
  }, [cooldown]);

  if (!isSupabaseConfigured || !supabase) {
    return <ConfigMissing />;
  }

  if (loading) {
    return (
      <main className="phone-shell center">
        <Loader2 className="spin" />
      </main>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (!profile || !plantChoiceKey) {
    return (
      <UsernameScreen
        session={session}
        profile={profile}
        onPlantSelected={(nextPlantKey) => {
          localStorage.setItem(
            plantChoiceStorageKey(session.user.id),
            nextPlantKey,
          );
          setPlantChoiceKey(nextPlantKey);
        }}
        onReady={loadCore}
      />
    );
  }

  const refresh = async (message?: Notice) => {
    await loadCore();
    if (message) setNotice(message);
  };

  return (
    <main className="phone-shell">
      <header className="top-bar">
        <button
          className="avatar-button"
          onClick={() => setTab("profile")}
          type="button"
          title="Profile"
        >
          {profile.avatar_url ? (
            <img alt="" src={profile.avatar_url} />
          ) : (
            profile.username.slice(0, 1)
          )}
        </button>
        <div>
          <p className="eyebrow">TouchGrass</p>
          <h1>{screenTitle(tab, activeChat)}</h1>
        </div>
        <span aria-hidden="true" />
      </header>

      {notice && (
        <button
          className={`notice ${notice.tone}`}
          onClick={() => setNotice(null)}
          type="button"
        >
          <span>{notice.text}</span>
          <X size={16} />
        </button>
      )}

      <section className="screen-body">
        {tab === "feed" && <FeedScreen posts={posts} />}
        {tab === "plant" && plant && (
          <PlantScreen
            plant={plant}
            plantChoice={plantChoice}
            onWater={() => refresh()}
            setNotice={setNotice}
          />
        )}
        {tab === "capture" && (
          <CaptureScreen
            cooldown={cooldown}
            readyToPost={readyToPost}
            onPosted={() =>
              refresh({ tone: "ok", text: "Post approved. 3 waters added." })
            }
            onRejected={(text) => refresh({ tone: "warn", text })}
          />
        )}
        {tab === "friends" &&
          (activeChat ? (
            <ChatScreen
              friend={activeChat}
              onBack={() => setActiveChat(null)}
            />
          ) : (
            <FriendsScreen
              friends={friends}
              onRefresh={loadCore}
              onOpenChat={setActiveChat}
            />
          ))}
        {tab === "profile" && (
          <ProfileScreen
            profile={profile}
            plant={plant}
            friendCount={friends.length}
          />
        )}
      </section>

      <BottomNav
        active={tab}
        onChange={(next) => {
          setActiveChat(null);
          setTab(next);
        }}
      />
    </main>
  );
}

function screenTitle(tab: Tab, activeChat: FriendRow | null) {
  if (activeChat) return activeChat.display_name || activeChat.username;
  if (tab === "feed") return "Friend feed";
  if (tab === "plant") return "Your plant";
  if (tab === "capture") return "Post outside";
  if (tab === "friends") return "Friends";
  return "Profile";
}

export default App;
