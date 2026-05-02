import { ArrowLeft, Flame, Loader2, Send } from "lucide-react";
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
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendError, setSendError] = useState("");

  const loadMessages = useCallback(async (showLoading = true) => {
    if (!supabase) return;
    if (showLoading) setLoadingMessages(true);
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
    setLoadingMessages(false);
  }, [friend.friend_id]);

  useEffect(() => {
    setMessages([]);
    setSendError("");
    loadMessages();
  }, [loadMessages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !body.trim()) return;
    const clean = body.trim();
    const optimisticMessage: Message = {
      id: `local-${crypto.randomUUID()}`,
      sender_id: "local-user",
      recipient_id: friend.friend_id,
      body: clean,
      created_at: new Date().toISOString(),
    };

    setBody("");
    setSendError("");
    setMessages((current) => [...current, optimisticMessage]);

    const { error } = await supabase
      .from("messages")
      .insert({ recipient_id: friend.friend_id, body: clean });

    if (error) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticMessage.id),
      );
      setSendError(error.message);
      return;
    }

    await supabase.rpc("refresh_message_streak", {
      other_user_id: friend.friend_id,
    });
    await loadMessages(false);
  }

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <button className="chat-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={17} />
        </button>
        <div className="friend-avatar">
          {friend.avatar_url ? <img alt="" src={friend.avatar_url} /> : friend.username.slice(0, 1)}
        </div>
        <div>
          <div className="chat-header-name">
            {friend.display_name || friend.username}
          </div>
          <div className="chat-header-status">
            <Flame size={12} /> {streak} day streak
          </div>
        </div>
      </div>
      <div className="message-list">
        <span className="chat-timestamp">Today</span>
        {loadingMessages ? (
          <p className="chat-empty">
            <Loader2 className="spin" size={16} /> Loading messages
          </p>
        ) : messages.length === 0 ? (
          <p className="chat-empty">No messages yet.</p>
        ) : (
          messages.map((message) => (
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
          ))
        )}
      </div>
      {sendError ? <p className="chat-send-error">{sendError}</p> : null}
      <form className="message-form" onSubmit={send}>
        <input
          placeholder="Message..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <button disabled={!body.trim()} type="submit" title="Send message">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
