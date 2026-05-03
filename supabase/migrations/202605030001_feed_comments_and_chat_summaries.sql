create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create index if not exists post_comments_post_created_idx
  on public.post_comments (post_id, created_at);

drop policy if exists "users view comments on visible posts" on public.post_comments;
create policy "users view comments on visible posts"
  on public.post_comments for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          p.author_id = auth.uid()
          or (
            p.verification_status = 'approved'
            and public.are_friends(auth.uid(), p.author_id)
          )
        )
    )
  );

drop policy if exists "users comment on visible posts" on public.post_comments;
create policy "users comment on visible posts"
  on public.post_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          p.author_id = auth.uid()
          or (
            p.verification_status = 'approved'
            and public.are_friends(auth.uid(), p.author_id)
          )
        )
    )
  );

drop policy if exists "users view friend plants" on public.plant_states;
create policy "users view friend plants"
  on public.plant_states for select
  to authenticated
  using (public.are_friends(auth.uid(), user_id));

drop function if exists public.list_friendships();
create function public.list_friendships()
returns table (
  friendship_id uuid,
  friend_id uuid,
  username text,
  display_name text,
  avatar_url text,
  status text,
  direction text,
  streak integer,
  last_message text,
  last_message_at timestamptz,
  last_message_from_friend boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    friend_profile.id,
    friend_profile.username,
    friend_profile.display_name,
    friend_profile.avatar_url,
    f.status,
    case
      when f.status = 'accepted' then 'friend'
      when f.recipient_id = auth.uid() then 'incoming'
      else 'outgoing'
    end,
    coalesce(ms.current_streak, 0),
    last_msg.body,
    last_msg.created_at,
    coalesce(last_msg.sender_id = friend_profile.id, false)
  from public.friendships f
  join public.profiles friend_profile
    on friend_profile.id = case
      when f.requester_id = auth.uid() then f.recipient_id
      else f.requester_id
    end
  left join public.message_streaks ms
    on ms.user_a = least(auth.uid(), friend_profile.id)
   and ms.user_b = greatest(auth.uid(), friend_profile.id)
  left join lateral (
    select m.body, m.created_at, m.sender_id
    from public.messages m
    where (m.sender_id = auth.uid() and m.recipient_id = friend_profile.id)
       or (m.sender_id = friend_profile.id and m.recipient_id = auth.uid())
    order by m.created_at desc
    limit 1
  ) last_msg on true
  where f.requester_id = auth.uid() or f.recipient_id = auth.uid()
  order by f.status desc, last_msg.created_at desc nulls last, friend_profile.username;
$$;
