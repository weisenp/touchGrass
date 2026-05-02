import { ArrowLeft, Flame, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { FriendRow, Message } from "../lib/supabase";
import { supabase } from "../lib/supabase";

export function ChatScreen({
  friend,
  onBack,
}: {
  friend: FriendRow;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [streak, setStreak] = useState(0);

  const loadMessages = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `sender_id.eq.${friend.friend_id},recipient_id.eq.${friend.friend_id}`,
      )
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data ?? []) as Message[]);

    const { data: streakData } = await supabase.rpc("get_message_streak", {
      other_user_id: friend.friend_id,
    });
    setStreak(Number(streakData ?? 0));
  }, [friend.friend_id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !body.trim()) return;
    await supabase
      .from("messages")
      .insert({ recipient_id: friend.friend_id, body: body.trim() });
    await supabase.rpc("refresh_message_streak", {
      other_user_id: friend.friend_id,
    });
    setBody("");
    await loadMessages();
  }

  return (
    <div className="chat-screen">
      <button className="back-row" onClick={onBack} type="button">
        <ArrowLeft size={18} />
        <span>
          <Flame size={16} /> {streak}
        </span>
      </button>
      <div className="message-list">
        {messages.map((message) => (
          <div
            className={
              message.sender_id === friend.friend_id
                ? "bubble theirs"
                : "bubble mine"
            }
            key={message.id}
          >
            {message.body}
          </div>
        ))}
      </div>
      <form className="message-form" onSubmit={send}>
        <input
          placeholder="message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <button type="submit">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
