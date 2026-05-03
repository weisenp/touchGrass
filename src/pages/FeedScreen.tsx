import { Send } from "lucide-react";
import type {
  CSSProperties,
  FormEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import type { Post, PostComment } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { compactTime } from "../lib/time";

export function FeedScreen({ posts }: { posts: Post[] }) {
  const [index, setIndex] = useState(0);
  const activePost = posts[index] ?? posts[0];

  useEffect(() => {
    if (index >= posts.length) setIndex(Math.max(posts.length - 1, 0));
  }, [index, posts.length]);

  function go(next: number) {
    if (posts.length === 0) return;
    setIndex((next + posts.length) % posts.length);
  }

  return (
    <div className="feed-flow">
      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          text="Post outside or add friends to build your feed."
        />
      ) : activePost ? (
        <>
          <PostItem
            key={activePost.id}
            post={activePost}
            onSwipe={(direction) => go(index + direction)}
          />
          <div className="feed-dots" aria-label="Post position">
            {posts.map((post, dotIndex) => (
              <button
                className={dotIndex === index ? "feed-dot active" : "feed-dot"}
                key={post.id}
                onClick={() => setIndex(dotIndex)}
                type="button"
                aria-label={`Go to post ${dotIndex + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PostItem({
  post,
  onSwipe,
}: {
  post: Post;
  onSwipe: (direction: -1 | 1) => void;
}) {
  const [comment, setComment] = useState("");
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    locked: boolean;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentError, setCommentError] = useState("");
  const initials = post.author?.username.slice(0, 1) ?? "?";
  const isDragging = dragStart !== null && Math.abs(dragOffset) > 6;
  const swipeDirection =
    dragOffset < -6 ? " swiping-next" : dragOffset > 6 ? " swiping-back" : "";

  const visibleComments = useMemo(
    () =>
      comments
        .slice()
        .sort(
          (left, right) =>
            new Date(left.created_at).getTime() -
            new Date(right.created_at).getTime(),
        ),
    [comments],
  );

  const loadComments = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("post_comments")
      .select("*, author:profiles(id, username, display_name, avatar_url)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      setCommentError(error.message);
      return;
    }

    setComments((data ?? []) as PostComment[]);
    setCommentError("");
  }, [post.id]);

  useEffect(() => {
    setComments([]);
    setCommentError("");
    loadComments();

    const timer = window.setInterval(loadComments, 5000);
    return () => window.clearInterval(timer);
  }, [loadComments]);

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    const clean = comment.trim();
    if (!supabase || !clean) return;
    setComment("");
    setCommentError("");

    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: post.id, body: clean });

    if (error) {
      setComment(clean);
      setCommentError(error.message);
      return;
    }

    await loadComments();
  }

  function startSwipe(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("input, textarea, button, a, .comments-panel")
    ) {
      return;
    }

    const locked =
      target instanceof Element && !!target.closest(".post-photo-frame");
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ x: event.clientX, y: event.clientY, locked });
    setDragOffset(0);
  }

  function moveSwipe(event: ReactPointerEvent<HTMLElement>) {
    if (!dragStart) return;
    const nextOffset = event.clientX - dragStart.x;
    const verticalOffset = event.clientY - dragStart.y;

    if (
      !dragStart.locked &&
      Math.abs(verticalOffset) > Math.abs(nextOffset) &&
      Math.abs(verticalOffset) > 10
    ) {
      setDragOffset(0);
      return;
    }

    setDragOffset(Math.max(-160, Math.min(160, nextOffset)));
  }

  function finishSwipe(event: ReactPointerEvent<HTMLElement>) {
    if (!dragStart) return;

    const distance = event.clientX - dragStart.x;
    const cardWidth = event.currentTarget.getBoundingClientRect().width;
    const threshold = Math.min(112, cardWidth * 0.24);

    setDragStart(null);
    setDragOffset(0);

    if (Math.abs(distance) < threshold) return;
    onSwipe(distance < 0 ? 1 : -1);
  }

  function cancelSwipe() {
    setDragStart(null);
    setDragOffset(0);
  }

  return (
    <article
      className={`post-item photo-card${isDragging ? " is-dragging" : ""}${swipeDirection}`}
      onPointerDown={startSwipe}
      onPointerMove={moveSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={cancelSwipe}
      style={
        {
          "--swipe-x": `${dragOffset}px`,
          "--swipe-rotate": `${dragOffset / 18}deg`,
          "--swipe-progress": Math.min(0.92, Math.abs(dragOffset) / 90),
        } as CSSProperties
      }
    >
      <div className="swipe-feedback left">Back</div>
      <div className="swipe-feedback right">Next</div>
      <div className="post-header">
        <div className="tiny-avatar">
          {post.author?.avatar_url ? (
            <img alt="" src={post.author.avatar_url} />
          ) : (
            initials
          )}
        </div>
        <div>
          <strong>
            {post.author?.display_name || post.author?.username || "friend"}
          </strong>
          <span>
            outside · {compactTime(post.created_at)} · level{" "}
            {post.plant_level ?? 1}
          </span>
        </div>
      </div>
      <div className="photo-frame post-photo-frame">
        <img alt="" src={post.outside_url} draggable={false} />
        <img
          alt=""
          className="selfie-chip"
          src={post.selfie_url}
          draggable={false}
        />
      </div>
      {post.caption ? (
        <p className="caption">
          <strong>{post.author?.username || "friend"}</strong>
          {post.caption}
        </p>
      ) : null}

      <section className="comments-panel" aria-label="Comments">
        <div className="comments-header">
          <strong>Comments</strong>
          <span>{visibleComments.length}</span>
        </div>
        <div className="comments-list">
          {visibleComments.length === 0 ? (
            <p className="comments-empty">No comments yet.</p>
          ) : (
            visibleComments.map((item) => (
              <div className="comment-row" key={item.id}>
                <span>{(item.author?.username ?? "?").slice(0, 1)}</span>
                <p>
                  <strong>
                    {item.author?.display_name ||
                      item.author?.username ||
                      "friend"}
                  </strong>
                  {item.body}
                </p>
              </div>
            ))
          )}
        </div>
        {commentError ? <p className="comment-error">{commentError}</p> : null}
        <form className="comment-form" onSubmit={submitComment}>
          <input
            className="comment-input"
            placeholder="Add a comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <button type="submit" title="Send comment">
            <Send size={16} />
          </button>
        </form>
      </section>
    </article>
  );
}
