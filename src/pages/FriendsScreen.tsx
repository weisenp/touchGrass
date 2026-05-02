import { Check, Search, Send, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import type { FriendRow } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { SearchResult } from "../types/app";

export function FriendsScreen({
  friends,
  onRefresh,
  onOpenChat,
}: {
  friends: FriendRow[];
  onRefresh: () => Promise<void>;
  onOpenChat: (friend: FriendRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const accepted = friends.filter((friend) => friend.direction === "friend");

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!supabase || query.trim().length < 2) return;
    const { data } = await supabase.rpc("search_profiles", { q: query.trim() });
    setResults((data ?? []) as SearchResult[]);
  }

  async function addFriend(id: string) {
    if (!supabase) return;
    await supabase.from("friendships").insert({ recipient_id: id });
    await onRefresh();
    setResults([]);
    setQuery("");
  }

  async function accept(friendshipId: string) {
    if (!supabase) return;
    await supabase
      .from("friendships")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", friendshipId);
    await onRefresh();
  }

  return (
    <div className="friends-screen">
      <form className="search-row" onSubmit={search}>
        <Search size={18} />
        <input
          placeholder="search username"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      {results.map((result) => (
        <div className="person-row" key={result.id}>
          <Avatar profile={result} />
          <div>
            <strong>{result.display_name || result.username}</strong>
            <span>@{result.username}</span>
          </div>
          <button
            disabled={result.friendship_status !== "none"}
            onClick={() => addFriend(result.id)}
            type="button"
          >
            {result.friendship_status === "none" ? (
              <UserPlus size={17} />
            ) : (
              result.friendship_status
            )}
          </button>
        </div>
      ))}

      {friends
        .filter((friend) => friend.direction === "incoming")
        .map((friend) => (
          <div className="person-row incoming" key={friend.friendship_id}>
            <Avatar
              profile={{
                id: friend.friend_id,
                username: friend.username,
                display_name: friend.display_name,
                avatar_url: friend.avatar_url,
              }}
            />
            <div>
              <strong>{friend.display_name || friend.username}</strong>
              <span>wants to add you</span>
            </div>
            <button onClick={() => accept(friend.friendship_id)} type="button">
              <Check size={17} />
            </button>
          </div>
        ))}

      {accepted.length === 0 ? (
        <EmptyState
          title="No friends yet"
          text="Search usernames to start a feed."
        />
      ) : (
        accepted.map((friend) => (
          <button
            className="friend-chat-row"
            key={friend.friend_id}
            onClick={() => onOpenChat(friend)}
            type="button"
          >
            <Avatar
              profile={{
                id: friend.friend_id,
                username: friend.username,
                display_name: friend.display_name,
                avatar_url: friend.avatar_url,
              }}
            />
            <div>
              <strong>{friend.display_name || friend.username}</strong>
              <span>@{friend.username}</span>
            </div>
            <Send size={17} />
          </button>
        ))
      )}
    </div>
  );
}
