import { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { IGDBGame } from '@gameboxd/lib';
import { getCoverUrl, getListWithGames } from '@gameboxd/lib';
import type { ListWithGames } from '@gameboxd/lib';
import { supabase } from '../../lib/supabase';
import { getGames } from '../../lib/igdb';
import { Colors } from '../../constants/colors';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [list, setList] = useState<ListWithGames | null>(null);
  const [gamesMap, setGamesMap] = useState<Map<number, IGDBGame>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const listData = await getListWithGames(supabase, id);
        if (cancelled) return;
        setList(listData);
        const ids = listData.games.map((g) => g.game_igdb_id);
        if (ids.length > 0) {
          const games = await getGames(ids);
          if (!cancelled) setGamesMap(new Map(games.map((g) => [g.id, g])));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load list');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {list?.title ?? 'List'}
          </Text>
          {list && (
            <Text style={styles.meta}>
              by {list.user.username} · {list.games.length} game{list.games.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.centred}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : list && list.games.length === 0 ? (
        <View style={styles.centred}>
          <Text style={styles.emptyText}>No games in this list yet.</Text>
        </View>
      ) : (
        <FlatList
          data={list?.games ?? []}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const game = gamesMap.get(item.game_igdb_id);
            const coverUrl = game?.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
            return (
              <Pressable
                style={styles.cell}
                onPress={() => router.push(`/game/${item.game_igdb_id}`)}
              >
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
                ) : (
                  <View style={[styles.cover, { backgroundColor: Colors.surfaceElevated }]} />
                )}
                <Text style={styles.gameTitle} numberOfLines={1}>{game?.name ?? ''}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: { fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.textPrimary },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.danger },
  grid: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { gap: 8, marginBottom: 8 },
  cell: { flex: 1 },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  gameTitle: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#666', marginTop: 4 },
});
