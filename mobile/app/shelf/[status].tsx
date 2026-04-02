import { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { IGDBGame, GameLogRow, GameStatus } from '@gameboxd/lib';
import { getCoverUrl, getUserGameLogs } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { getGames } from '../../lib/igdb';
import { Colors } from '../../constants/colors';

const STATUS_LABELS: Record<GameStatus, string> = {
  completed: 'Completed',
  playing: 'Playing',
  want_to_play: 'Want to Play',
  dropped: 'Dropped',
};

export default function ShelfStatusScreen() {
  // userId param is passed when viewing another user's shelf from their profile
  const { status, userId: userIdParam } = useLocalSearchParams<{ status: string; userId?: string }>();
  const { userId: authUserId } = useAuthStore();
  // Prefer the param (another user's shelf) over own auth userId
  const effectiveUserId = userIdParam ?? authUserId;
  const router = useRouter();

  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [gamesMap, setGamesMap] = useState<Map<number, IGDBGame>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveUserId || !status) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const allLogs = await getUserGameLogs(supabase, effectiveUserId);
        const filtered = allLogs.filter((l) => l.status === status);
        if (cancelled) return;
        setLogs(filtered);
        const ids = filtered.map((l) => l.game_igdb_id);
        if (ids.length > 0) {
          const games = await getGames(ids);
          if (!cancelled) setGamesMap(new Map(games.map((g) => [g.id, g])));
        }
      } catch (e) {
        if (__DEV__) console.error('[ShelfStatus] load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [effectiveUserId, status]);

  const label = STATUS_LABELS[status as GameStatus] ?? status;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.count}>{logs.length}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(l) => l.id}
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
                {item.rating != null && (
                  <Text style={styles.gameRating}>{item.rating}/10</Text>
                )}
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
  title: { flex: 1, fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.textPrimary },
  count: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted },
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
  gameRating: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.accent, marginTop: 1 },
});
