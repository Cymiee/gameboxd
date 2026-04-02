import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Pressable, Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { IGDBGame, TopGameRow, GameLogRow, GameStatus, ActivityWithUser } from '@gameboxd/lib';
import {
  getCoverUrl, getUserStats, getTopGames, getUserActivity, getUserGameLogs,
  getFriendshipStatus, getFriends,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
} from '@gameboxd/lib';
import type { FriendStatusResult } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { getGames } from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import ActivityItem from '../../components/ActivityItem';
import StarRating from '../../components/StarRating';
import Skeleton from '../../components/Skeleton';
import { Colors } from '../../constants/colors';

interface Stats { logged: number; avgRating: number | null; reviews: number; friends: number }

const STATUS_SECTIONS: { status: GameStatus; label: string; color: string }[] = [
  { status: 'completed',    label: 'Completed',    color: '#4ade80' },
  { status: 'playing',      label: 'Playing',      color: '#60a5fa' },
  { status: 'want_to_play', label: 'Want to Play', color: '#fbbf24' },
  { status: 'dropped',      label: 'Dropped',      color: '#f87171' },
];

export default function UserProfileScreen() {
  const { id: profileId } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuthStore();
  const router = useRouter();

  const [profile, setProfile] = useState<{ id: string; username: string; bio: string | null } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topGames, setTopGames] = useState<TopGameRow[]>([]);
  const [activity, setActivity] = useState<ActivityWithUser[]>([]);
  const [logs, setLogs] = useState<GameLogRow[]>([]);
  const [gamesMap, setGamesMap] = useState<Map<number, IGDBGame>>(new Map());
  const [commonFriends, setCommonFriends] = useState<{ id: string; username: string }[]>([]);
  const [friendStatus, setFriendStatus] = useState<FriendStatusResult['status']>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [profileRes, userStats, topG, acts, userLogs, friendRes] = await Promise.all([
          supabase.from('users').select('id, username, bio').eq('id', profileId).single(),
          getUserStats(supabase, profileId),
          getTopGames(supabase, profileId),
          getUserActivity(supabase, profileId, 20),
          getUserGameLogs(supabase, profileId),
          userId
            ? getFriendshipStatus(supabase, userId, profileId)
            : Promise.resolve<FriendStatusResult>({ status: 'none', friendshipId: null }),
        ]);

        if (cancelled) return;

        if (profileRes.data) setProfile(profileRes.data);
        setStats(userStats);
        setTopGames(topG);
        setActivity(acts);
        setLogs(userLogs);
        setFriendStatus(friendRes.status);
        setFriendshipId(friendRes.friendshipId);

        // Friends in common
        if (userId) {
          const [myFriends, theirFriends] = await Promise.all([
            getFriends(supabase, userId),
            getFriends(supabase, profileId),
          ]);
          const theirSet = new Set(theirFriends);
          const common = myFriends.filter((id) => theirSet.has(id)).slice(0, 5);
          if (common.length > 0) {
            const { data: commonUsers } = await supabase
              .from('users')
              .select('id, username')
              .in('id', common);
            if (!cancelled) setCommonFriends(commonUsers ?? []);
          }
        }

        // Batch IGDB fetch
        const topIds = topG.map((t) => t.game_igdb_id);
        const actIds = acts.map((a) => a.game_igdb_id);
        const logIds = userLogs.map((l) => l.game_igdb_id);
        const allIds = [...new Set([...topIds, ...actIds, ...logIds])];
        if (allIds.length > 0 && !cancelled) {
          const games = await getGames(allIds);
          if (!cancelled) setGamesMap(new Map(games.map((g) => [g.id, g])));
        }
      } catch (e) {
        if (__DEV__) console.error('[UserProfile] load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [profileId, userId]);

  async function refreshFriendStatus() {
    if (!userId || !profileId) return;
    try {
      const result = await getFriendshipStatus(supabase, userId, profileId);
      setFriendStatus(result.status);
      setFriendshipId(result.friendshipId);
    } catch (e) {
      if (__DEV__) console.error('[UserProfile] refreshFriendStatus error:', e);
    }
  }

  async function handleAdd() {
    if (!userId || busy) return;
    setBusy(true);
    try { await sendFriendRequest(supabase, userId, profileId); await refreshFriendStatus(); }
    catch (e) { if (__DEV__) console.error('[UserProfile] handleAdd error:', e); }
    finally { setBusy(false); }
  }

  async function handleAccept() {
    if (!friendshipId || busy) return;
    setBusy(true);
    try { await acceptFriendRequest(supabase, friendshipId, userId!); await refreshFriendStatus(); }
    catch (e) { if (__DEV__) console.error('[UserProfile] handleAccept error:', e); }
    finally { setBusy(false); }
  }

  async function handleDecline() {
    if (!friendshipId || busy) return;
    setBusy(true);
    try { await declineFriendRequest(supabase, friendshipId, userId!); await refreshFriendStatus(); }
    catch (e) { if (__DEV__) console.error('[UserProfile] handleDecline error:', e); }
    finally { setBusy(false); }
  }

  function renderFriendAction() {
    if (!userId) return null;
    switch (friendStatus) {
      case 'none':
        return (
          <Pressable style={s.addBtn} onPress={handleAdd} disabled={busy}>
            <Text style={s.addBtnText}>Add Friend</Text>
          </Pressable>
        );
      case 'pending_sent':
        return <Text style={s.mutedLabel}>Requested</Text>;
      case 'pending_received':
        return (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable style={s.acceptBtn} onPress={handleAccept} disabled={busy}>
              <Text style={s.acceptBtnText}>Accept</Text>
            </Pressable>
            <Pressable style={s.declineBtn} onPress={handleDecline} disabled={busy}>
              <Text style={s.declineBtnText}>Decline</Text>
            </Pressable>
          </View>
        );
      case 'accepted':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={15} color={Colors.accent} />
            <Text style={s.friendsLabel}>Friends</Text>
          </View>
        );
    }
  }

  if (loading) {
    return (
      <View style={s.screen}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!profile) return null;

  const hasAnyLogs = STATUS_SECTIONS.some(
    ({ status }) => logs.some((l) => l.status === status),
  );

  return (
    <View style={s.screen}>
      <Pressable style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* ── Header ── */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile.username[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.username}>{profile.username}</Text>
            {profile.bio ? (
              <Text style={s.bio} numberOfLines={2}>{profile.bio}</Text>
            ) : null}
          </View>
          {renderFriendAction()}
        </View>

        {/* ── Stats ── */}
        {stats && (
          <View style={s.statsRow}>
            {([
              { label: 'Logged',  value: String(stats.logged)  },
              { label: 'Reviews', value: String(stats.reviews) },
              { label: 'Friends', value: String(stats.friends) },
            ] as { label: string; value: string }[]).map((item) => (
              <View key={item.label} style={[s.statCell, s.statBorder]}>
                <Text style={s.statValue}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
            <View style={s.statCell}>
              {stats.avgRating != null ? (
                <StarRating rating={stats.avgRating} size={13} />
              ) : (
                <Text style={s.statValue}>—</Text>
              )}
              <Text style={s.statLabel}>Avg</Text>
            </View>
          </View>
        )}

        {/* ── Friends in common ── */}
        {commonFriends.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>FRIENDS IN COMMON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.commonRow}>
              {commonFriends.map((friend) => (
                <Pressable
                  key={friend.id}
                  style={s.commonItem}
                  onPress={() => router.push(`/user/${friend.id}`)}
                >
                  <View style={s.commonAvatar}>
                    <Text style={s.commonAvatarText}>{friend.username[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={s.commonName} numberOfLines={1}>{friend.username}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Favourite games ── */}
        <View style={s.section}>
          <Text style={s.favouritesLabel}>Favourites</Text>
          <View style={s.topGamesRow}>
            {[1, 2, 3].map((pos) => {
              const slot = topGames.find((t) => t.position === pos);
              const game = slot ? gamesMap.get(slot.game_igdb_id) : null;
              const coverUrl = game?.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
              return (
                <Pressable
                  key={pos}
                  style={s.topGameSlot}
                  onPress={() => { if (game) router.push(`/game/${game.id}`); }}
                  disabled={!game}
                >
                  {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={s.topGameCover} resizeMode="cover" />
                  ) : (
                    <View style={[s.topGameCover, s.topGameEmpty]}>
                      <Text style={s.topGamePlus}>—</Text>
                    </View>
                  )}
                  <Text style={s.topGamePos}>0{pos}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Shelf sections ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SHELF</Text>
          {!hasAnyLogs ? (
            <Text style={[s.emptyText, { paddingHorizontal: 16 }]}>No games logged yet.</Text>
          ) : (
            STATUS_SECTIONS.map(({ status, label, color }, idx) => {
              const sectionLogs = logs.filter((l) => l.status === status);
              if (sectionLogs.length === 0) return null;
              return (
                <View key={status}>
                  <View style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                    <Pressable
                      style={s.statusHeader}
                      onPress={() =>
                        router.push({ pathname: `/shelf/${status}`, params: { userId: profileId } })
                      }
                    >
                      <Text style={[s.statusLabel, { color }]}>{label}</Text>
                      <Text style={[s.statusCount, { color }]}>{sectionLogs.length} ›</Text>
                    </Pressable>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.miniRow}
                    >
                      {sectionLogs.slice(0, 12).map((log) => {
                        const game = gamesMap.get(log.game_igdb_id);
                        const coverUrl = game?.cover
                          ? getCoverUrl(game.cover.image_id, 'cover_small')
                          : null;
                        return (
                          <Pressable key={log.id} onPress={() => router.push(`/game/${log.game_igdb_id}`)}>
                            {coverUrl ? (
                              <Image source={{ uri: coverUrl }} style={s.miniCover} resizeMode="cover" />
                            ) : (
                              <View style={[s.miniCover, { backgroundColor: Colors.surfaceElevated }]} />
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                  {idx < STATUS_SECTIONS.length - 1 && <View style={s.divider} />}
                </View>
              );
            })
          )}
        </View>

        {/* ── Recent activity ── */}
        {activity.length > 0 && (
          <View style={[s.section, { marginBottom: 32 }]}>
            <Text style={s.sectionLabel}>RECENT ACTIVITY</Text>
            <View style={s.padH}>
              {activity.map((item) => (
                <ActivityItem
                  key={item.id}
                  item={item}
                  gameName={gamesMap.get(item.game_igdb_id)?.name}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 16,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(228,255,26,0.35)',
  },
  avatarText: { fontFamily: 'Syne_700Bold', fontSize: 18, color: Colors.accent },
  username: { fontFamily: 'Syne_700Bold', fontSize: 15, color: Colors.textPrimary },
  bio: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  // Friend action button styles
  addBtn: {
    backgroundColor: 'rgba(180,255,0,0.15)', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  addBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.accent },
  mutedLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  acceptBtn: {
    backgroundColor: Colors.accent, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  acceptBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#111' },
  declineBtn: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  declineBtnText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  friendsLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.accent },
  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: Colors.border,
    paddingVertical: 10,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statBorder: { borderRightWidth: 0.5, borderColor: Colors.border },
  statValue: { fontFamily: 'Syne_700Bold', fontSize: 15, color: Colors.textPrimary },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
  // Sections
  section: { marginTop: 20 },
  sectionLabel: {
    fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted,
    letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 16,
  },
  favouritesLabel: {
    fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.textPrimary,
    letterSpacing: 0.4, marginBottom: 12, paddingHorizontal: 16,
  },
  // Friends in common
  commonRow: { gap: 16, paddingHorizontal: 16, paddingBottom: 4 },
  commonItem: { alignItems: 'center', width: 52 },
  commonAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(228,255,26,0.25)',
    marginBottom: 4,
  },
  commonAvatarText: { fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.accent },
  commonName: {
    fontFamily: 'Inter_400Regular', fontSize: 10,
    color: Colors.textMuted, textAlign: 'center',
  },
  // Favourite games
  topGamesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  topGameSlot: { flex: 1, position: 'relative' },
  topGameCover: {
    width: '100%', aspectRatio: 2 / 3, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(228,255,26,0.25)',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  topGameEmpty: { backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  topGamePlus: { fontSize: 18, color: Colors.textMuted },
  topGamePos: {
    position: 'absolute', bottom: 6, left: 6,
    fontFamily: 'Syne_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.2)',
  },
  // Shelf
  statusHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  statusLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  statusCount: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  miniRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  miniCover: { width: 80, height: 107, borderRadius: 6, borderWidth: 0.5, borderColor: Colors.border },
  divider: { height: 0.5, backgroundColor: Colors.surfaceElevated },
  // Activity
  padH: { paddingHorizontal: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
});
