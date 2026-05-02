import { EmptyState } from "../components/EmptyState";
import type { Post } from "../lib/supabase";
import { compactTime } from "../lib/time";

export function FeedScreen({ posts }: { posts: Post[] }) {
  return (
    <div className="feed-flow">
      {posts.length === 0 ? (
        <EmptyState
          title="No friend posts yet"
          text="Add friends to build your feed."
        />
      ) : (
        posts.map((post) => <PostItem key={post.id} post={post} />)
      )}
    </div>
  );
}

function PostItem({ post }: { post: Post }) {
  return (
    <article className="post-item">
      <div className="post-header">
        <div className="tiny-avatar">
          {post.author?.avatar_url ? (
            <img alt="" src={post.author.avatar_url} />
          ) : (
            post.author?.username.slice(0, 1)
          )}
        </div>
        <div>
          <strong>
            {post.author?.display_name || post.author?.username || "friend"}
          </strong>
          <span>{compactTime(post.created_at)}</span>
        </div>
      </div>
      <div className="photo-frame">
        <img alt="" src={post.outside_url} />
        <img alt="" className="selfie-chip" src={post.selfie_url} />
      </div>
      {post.caption ? <p className="caption">{post.caption}</p> : null}
      <input className="comment-input" placeholder="comment" />
    </article>
  );
}
