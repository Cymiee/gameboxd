import type { SupabaseClient } from './client.js';
import type { Database } from './client.js';
import type { ListRow, ListGameRow, UserRow } from '../types/index.js';

export type ListWithMeta = ListRow & {
  user: Pick<UserRow, 'id' | 'username'>;
  gameCount: number;
  coverGameIds: number[];
};

export type ListWithGames = ListRow & {
  user: Pick<UserRow, 'id' | 'username'>;
  games: ListGameRow[];
};

export async function getPopularListsWithMeta(
  supabase: SupabaseClient<Database>,
  limit = 4,
): Promise<ListWithMeta[]> {
  const { data: lists, error } = await supabase
    .from('lists')
    .select('*')
    .order('likes', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!lists || lists.length === 0) return [];

  const listIds = lists.map((l) => l.id);
  const userIds = [...new Set(lists.map((l) => l.user_id))];

  const [gamesRes, usersRes] = await Promise.all([
    supabase.from('list_games').select('list_id, game_igdb_id, position').in('list_id', listIds).order('position'),
    supabase.from('users').select('id, username').in('id', userIds),
  ]);

  if (gamesRes.error) throw gamesRes.error;
  if (usersRes.error) throw usersRes.error;

  const gamesByList = new Map<string, number[]>();
  for (const g of gamesRes.data ?? []) {
    const arr = gamesByList.get(g.list_id) ?? [];
    arr.push(g.game_igdb_id);
    gamesByList.set(g.list_id, arr);
  }

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));

  return lists.map((list) => {
    const allIds = gamesByList.get(list.id) ?? [];
    return {
      ...list,
      user: userMap.get(list.user_id) ?? { id: list.user_id, username: 'unknown' },
      gameCount: allIds.length,
      coverGameIds: allIds.slice(0, 4),
    };
  });
}

export async function getListsByUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ListWithMeta[]> {
  const { data: lists, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  if (!lists || lists.length === 0) return [];

  const listIds = lists.map((l) => l.id);

  const [gamesRes, userRes] = await Promise.all([
    supabase.from('list_games').select('list_id, game_igdb_id, position').in('list_id', listIds).order('position'),
    supabase.from('users').select('id, username').eq('id', userId).single(),
  ]);
  if (gamesRes.error) throw gamesRes.error;
  if (userRes.error) throw userRes.error;

  const gamesByList = new Map<string, number[]>();
  for (const g of gamesRes.data ?? []) {
    const arr = gamesByList.get(g.list_id) ?? [];
    arr.push(g.game_igdb_id);
    gamesByList.set(g.list_id, arr);
  }

  return lists.map((list) => {
    const allIds = gamesByList.get(list.id) ?? [];
    return {
      ...list,
      user: userRes.data,
      gameCount: allIds.length,
      coverGameIds: allIds.slice(0, 4),
    };
  });
}

export async function getListWithGames(
  supabase: SupabaseClient<Database>,
  listId: string,
): Promise<ListWithGames> {
  const { data: list, error } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single();
  if (error) throw error;

  const [gamesRes, userRes] = await Promise.all([
    supabase.from('list_games').select('*').eq('list_id', listId).order('position'),
    supabase.from('users').select('id, username').eq('id', list.user_id).single(),
  ]);

  if (gamesRes.error) throw gamesRes.error;
  if (userRes.error) throw userRes.error;

  return {
    ...list,
    user: userRes.data,
    games: gamesRes.data ?? [],
  };
}

export async function createList(
  supabase: SupabaseClient<Database>,
  userId: string,
  title: string,
  description?: string,
): Promise<ListRow> {
  const insert: Database['public']['Tables']['lists']['Insert'] = {
    user_id: userId,
    title,
    ...(description != null ? { description } : {}),
  };
  const { data, error } = await supabase.from('lists').insert(insert).select().single();
  if (error) throw error;
  return data;
}

export async function updateList(
  supabase: SupabaseClient<Database>,
  listId: string,
  updates: { title?: string; description?: string | null },
): Promise<ListRow> {
  const patch: Database['public']['Tables']['lists']['Update'] = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;

  const { data, error } = await supabase
    .from('lists')
    .update(patch)
    .eq('id', listId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteList(
  supabase: SupabaseClient<Database>,
  listId: string,
): Promise<void> {
  // list_games rows cascade via the FK on delete.
  const { error } = await supabase.from('lists').delete().eq('id', listId);
  if (error) throw error;
}

export async function addGameToList(
  supabase: SupabaseClient<Database>,
  listId: string,
  gameIgdbId: number,
): Promise<ListGameRow> {
  // maybeSingle: an empty list has no rows, and .single() would error on that.
  const { data: existing, error: posError } = await supabase
    .from('list_games')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (posError) throw posError;

  const position = existing ? existing.position + 1 : 1;
  const { data, error } = await supabase
    .from('list_games')
    .insert({ list_id: listId, game_igdb_id: gameIgdbId, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeGameFromList(
  supabase: SupabaseClient<Database>,
  listId: string,
  gameIgdbId: number,
): Promise<void> {
  const { error } = await supabase
    .from('list_games')
    .delete()
    .eq('list_id', listId)
    .eq('game_igdb_id', gameIgdbId);
  if (error) throw error;
}
