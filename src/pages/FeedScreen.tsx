import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { FormEvent, TouchEvent, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import type { Post } from "../lib/supabase";
import { compactTime } from "../lib/time";

export function FeedScreen({ posts }: { posts: Post[] }) {
  const [index, setIndex] = useState(0);
  const activePost = posts[index] ?? posts[0];

  function go(next: number) {
    if (posts.length === 0) return;
    setIndex((next + posts.length) % posts.length);
  }

  return (
    <div className="feed-flow">
      {posts.length === 0 ? (
        <EmptyState
          title="No friend posts yet"
          text="Add friends to build your feed."
        />
      ) : activePost ? (
        <>
          <div className="feed-carousel-top">
            <span>{posts.length} friend posts</span>
            <div className="feed-arrows">
              <button onClick={() => go(index - 1)} type="button">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => go(index + 1)} type="button">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const initials = post.author?.username.slice(0, 1) ?? "?";

  const visibleComments = useMemo(
    () => comments.slice().sort((left, right) => left.createdAt - right.createdAt),
    [comments],
  );

  function submitComment(event: FormEvent) {
    event.preventDefault();
    const clean = comment.trim();
    if (!clean) return;
    setComments((current) => [
      ...current,
      { id: crypto.randomUUID(), name: "You", body: clean, createdAt: Date.now() },
    ]);
    setComment("");
  }

  function finishSwipe(event: TouchEvent<HTMLElement>) {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    setTouchStart(null);
    if (Math.abs(distance) < 44) return;
    onSwipe(distance < 0 ? 1 : -1);
  }

  return (
    <article
      className="post-item photo-card"
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={finishSwipe}
    >
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
          <span>outside · {compactTime(post.created_at)}</span>
        </div>
      </div>
      <div className="photo-frame post-photo-frame">
        <img alt="" src={post.outside_url} />
        <img alt="" className="selfie-chip" src={post.selfie_url} />
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
                <span>{item.name.slice(0, 1)}</span>
                <p>
                  <strong>{item.name}</strong>
                  {item.body}
                </p>
              </div>
            ))
          )}
        </div>
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

type CommentItem = {
  id: string;
  name: string;
  body: string;
  createdAt: number;
};
