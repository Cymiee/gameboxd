import { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, View, Text, Pressable, Image, FlatList, StyleSheet, Alert, Platform, ToastAndroid } from 'react-native';
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
import Skeleton from '../../components/Skeleton';
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
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;
    cancelledRef.current = false;
    setLoading(true);
    try {
      const [top, acts, userStats] = await Promise.all([
        getTopGames(supabase, userId),
        getUserActivity(supabase, userId, 50),
        getUserStats(supabase, userId),
      ]);
      if (cancelledRef.current) return;
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
        if (!cancelledRef.current) {
          const map = new Map(games.map((g) => [g.id, g]));
          setTopGamesMap(map);
          setActivityGames(map);
        }
      }
    } catch (e) {
      if (__DEV__) console.error('[Profile] load error:', e);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

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

        {/* Favourite games — centrepiece above stats */}
        <View style={styles.section}>
          <Text style={styles.favouritesLabel}>Favourites</Text>
          <View style={styles.topGamesRow}>
            {loading && topGames.length === 0 ? (
              [0, 1, 2].map((i) => (
                <Skeleton key={i} height={130} borderRadius={10} style={{ flex: 1 }} />
              ))
            ) : [1, 2, 3].map((pos) => {
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

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            {([
              { label: 'Logged', value: String(stats.logged) },
              { label: 'Reviews', value: String(stats.reviews) },
              { label: 'Friends', value: String(stats.friends) },
            ] as { label: string; value: string }[]).map((s) => (
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

        {/* Recent activity */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
          <View style={styles.padH}>
            {loading ? (
              <View style={{ gap: 12 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Skeleton width={26} height={26} borderRadius={13} />
                    <Skeleton height={32} borderRadius={6} style={{ flex: 1 }} />
                    <Skeleton width={18} height={24} borderRadius={3} />
                  </View>
                ))}
              </View>
            ) : (
              <FlatList
                data={displayedActivity}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <ActivityItem
                    item={item}
                    gameName={activityGames.get(item.game_igdb_id)?.name}
                  />
                )}
                ListFooterComponent={
                  !showAll && activity.length > 10 ? (
                    <Pressable onPress={() => setShowAll(true)} style={{ marginTop: 12 }}>
                      <Text style={styles.loadMore}>Load more</Text>
                    </Pressable>
                  ) : null
                }
              />
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
    borderWidth: 2,
    borderColor: 'rgba(228,255,26,0.35)',
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
  favouritesLabel: {
    fontFamily: 'Syne_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 0.4,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  topGamesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  topGameSlot: { flex: 1, position: 'relative' },
  topGameCover: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(228,255,26,0.25)',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  topGameEmpty: { backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  topGamePlus: { fontSize: 22, color: Colors.textMuted },
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
