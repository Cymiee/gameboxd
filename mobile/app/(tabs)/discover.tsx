import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type { IGDBGame } from '@gameboxd/lib';
import { getCoverUrl } from '@gameboxd/lib';
import type { ReviewWithUser, ListWithMeta } from '@gameboxd/lib';
import { getTrendingGameIds, getMostPlayedThisWeek, getRecentReviews, getPopularListsWithMeta } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { getGames, getNewReleases, getTopRated, getTrendingGames } from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import HorizontalGameScroll from '../../components/HorizontalGameScroll';
import { Colors } from '../../constants/colors';

export default function DiscoverScreen() {
  const { userId } = useAuthStore();
  const router = useRouter();

  const [trending, setTrending] = useState<IGDBGame[]>([]);
  const [mostPlayed, setMostPlayed] = useState<IGDBGame[]>([]);
  const [forYou, setForYou] = useState<IGDBGame[]>([]);
  const [newReleases, setNewReleases] = useState<IGDBGame[]>([]);
  const [popularLists, setPopularLists] = useState<ListWithMeta[]>([]);
  const [listCovers, setListCovers] = useState<Map<number, string>>(new Map());
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [reviewGames, setReviewGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [trendingIds, mostPlayedIds, releasesGames, topRated, lists] = await Promise.all([
        getTrendingGameIds(supabase, 10),
        getMostPlayedThisWeek(supabase, 10),
        getNewReleases(10),
        getTopRated(10),
        getPopularListsWithMeta(supabase, 4),
      ]);

      let [trendingGames, mostPlayedGames] = await Promise.all([
        getGames(trendingIds.map((t) => t.gameIgdbId)),
        getGames(mostPlayedIds.map((t) => t.gameIgdbId)),
      ]);

      if (mostPlayedGames.length === 0) {
        mostPlayedGames = await getTrendingGames(10);
      }

      setTrending(trendingGames);
      setMostPlayed(mostPlayedGames);
      setNewReleases(releasesGames);
      setForYou(topRated);
      setPopularLists(lists);

      // Fetch covers for list preview tiles
      const allListGameIds = [...new Set(lists.flatMap((l) => l.coverGameIds))];
      if (allListGameIds.length > 0) {
        const coverGames = await getGames(allListGameIds);
        const coverMap = new Map<number, string>();
        for (const g of coverGames) {
          if (g.cover) coverMap.set(g.id, getCoverUrl(g.cover.image_id, 'cover_small'));
        }
        setListCovers(coverMap);
      }

      const recentReviews = await getRecentReviews(supabase, 5);
      setReviews(recentReviews);
      const reviewGameIds = [...new Set(recentReviews.map((r) => r.game_igdb_id))];
      if (reviewGameIds.length > 0) {
        const rGames = await getGames(reviewGameIds);
        setReviewGames(new Map(rGames.map((g) => [g.id, g])));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function goToGame(game: IGDBGame) { router.push(`/game/${game.id}`); }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        <Section label="TRENDING WITH SHELVED GAMERS">
          <HorizontalGameScroll games={trending} onPress={goToGame} />
        </Section>

        {mostPlayed.length > 0 && (
          <Section label="MOST PLAYED THIS WEEK">
            <HorizontalGameScroll games={mostPlayed} onPress={goToGame} />
          </Section>
        )}

        <Section
          label="DISCOVER SOMETHING NEW"
          subtitle={userId ? 'Based on your taste' : 'You might like these'}
        >
          <HorizontalGameScroll games={forYou} onPress={goToGame} />
        </Section>

        <Section label="NEW RELEASES">
          <HorizontalGameScroll games={newReleases} onPress={goToGame} />
        </Section>

        {popularLists.length > 0 && (
          <Section label="POPULAR LISTS">
            <View style={styles.padH}>
              {popularLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  listCovers={listCovers}
                  onPress={() => router.push(`/list/${list.id}`)}
                />
              ))}
            </View>
          </Section>
        )}

        {reviews.length > 0 && (
          <Section label="RECENT REVIEWS">
            <View style={styles.padH}>
              {reviews.map((review) => {
                const game = reviewGames.get(review.game_igdb_id);
                const coverUrl = game?.cover ? getCoverUrl(game.cover.image_id, 'cover_small') : null;
                return (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    game={game}
                    coverUrl={coverUrl}
                    onPress={goToGame}
                  />
                );
              })}
            </View>
          </Section>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function Section({ label, subtitle, children }: {
  label: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={sectionStyles.label}>{label}</Text>
      {subtitle && <Text style={sectionStyles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});

function ListCard({ list, listCovers, onPress }: {
  list: ListWithMeta;
  listCovers: Map<number, string>;
  onPress: () => void;
}) {
  return (
    <Pressable style={listStyles.card} onPress={onPress}>
      <View style={listStyles.coversRow}>
        {list.coverGameIds.slice(0, 4).map((gameId) => {
          const url = listCovers.get(gameId);
          return url ? (
            <Image key={gameId} source={{ uri: url }} style={listStyles.miniCover} resizeMode="cover" />
          ) : (
            <View key={gameId} style={[listStyles.miniCover, { backgroundColor: Colors.surfaceElevated }]} />
          );
        })}
        {Array.from({ length: Math.max(0, 4 - list.coverGameIds.length) }).map((_, i) => (
          <View key={`empty-${i}`} style={[listStyles.miniCover, { backgroundColor: Colors.surfaceElevated }]} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={listStyles.title} numberOfLines={1}>{list.title}</Text>
        <Text style={listStyles.meta}>
          by {list.user.username} · {list.gameCount} game{list.gameCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const listStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 8,
  },
  coversRow: { flexDirection: 'row', gap: 3 },
  miniCover: { width: 22, height: 29, borderRadius: 4 },
  title: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textPrimary },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 3 },
});

function ReviewCard({ review, game, coverUrl, onPress }: {
  review: ReviewWithUser;
  game: IGDBGame | undefined;
  coverUrl: string | null;
  onPress: (g: IGDBGame) => void;
}) {
  return (
    <Pressable
      style={reviewStyles.card}
      onPress={() => { if (game) onPress(game); }}
    >
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={reviewStyles.cover} resizeMode="cover" />
      ) : (
        <View style={[reviewStyles.cover, { backgroundColor: Colors.surfaceElevated }]} />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={reviewStyles.gameTitle} numberOfLines={1}>{game?.name ?? ''}</Text>
        <Text style={reviewStyles.reviewer}>{review.user.username}</Text>
        {review.rating != null && (
          <Text style={reviewStyles.rating}>{'★'.repeat(Math.round(review.rating / 2))}</Text>
        )}
        <Text style={reviewStyles.excerpt} numberOfLines={2}>{review.review}</Text>
      </View>
    </Pressable>
  );
}

const reviewStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  cover: { width: 32, height: 43, borderRadius: 4, flexShrink: 0 },
  gameTitle: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textPrimary },
  reviewer: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted },
  rating: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.accent },
  excerpt: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  padH: { paddingHorizontal: 16 },
});
