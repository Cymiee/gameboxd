import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import type { IGDBGame, GameLogRow, GameStatus } from '@gameboxd/lib';
import { getCoverUrl, getUserGameLogs } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { getGames } from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import Skeleton from '../../components/Skeleton';
import StarRating from '../../components/StarRating';
import { ratingToStars } from '../../utils/rating';
import { Colors } from '../../constants/colors';

const STATUS_SECTIONS: { status: GameStatus; label: string; color: string }[] = [
  { status: 'completed', label: 'Completed', color: '#4ade80' },
  { status: 'playing', label: 'Playing', color: '#60a5fa' },
  { status: 'want_to_play', label: 'Want to Play', color: '#fbbf24' },
  { status: 'dropped', label: 'Dropped', color: '#f87171' },
];

type Stats = {
  genreBreakdown: { genre: string; count: number }[];
  topDeveloper: string | null;
  avgRatingByStatus: { status: string; avg: number }[];
};

export default function ShelfScreen() {
  const { userId } = useAuthStore();
  const router = useRouter();

  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [gamesMap, setGamesMap] = useState<Map<number, IGDBGame>>(new Map());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const userLogs = await getUserGameLogs(supabase, userId);
      setLogs(userLogs);

      const ids = [...new Set(userLogs.map((l) => l.game_igdb_id))];
      let localMap = new Map<number, IGDBGame>();
      if (ids.length > 0) {
        const games = await getGames(ids);
        localMap = new Map(games.map((g) => [g.id, g]));
        setGamesMap(localMap);
      }

      // Genre breakdown
      const genreCount = new Map<string, number>();
      for (const log of userLogs) {
        const game = localMap.get(log.game_igdb_id);
        for (const g of game?.genres ?? []) {
          genreCount.set(g.name, (genreCount.get(g.name) ?? 0) + 1);
        }
      }
      const genreBreakdown = [...genreCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([genre, count]) => ({ genre, count }));

      // Top developer
      const devCount = new Map<string, number>();
      for (const [, game] of localMap) {
        const dev = game.involved_companies?.find((c) => c.developer)?.company.name;
        if (dev) devCount.set(dev, (devCount.get(dev) ?? 0) + 1);
      }
      const topDeveloper = devCount.size > 0
        ? [...devCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : null;

      // Avg rating by status (completed + dropped, min 2 rated games)
      const ratingsByStatus = new Map<string, number[]>();
      for (const log of userLogs) {
        if ((log.status === 'completed' || log.status === 'dropped') && log.rating != null) {
          const arr = ratingsByStatus.get(log.status) ?? [];
          arr.push(log.rating);
          ratingsByStatus.set(log.status, arr);
        }
      }
      const avgRatingByStatus = [...ratingsByStatus.entries()]
        .filter(([, ratings]) => ratings.length >= 2)
        .map(([status, ratings]) => ({
          status,
          avg: ratingToStars(ratings.reduce((s, r) => s + r, 0) / ratings.length),
        }));

      setStats({ genreBreakdown, topDeveloper, avgRatingByStatus });
    } catch (e) {
      if (__DEV__) console.error('[Shelf] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (!userId) {
    return (
      <View style={styles.screen}>
        <ScreenHeader />
        <View style={unauth.body}>
          <View style={unauth.decorContainer}>
            <View style={[unauth.card, { backgroundColor: Colors.surface, transform: [{ rotate: '-8deg' }] }]} />
            <View style={[unauth.card, { backgroundColor: Colors.surfaceElevated, transform: [{ rotate: '0deg' }] }]} />
            <View style={[unauth.card, { backgroundColor: Colors.surface, transform: [{ rotate: '8deg' }] }]} />
          </View>
          <Text style={unauth.title}>Your shelf, your story.</Text>
          <Text style={unauth.subtitle}>
            Organise and showcase every game you've played, dropped, or want to try.
          </Text>
          <Pressable onPress={() => router.push('/auth')} style={unauth.signUpBtn}>
            <Text style={unauth.signUpText}>Sign Up</Text>
          </Pressable>
          <View style={unauth.signInRow}>
            <Text style={unauth.signInText}>Already a member? </Text>
            <Pressable onPress={() => router.push('/auth')}>
              <Text style={[unauth.signInText, { color: Colors.accent }]}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
          {STATUS_SECTIONS.map(({ status, color }) => (
            <View key={status}>
              <View style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Skeleton height={13} width={90} borderRadius={4} />
                  <Skeleton height={13} width={20} borderRadius={4} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} width={80} height={107} borderRadius={6} />
                  ))}
                </View>
              </View>
              <View style={styles.divider} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {STATUS_SECTIONS.map(({ status, label, color }, idx) => {
          const sectionLogs = logs.filter((l) => l.status === status);
          return (
            <View key={status}>
              <View style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                <Pressable
                  style={styles.statusHeader}
                  onPress={() => router.push(`/shelf/${status}`)}
                >
                  <Text style={[styles.statusLabel, { color }]}>{label}</Text>
                  <Text style={[styles.statusCount, { color }]}>{sectionLogs.length} ›</Text>
                </Pressable>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.miniRow}
                >
                  {sectionLogs.slice(0, 12).map((log) => {
                    const game = gamesMap.get(log.game_igdb_id);
                    const coverUrl = game?.cover ? getCoverUrl(game.cover.image_id, 'cover_small') : null;
                    return (
                      <Pressable key={log.id} onPress={() => router.push(`/game/${log.game_igdb_id}`)}>
                        {coverUrl ? (
                          <Image source={{ uri: coverUrl }} style={styles.miniCover} resizeMode="cover" />
                        ) : (
                          <View style={[styles.miniCover, { backgroundColor: Colors.surfaceElevated }]} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              {idx < STATUS_SECTIONS.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}

        {/* Stats section */}
        {stats !== null && logs.length > 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionLabel}>YOUR STATS</Text>

            {/* Genre breakdown bar chart */}
            {stats.genreBreakdown.length > 0 && (
              <View style={styles.chartCard}>
                <VictoryChart
                  theme={VictoryTheme.material}
                  domainPadding={{ x: 20 }}
                  height={220}
                  padding={{ top: 10, bottom: 50, left: 40, right: 20 }}
                  style={{ parent: { backgroundColor: 'transparent' } }}
                >
                  <VictoryAxis
                    style={{
                      tickLabels: {
                        fill: Colors.textMuted,
                        fontSize: 9,
                        fontFamily: 'Inter_400Regular',
                        angle: -30,
                      },
                    }}
                    tickFormat={(t: string) => t.length > 8 ? t.slice(0, 8) : t}
                  />
                  <VictoryAxis
                    dependentAxis
                    style={{
                      tickLabels: { fill: Colors.textMuted, fontSize: 9 },
                      grid: { stroke: Colors.border },
                    }}
                  />
                  <VictoryBar
                    data={stats.genreBreakdown.map((g) => ({ x: g.genre, y: g.count }))}
                    style={{ data: { fill: Colors.accent, borderRadius: 4 } }}
                    barWidth={22}
                  />
                </VictoryChart>
              </View>
            )}

            {/* Top developer */}
            {stats.topDeveloper && (
              <View style={styles.statCard}>
                <Text style={styles.statCardLabel}>MOST PLAYED DEVELOPER</Text>
                <Text style={styles.statCardValue}>{stats.topDeveloper}</Text>
              </View>
            )}

            {/* Avg rating by status */}
            {stats.avgRatingByStatus.length > 0 && (
              <View style={styles.ratingRow}>
                {stats.avgRatingByStatus.map(({ status, avg }) => (
                  <View key={status} style={styles.ratingCard}>
                    <Text style={styles.statCardLabel}>{status.toUpperCase()}</Text>
                    <StarRating rating={Math.round(avg * 2)} size={12} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const unauth = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  decorContainer: {
    height: 180,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  card: {
    position: 'absolute',
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  signUpBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 16,
  },
  signUpText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#0e0e10' },
  signInRow: { flexDirection: 'row', justifyContent: 'center' },
  signInText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  statusCount: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  miniRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  miniCover: { width: 80, height: 107, borderRadius: 6, borderWidth: 0.5, borderColor: Colors.border },
  divider: { height: 0.5, backgroundColor: Colors.surfaceElevated },
  statsSection: { marginTop: 24 },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statCardLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statCardValue: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  ratingCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
});
