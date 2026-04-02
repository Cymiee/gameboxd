import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Image, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { IGDBGame, GameLogRow } from '@gameboxd/lib';
import { getCoverUrl, getUserGameLogs, getFriends } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { useLogModal } from '../../store/logModal';
import { supabase } from '../../lib/supabase';
import { getGame, getGames, getArtworkUrl } from '../../lib/igdb';
import HorizontalGameScroll from '../../components/HorizontalGameScroll';
import StarRating from '../../components/StarRating';
import { Colors } from '../../constants/colors';

const GENRE_COLORS = [
  'rgba(255,100,100,0.2)',
  'rgba(100,180,255,0.2)',
  'rgba(180,130,255,0.2)',
  'rgba(255,180,80,0.2)',
  'rgba(100,230,150,0.2)',
];

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuthStore();
  const { open } = useLogModal();
  const router = useRouter();

  const [game, setGame] = useState<IGDBGame | null>(null);
  const [existingLog, setExistingLog] = useState<GameLogRow | null>(null);
  const [similarGames, setSimilarGames] = useState<IGDBGame[]>([]);
  const [friendRatings, setFriendRatings] = useState<{ username: string; rating: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [g, logs] = await Promise.all([
          getGame(Number(id)),
          userId ? getUserGameLogs(supabase, userId) : Promise.resolve<GameLogRow[]>([]),
        ]);
        if (cancelled) return;
        setGame(g);
        setExistingLog(logs.find((l) => l.game_igdb_id === Number(id)) ?? null);

        if (g.similar_games && g.similar_games.length > 0) {
          const similar = await getGames(g.similar_games.slice(0, 6));
          if (!cancelled) setSimilarGames(similar);
        }

        if (userId) {
          const friendIds = await getFriends(supabase, userId);
          if (friendIds.length > 0) {
            const { data: friendLogs } = await supabase
              .from('game_logs')
              .select('user_id, rating')
              .in('user_id', friendIds)
              .eq('game_igdb_id', Number(id))
              .not('rating', 'is', null);

            if (friendLogs && !cancelled) {
              const uids = friendLogs.map((r) => r.user_id);
              const { data: users } = await supabase
                .from('users')
                .select('id, username')
                .in('id', uids);
              const userMap = new Map((users ?? []).map((u) => [u.id, u.username]));
              setFriendRatings(
                friendLogs
                  .filter((r) => r.rating != null)
                  .map((r) => ({ username: userMap.get(r.user_id) ?? '?', rating: r.rating as number })),
              );
            }
          }
        }
      } catch (e) {
        if (__DEV__) console.error('[GameDetail] load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, userId]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!game) return null;

  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;
  const developer = game.involved_companies?.find((c) => c.developer)?.company.name;
  const igdbRating = game.rating != null ? Math.round(game.rating / 10) : null;
  const metaParts = [year ? String(year) : null, developer].filter(Boolean) as string[];

  function pickLandscapeUrl(
    items: { image_id: string; width?: number; height?: number }[] | null | undefined,
  ): string | null {
    const pick = items?.find((a) => !a.width || !a.height || a.width / a.height < 2.0);
    return pick ? getArtworkUrl(pick.image_id) : null;
  }

  const heroImageUrl =
    pickLandscapeUrl(game.artworks) ??
    pickLandscapeUrl(game.screenshots) ??
    (coverUrl ? getCoverUrl(game.cover!.image_id, '720p') : null);

  const isLogged = existingLog && existingLog.status !== 'want_to_play';

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={styles.hero}>
          {heroImageUrl && (
            <Image
              source={{ uri: heroImageUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.3)', Colors.background]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        {/* Body overlaps hero */}
        <View style={styles.body}>
          {/* Info block */}
          <View style={styles.infoBlock}>
            {/* Cover art */}
            {coverUrl && (
              <Image source={{ uri: coverUrl }} style={styles.heroCover} resizeMode="cover" />
            )}

            {/* Title / meta / genres / rating */}
            <View style={styles.infoRight}>
              <Text style={styles.gameTitle}>{game.name}</Text>
              {metaParts.length > 0 && (
                <Text style={styles.metaLine}>{metaParts.join('  ·  ')}</Text>
              )}
              {game.genres && game.genres.length > 0 && (
                <View style={styles.genreRow}>
                  {game.genres.slice(0, 4).map((g, idx) => (
                    <View
                      key={g.id}
                      style={[styles.genrePill, { backgroundColor: GENRE_COLORS[idx % GENRE_COLORS.length] }]}
                    >
                      <Text style={styles.genreText}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              {igdbRating != null && (
                <StarRating rating={igdbRating} size={16} />
              )}
            </View>
          </View>

          {/* Log button */}
          {userId ? (
            <Pressable
              onPress={() => open(game)}
              style={[styles.logBtn, isLogged && styles.logBtnEdit]}
            >
              <Text style={[styles.logBtnText, isLogged && styles.logBtnTextEdit]}>
                {isLogged ? 'EDIT LOG' : 'LOG THIS GAME'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.signInPrompt}>
              <View style={styles.logBtnDisabled}>
                <Text style={styles.logBtnTextDisabled}>LOG THIS GAME</Text>
              </View>
              <Text style={styles.signInNote}>Sign in to log games</Text>
              <Pressable onPress={() => router.push('/auth')} style={styles.signInBtn}>
                <Text style={styles.signInBtnText}>Sign in</Text>
              </Pressable>
            </View>
          )}

          {/* Existing log card */}
          {isLogged && (
            <View style={styles.logCard}>
              <Text style={styles.logStatus}>{existingLog.status.replace('_', ' ')}</Text>
              {existingLog.rating != null && (
                <View style={{ marginBottom: 4 }}>
                  <StarRating rating={existingLog.rating} size={14} />
                </View>
              )}
              {existingLog.review && (
                <Text style={styles.logReview} numberOfLines={3}>{existingLog.review}</Text>
              )}
            </View>
          )}

          {/* About */}
          {game.summary && (
            <>
              <Text style={styles.sectionLabel}>ABOUT</Text>
              <Text style={styles.summary}>{game.summary}</Text>
            </>
          )}

          {/* Friends' ratings */}
          {userId && friendRatings.length > 0 && (
            <View style={styles.friendsSection}>
              <Text style={styles.sectionLabel}>FRIENDS RATED THIS</Text>
              <View style={styles.friendRow}>
                {friendRatings.map((fr) => (
                  <View key={fr.username} style={styles.friendChip}>
                    <Text style={styles.friendName}>{fr.username}</Text>
                    <StarRating rating={fr.rating} size={12} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Similar games */}
          {similarGames.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.sectionLabel}>SIMILAR GAMES</Text>
              <HorizontalGameScroll
                games={similarGames}
                onPress={(g) => router.push(`/game/${g.id}`)}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  hero: { height: 380, overflow: 'hidden' },
  body: { marginTop: -100, padding: 16, gap: 16 },
  infoBlock: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  heroCover: {
    width: 110,
    height: 147,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  infoRight: { flex: 1, paddingBottom: 4 },
  gameTitle: { fontFamily: 'Syne_700Bold', fontSize: 20, color: Colors.textPrimary, marginBottom: 6 },
  metaLine: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 8 },
  genrePill: { borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  genreText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#fff' },
  logBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logBtnEdit: { backgroundColor: 'rgba(180,255,0,0.15)' },
  logBtnText: { fontFamily: 'Syne_700Bold', fontSize: 13, color: '#111', letterSpacing: 0.8 },
  logBtnTextEdit: { color: Colors.accent },
  signInPrompt: { gap: 8 },
  logBtnDisabled: {
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  logBtnTextDisabled: { fontFamily: 'Syne_700Bold', fontSize: 13, color: Colors.textMuted, letterSpacing: 0.8 },
  signInNote: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  signInBtn: {
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  signInBtnText: { fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.accent },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 12,
  },
  logStatus: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  logReview: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  summary: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 24 },
  friendsSection: { gap: 8 },
  friendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  friendName: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textPrimary },
  similarSection: { gap: 8, marginHorizontal: -16 },
});
