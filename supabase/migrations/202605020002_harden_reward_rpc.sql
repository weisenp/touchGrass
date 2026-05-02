revoke execute on function public.grant_post_reward(uuid, timestamptz) from public;
revoke execute on function public.grant_post_reward(uuid, timestamptz) from anon;
revoke execute on function public.grant_post_reward(uuid, timestamptz) from authenticated;
grant execute on function public.grant_post_reward(uuid, timestamptz) to service_role;
