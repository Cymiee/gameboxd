import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Image, StyleSheet, ActivityIndicator, Alert, Platform, ToastAndroid } from 'react-native';
import { useRouter } from 'expo-router';
import type { IGDBGame, TopGameRow } from '@gameboxd/lib';
import { getCoverUrl, getTopGames } from '@gameboxd/lib';
import type { ActivityWithUser } from '@gameboxd/lib';
import { getUserActivity, getUserStats } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { getGames } from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import ActivityItem from '../../components/ActivityItem';
import StarRating from '../../components/StarRating';
import { Colors } from '../../constants/colors';
import { useLogModal } from '../../store/logModal';

interface Stats { logged: number; avgRating: number | null; reviews: number; friends: number }

export default function ProfileScreen() {
  const { userId, profile, logout } = useAuthStore();
  const router = useRouter();
  const { open } = useLogModal();

  const [topGames, setTopGames] = useState<TopGameRow[]>([]);
  const [topGamesMap, setTopGamesMap] = useState<Map<number, IGDBGame>>(new Map());
  const [activity, setActivity] = useState<ActivityWithUser[]>([]);
  const [activityGames, setActivityGames] = useState<Map<number, IGDBGame>>(new Map());
  const [stats, setStats] = useState<Stats | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [top, acts, userStats] = await Promise.all([
        getTopGames(supabase, userId),
        getUserActivity(supabase, userId, showAll ? 50 : 10),
        getUserStats(supabase, userId),
      ]);
      setTopGames(top);
      setStats(userStats);
      const seen = new Set<string>();
      const dedupedActs = acts.filter((a) => {
        const key = `${a.game_igdb_id}:${a.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setActivity(dedupedActs);

      const topIds = top.map((t) => t.game_igdb_id);
      const actIds = [...new Set(acts.map((a) => a.game_igdb_id))];
      const allIds = [...new Set([...topIds, ...actIds])];
      if (allIds.length > 0) {
        const games = await getGames(allIds);
        const map = new Map(games.map((g) => [g.id, g]));
        setTopGamesMap(map);
        setActivityGames(map);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId, showAll]);

  useEffect(() => { load(); }, [load]);

  if (!userId || !profile) {
    return (
      <View style={styles.screen}>
        <ScreenHeader />
        <View style={styles.centred}>
          <Text style={styles.emptyTitle}>Sign in to view your profile</Text>
          <Pressable onPress={() => router.push('/auth')} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayedActivity = showAll ? activity : activity.slice(0, 10);

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.username[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{profile.username}</Text>
            {profile.bio ? (
              <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              if (Platform.OS === 'android') {
                ToastAndroid.show('Profile editing coming soon', ToastAndroid.SHORT);
              } else {
                Alert.alert('Coming soon', 'Profile editing is not yet available.');
              }
            }}
            style={styles.editBtn}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            {([
              { label: 'Logged', value: String(stats.logged) },
              { label: 'Reviews', value: String(stats.reviews) },
              { label: 'Friends', value: String(stats.friends) },
            ] as { label: string; value: string }[]).map((s, idx) => (
              <View key={s.label} style={[styles.statCell, styles.statBorder]}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
            <View style={styles.statCell}>
              {stats.avgRating != null ? (
                <StarRating rating={stats.avgRating} size={13} />
              ) : (
                <Text style={styles.statValue}>—</Text>
              )}
              <Text style={styles.statLabel}>Avg</Text>
            </View>
          </View>
        )}

        {/* Favourite games */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FAVOURITE GAMES</Text>
          <View style={styles.topGamesRow}>
            {[1, 2, 3].map((pos) => {
              const slot = topGames.find((t) => t.position === pos);
              const game = slot ? topGamesMap.get(slot.game_igdb_id) : null;
              const coverUrl = game?.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
              return (
                <Pressable
                  key={pos}
                  style={styles.topGameSlot}
                  onPress={() => { if (game) router.push(`/game/${game.id}`); else open(); }}
                >
                  {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.topGameCover} resizeMode="cover" />
                  ) : (
                    <View style={[styles.topGameCover, styles.topGameEmpty]}>
                      <Text style={styles.topGamePlus}>+</Text>
                      <Text style={styles.topGameAddLabel}>Add</Text>
                    </View>
                  )}
                  <Text style={styles.topGamePos}>0{pos}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recent activity */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
          <View style={styles.padH}>
            {loading ? (
              <ActivityIndicator color={Colors.accent} />
            ) : (
              displayedActivity.map((item) => (
                <ActivityItem
                  key={item.id}
                  item={item}
                  gameName={activityGames.get(item.game_igdb_id)?.name}
                />
              ))
            )}
            {!showAll && activity.length > 10 && (
              <Pressable onPress={() => setShowAll(true)} style={{ marginTop: 12 }}>
                <Text style={styles.loadMore}>Load more</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.textPrimary },
  loginBtn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  loginBtnText: { fontFamily: 'Syne_700Bold', fontSize: 14, color: '#111' },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontFamily: 'Syne_700Bold', fontSize: 18, color: Colors.accent },
  username: { fontFamily: 'Syne_700Bold', fontSize: 15, color: Colors.textPrimary },
  bio: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  editBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  editBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.accent },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
    paddingVertical: 10,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statBorder: { borderRightWidth: 0.5, borderColor: Colors.border },
  statValue: { fontFamily: 'Syne_700Bold', fontSize: 15, color: Colors.textPrimary },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
  section: { marginTop: 20 },
  sectionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  topGamesRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16 },
  topGameSlot: { flex: 1, position: 'relative' },
  topGameCover: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border },
  topGameEmpty: { backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  topGamePlus: { fontSize: 20, color: Colors.textMuted },
  topGameAddLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  topGamePos: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    fontFamily: 'Syne_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
  },
  padH: { paddingHorizontal: 16 },
  loadMore: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.accent, textAlign: 'center' },
  logoutBtn: { marginHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  logoutText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.danger },
});
