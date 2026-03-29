import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Image, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { IGDBGame } from '@gameboxd/lib';
import { getCoverUrl } from '@gameboxd/lib';
import type { ActivityWithUser } from '@gameboxd/lib';
import { getFriendsActivity } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { useLogModal } from '../../store/logModal';
import { supabase } from '../../lib/supabase';
import { getTrendingGames, getNewReleases, getGames, getGamesByGenre } from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import HorizontalGameScroll from '../../components/HorizontalGameScroll';
import ActivityItem from '../../components/ActivityItem';
import { Colors } from '../../constants/colors';

const GENRE_PICKS = [
  { id: 12, name: 'RPG' },
  { id: 4,  name: 'Fighting' },
  { id: 32, name: 'Indie' },
  { id: 31, name: 'Adventure' },
];

export default function HomeScreen() {
  const { userId } = useAuthStore();
  const router = useRouter();
  const { open } = useLogModal();

  const [activity, setActivity] = useState<ActivityWithUser[]>([]);
  const [activityGames, setActivityGames] = useState<Map<number, IGDBGame>>(new Map());
  const [trending, setTrending] = useState<IGDBGame[]>([]);
  const [newReleases, setNewReleases] = useState<IGDBGame[]>([]);
  const [genreGames, setGenreGames] = useState<IGDBGame[][]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!userId) return;
    setLoadingActivity(true);
    try {
      const items = await getFriendsActivity(supabase, userId, 10);
      setActivity(items);
      const ids = [...new Set(items.map((i) => i.game_igdb_id))];
      if (ids.length > 0) {
        const games = await getGames(ids);
        setActivityGames(new Map(games.map((g) => [g.id, g])));
      }
    } catch {
      setActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }, [userId]);

  const loadFeed = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const [t, n, ...genreResults] = await Promise.all([
        getTrendingGames(10),
        getNewReleases(10),
        ...GENRE_PICKS.map((g) => getGamesByGenre(g.id, [], 1)),
      ]);
      setTrending(t);
      setNewReleases(n);
      setGenreGames(genreResults);
    } catch {
      // silent
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    loadActivity();
  }, [loadFeed, loadActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(), loadActivity()]);
    setRefreshing(false);
  }, [loadFeed, loadActivity]);

  function goToGame(game: IGDBGame) { router.push(`/game/${game.id}`); }

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        <View style={styles.section}>
          <Text style={[styles.label, styles.padH]}>TRENDING NOW</Text>
          <HorizontalGameScroll games={trending} loading={loadingTrending} onPress={goToGame} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, styles.padH]}>NEW RELEASES</Text>
          <HorizontalGameScroll games={newReleases} loading={loadingTrending} onPress={goToGame} />
        </View>

        {genreGames.some((g) => g.length > 0) && (
          <View style={styles.section}>
            <Text style={[styles.label, styles.padH]}>PICK YOUR GENRE</Text>
            <View style={styles.genreList}>
              {GENRE_PICKS.map((genre, idx) => {
                const game = genreGames[idx]?.[0];
                if (!game) return null;
                return (
                  <GenreCard
                    key={genre.id}
                    genreName={genre.name}
                    game={game}
                    onPress={() => router.push(`/game/${game.id}`)}
                    onQuickLog={() => {
                      if (userId) { open(game); } else { router.push('/auth'); }
                    }}
                  />
                );
              })}
            </View>
          </View>
        )}

        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text style={styles.label}>FRIENDS ACTIVITY</Text>
          {!userId ? (
            <Pressable onPress={() => router.push('/auth')} style={styles.signInBanner}>
              <Text style={styles.bannerText}>
                <Text style={{ color: Colors.accent }}>Sign in</Text>{' '}to see what your friends are playing
              </Text>
            </Pressable>
          ) : loadingActivity ? null : activity.length === 0 ? (
            <Text style={styles.emptyText}>No activity from friends yet.</Text>
          ) : (
            <View style={styles.padH}>
              {activity.map((item) => {
                const game = activityGames.get(item.game_igdb_id);
                const coverUrl = game?.cover ? getCoverUrl(game.cover.image_id, 'cover_small') : null;
                return (
                  <ActivityItem key={item.id} item={item} gameCover={coverUrl} gameName={game?.name} />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function GenreCard({
  genreName, game, onPress, onQuickLog,
}: {
  genreName: string;
  game: IGDBGame;
  onPress: () => void;
  onQuickLog: () => void;
}) {
  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
  return (
    <Pressable style={g.card} onPress={onPress}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={g.cover} resizeMode="cover" />
      ) : (
        <View style={[g.cover, { backgroundColor: Colors.surfaceElevated }]} />
      )}
      <View style={g.info}>
        <Text style={g.genreName}>{genreName.toUpperCase()}</Text>
        <Text style={g.title} numberOfLines={2}>{game.name}</Text>
        <Pressable style={g.btn} onPress={onQuickLog}>
          <Text style={g.btnText}>Want to Play</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const g = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 8,
  },
  cover: { width: 54, height: 72, borderRadius: 8 },
  info: { flex: 1, gap: 4 },
  genreName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textPrimary },
  btn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginTop: 2,
  },
  btnText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  section: { marginBottom: 16 },
  padH: { paddingHorizontal: 16 },
  genreList: { paddingHorizontal: 16 },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  signInBanner: {
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  bannerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, paddingHorizontal: 16 },
});
