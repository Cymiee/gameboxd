-- The initial lists migration (0004) gave list_games insert + delete policies
-- for the parent list's owner, and public select — but no update policy. Add it
-- so a list owner can update their own list_games rows (needed once games can
-- be reordered; append/remove work without it). Additive only.

create policy "list owner update" on public.list_games for update
  using (
    auth.uid() = (select user_id from public.lists where id = list_id)
  );
