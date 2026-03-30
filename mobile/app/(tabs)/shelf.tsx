import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type { IGDBGame, GameLogRow, GameStatus } from '@gameboxd/lib';
import { getCoverUrl, getUserGameLogs } from '@gameboxd/lib';
import type { ActivityWithUser } from '@gameboxd/lib';
import { getUserActivity } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { getGames } from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import ActivityItem from '../../components/ActivityItem';
import { Colors } from '../../constants/colors';

const STATUS_SECTIONS: { status: GameStatus; label: string }[] = [
  { status: 'completed', label: 'Completed' },
  { status: 'playing', label: 'Playing' },
  { status: 'want_to_play', label: 'Want to Play' },
  { status: 'dropped', label: 'Dropped' },
];

export default function ShelfScreen() {
  const { userId } = useAuthStore();
  const router = useRouter();

  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [gamesMap, setGamesMap] = useState<Map<number, IGDBGame>>(new Map());
  const [activity, setActivity] = useState<ActivityWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [userLogs, acts] = await Promise.all([
        getUserGameLogs(supabase, userId),
        getUserActivity(supabase, userId, 20),
      ]);
      setLogs(userLogs);
      const seen = new Set<string>();
      const dedupedActs = acts.filter((a) => {
        const key = `${a.game_igdb_id}:${a.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setActivity(dedupedActs);
      const ids = [...new Set(userLogs.map((l) => l.game_igdb_id))];
      if (ids.length > 0) {
        const games = await getGames(ids);
        setGamesMap(new Map(games.map((g) => [g.id, g])));
      }
    } catch {
      // silent
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
          {/* Decorative stacked game-case graphic */}
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
        <View style={styles.centred}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {STATUS_SECTIONS.map(({ status, label }, idx) => {
          const sectionLogs = logs.filter((l) => l.status === status);
          return (
            <View key={status}>
              <Pressable
                style={styles.statusHeader}
                onPress={() => router.push(`/shelf/${status}`)}
              >
                <Text style={styles.statusLabel}>{label}</Text>
                <Text style={styles.statusCount}>{sectionLogs.length} ›</Text>
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
              {idx < STATUS_SECTIONS.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}

        <View style={styles.activitySection}>
          <Text style={styles.sectionLabel}>MY ACTIVITY</Text>
          <View style={styles.padH}>
            {activity.map((item) => (
              <ActivityItem key={item.id} item={item} gameName={gamesMap.get(item.game_igdb_id)?.name} />
            ))}
            {activity.length === 0 && (
              <Text style={styles.emptyText}>No activity yet.</Text>
            )}
          </View>
        </View>
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
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }, // loading state
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
  activitySection: { marginTop: 16, marginBottom: 32 },
  sectionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  padH: { paddingHorizontal: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
});
