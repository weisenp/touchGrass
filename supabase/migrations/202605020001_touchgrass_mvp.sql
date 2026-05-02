create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,18}$'),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> recipient_id)
);

create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  selfie_url text not null,
  outside_url text not null,
  caption text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected', 'needs_retry')),
  verification_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.plant_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level integer not null default 1 check (level > 0),
  growth_points integer not null default 0 check (growth_points >= 0),
  pity_points integer not null default 0 check (pity_points >= 0),
  water_count integer not null default 0 check (water_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table if not exists public.message_streaks (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  last_qualifying_day date,
  updated_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create table if not exists public.post_cooldowns (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_approved_post_at timestamptz,
  next_allowed_post_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.plant_states enable row level security;
alter table public.messages enable row level security;
alter table public.message_streaks enable row level security;
alter table public.post_cooldowns enable row level security;

create or replace function public.are_friends(left_user uuid, right_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = left_user and f.recipient_id = right_user)
        or (f.requester_id = right_user and f.recipient_id = left_user))
  );
$$;

create policy "profiles visible to authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "friendships visible to participants"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "users request friendships"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid() and recipient_id <> auth.uid());

create policy "recipients accept friendships"
  on public.friendships for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid() and status = 'accepted');

create policy "users view own and friend approved posts"
  on public.posts for select
  to authenticated
  using (
    author_id = auth.uid()
    or (verification_status = 'approved' and public.are_friends(auth.uid(), author_id))
  );

create policy "users view own plant"
  on public.plant_states for select
  to authenticated
  using (user_id = auth.uid());

create policy "users view own cooldown"
  on public.post_cooldowns for select
  to authenticated
  using (user_id = auth.uid());

create policy "participants view messages"
  on public.messages for select
  to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "friends send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.are_friends(auth.uid(), recipient_id)
  );

create policy "participants view streaks"
  on public.message_streaks for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

create or replace function public.initialize_profile_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.plant_states (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.post_cooldowns (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists initialize_profile_state_on_profile on public.profiles;
create trigger initialize_profile_state_on_profile
after insert on public.profiles
for each row execute function public.initialize_profile_state();

create or replace function public.list_friendships()
returns table (
  friendship_id uuid,
  friend_id uuid,
  username text,
  display_name text,
  avatar_url text,
  status text,
  direction text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end,
    p.username,
    p.display_name,
    p.avatar_url,
    f.status,
    case
      when f.status = 'accepted' then 'friend'
      when f.recipient_id = auth.uid() then 'incoming'
      else 'outgoing'
    end
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where f.requester_id = auth.uid() or f.recipient_id = auth.uid()
  order by f.status desc, p.username;
$$;

create or replace function public.search_profiles(q text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  friendship_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(
      (
        select case
          when f.status = 'accepted' then 'accepted'
          when f.recipient_id = auth.uid() then 'incoming'
          else 'pending'
        end
        from public.friendships f
        where (f.requester_id = auth.uid() and f.recipient_id = p.id)
           or (f.requester_id = p.id and f.recipient_id = auth.uid())
        limit 1
      ),
      'none'
    ) as friendship_status
  from public.profiles p
  where p.id <> auth.uid()
    and p.username ilike '%' || q || '%'
  order by p.username
  limit 12;
$$;

create or replace function public.water_plant()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_state public.plant_states%rowtype;
  threshold integer;
  grew boolean;
  leveled boolean := false;
  next_growth integer;
  next_level integer;
begin
  select * into current_state
  from public.plant_states
  where user_id = auth.uid()
  for update;

  if not found or current_state.water_count < 1 then
    raise exception 'No water available';
  end if;

  threshold := 4 + current_state.level * 2;
  grew := random() < 0.35 or current_state.pity_points >= 3;
  next_growth := current_state.growth_points + case when grew then 1 else 0 end;
  next_level := current_state.level;

  if next_growth >= threshold then
    next_level := next_level + 1;
    next_growth := next_growth - threshold;
    leveled := true;
  end if;

  update public.plant_states
  set
    water_count = water_count - 1,
    growth_points = next_growth,
    level = next_level,
    pity_points = case when grew then 0 else pity_points + 1 end,
    updated_at = now()
  where user_id = auth.uid();

  return jsonb_build_object('grew', grew, 'leveled_up', leveled);
end;
$$;

create or replace function public.grant_post_reward(target_user_id uuid, target_next_allowed_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.plant_states
  set water_count = water_count + 3,
      updated_at = now()
  where user_id = target_user_id;

  update public.post_cooldowns
  set last_approved_post_at = now(),
      next_allowed_post_at = target_next_allowed_at,
      updated_at = now()
  where user_id = target_user_id;
end;
$$;

create or replace function public.get_message_streak(other_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_streak, 0)
  from public.message_streaks
  where user_a = least(auth.uid(), other_user_id)
    and user_b = greatest(auth.uid(), other_user_id);
$$;

create or replace function public.refresh_message_streak(other_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  low_user uuid := least(auth.uid(), other_user_id);
  high_user uuid := greatest(auth.uid(), other_user_id);
  today date := current_date;
  last_day date;
  current_count integer;
  both_messaged_today boolean;
  next_count integer;
begin
  if not public.are_friends(me, other_user_id) then
    raise exception 'Users are not friends';
  end if;

  select exists (
    select 1 from public.messages
    where sender_id = me and recipient_id = other_user_id and created_at::date = today
  ) and exists (
    select 1 from public.messages
    where sender_id = other_user_id and recipient_id = me and created_at::date = today
  ) into both_messaged_today;

  insert into public.message_streaks (user_a, user_b)
  values (low_user, high_user)
  on conflict (user_a, user_b) do nothing;

  select last_qualifying_day, current_streak
  into last_day, current_count
  from public.message_streaks
  where user_a = low_user and user_b = high_user
  for update;

  if not both_messaged_today then
    return current_count;
  end if;

  if last_day = today then
    return current_count;
  elsif last_day = today - 1 then
    next_count := current_count + 1;
  else
    next_count := 1;
  end if;

  update public.message_streaks
  set current_streak = next_count,
      last_qualifying_day = today,
      updated_at = now()
  where user_a = low_user and user_b = high_user;

  return next_count;
end;
$$;

insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

create policy "users upload own post photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-photos'
    and (name like 'selfies/%' or name like 'outside/%')
  );

create policy "authenticated users read post photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'post-photos');
