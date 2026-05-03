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
    case
      when today_status.both_messaged_today
        and ms.last_qualifying_day = current_date then coalesce(ms.current_streak, 0)
      when today_status.both_messaged_today
        and ms.last_qualifying_day = current_date - 1 then coalesce(ms.current_streak, 0) + 1
      when today_status.both_messaged_today then 1
      when ms.last_qualifying_day is null then 0
      when ms.last_qualifying_day < current_date - 1 then 0
      else coalesce(ms.current_streak, 0)
    end,
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
    select
      exists (
        select 1
        from public.messages sent
        where sent.sender_id = auth.uid()
          and sent.recipient_id = friend_profile.id
          and sent.created_at::date = current_date
      )
      and exists (
        select 1
        from public.messages received
        where received.sender_id = friend_profile.id
          and received.recipient_id = auth.uid()
          and received.created_at::date = current_date
      ) as both_messaged_today
  ) today_status on true
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
