import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Image, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { IGDBGame, GameLogRow } from '@gameboxd/lib';
import { getCoverUrl, getUserGameLogs, getFriends } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { useLogModal } from '../../store/logModal';
import { supabase } from '../../lib/supabase';
import { getGame, getGames } from '../../lib/igdb';
import HorizontalGameScroll from '../../components/HorizontalGameScroll';
import StarRating from '../../components/StarRating';
import { Colors } from '../../constants/colors';

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
      } catch {
        // silent
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

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {coverUrl && (
            <Image
              source={{ uri: coverUrl }}
              style={StyleSheet.absoluteFillObject}
              blurRadius={20}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            {coverUrl && (
              <Image source={{ uri: coverUrl }} style={styles.heroCover} resizeMode="cover" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.gameTitle}>{game.name}</Text>
              {game.genres && game.genres.length > 0 && (
                <View style={styles.genreRow}>
                  {game.genres.slice(0, 3).map((g) => (
                    <View key={g.id} style={styles.genrePill}>
                      <Text style={styles.genreText}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              {year && <Text style={styles.year}>{year}</Text>}
              {igdbRating != null && (
                <StarRating rating={igdbRating} size={20} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Log button */}
          {userId ? (
            <Pressable onPress={() => open(game)} style={styles.logBtn}>
              <Text style={styles.logBtnText}>
                {existingLog && existingLog.status !== 'want_to_play' ? 'Edit log' : 'Log this game'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.signInPrompt}>
              <View style={styles.logBtnDisabled}>
                <Text style={styles.logBtnTextDisabled}>Log this game</Text>
              </View>
              <Text style={styles.signInNote}>Sign in to log games</Text>
              <Pressable onPress={() => router.push('/auth')} style={styles.signInBtn}>
                <Text style={styles.signInBtnText}>Sign in</Text>
              </Pressable>
            </View>
          )}

          {/* Existing log summary */}
          {existingLog && existingLog.status !== 'want_to_play' && (
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
            <Text style={styles.summary}>{game.summary}</Text>
          )}

          <View style={styles.metaRow}>
            {developer && (
              <View>
                <Text style={styles.metaLabel}>Developer</Text>
                <Text style={styles.metaValue}>{developer}</Text>
              </View>
            )}
            {year && (
              <View>
                <Text style={styles.metaLabel}>Released</Text>
                <Text style={styles.metaValue}>{year}</Text>
              </View>
            )}
          </View>

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
  hero: { height: 280, overflow: 'hidden', justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,14,16,0.6)' },
  heroContent: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    alignItems: 'flex-end',
  },
  heroCover: {
    width: 120,
    height: 160,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  gameTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, color: '#fff', marginBottom: 6 },
  genreRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 6 },
  genrePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Colors.border,
  },
  genreText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  year: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  rating: { fontFamily: 'Syne_700Bold', fontSize: 28, color: Colors.accent },
  body: { padding: 16, gap: 16 },
  logBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logBtnText: { fontFamily: 'Syne_700Bold', fontSize: 14, color: '#111' },
  signInPrompt: { gap: 8 },
  logBtnDisabled: {
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  logBtnTextDisabled: { fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.textMuted },
  signInNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  signInBtn: {
    borderRadius: 10,
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
  logRating: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.accent, marginBottom: 4 },
  logReview: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  summary: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 24 },
  metaLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  metaValue: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textPrimary },
  friendsSection: { gap: 8 },
  sectionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
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
  friendRating: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.accent,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  similarSection: { gap: 8, marginHorizontal: -16 },
});
