import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView, View, Text, Pressable, Image, FlatList,
  RefreshControl, StyleSheet, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import type { IGDBGame } from '@gameboxd/lib';
import { getCoverUrl } from '@gameboxd/lib';
import type { ActivityWithUser } from '@gameboxd/lib';
import { getFriendsActivity } from '@gameboxd/lib';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import {
  getTrendingGames, getNewReleases, getTopRated, getGames,
  getGamesByGenre, getArtworkUrl,
} from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import ActivityItem from '../../components/ActivityItem';
import StarRating from '../../components/StarRating';
import Skeleton from '../../components/Skeleton';
import { Colors } from '../../constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 80;

// Marquee constants
const COVER_W = 70;
const COVER_H = 100;
const COVER_GAP = 10;
const COVER_SLOT = COVER_W + COVER_GAP;
const MARQUEE_COUNT = 5;
const LOOP_WIDTH = MARQUEE_COUNT * COVER_SLOT;

type Feed = 'games' | 'friends' | 'lists';
type FilterKey = 'popular' | 'new' | 'rpg' | 'action' | 'indie' | 'adventure' | 'strategy';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'popular',   label: 'Popular'      },
  { key: 'new',       label: 'New Releases' },
  { key: 'rpg',       label: 'RPG'          },
  { key: 'action',    label: 'Action'       },
  { key: 'indie',     label: 'Indie'        },
  { key: 'adventure', label: 'Adventure'    },
  { key: 'strategy',  label: 'Strategy'     },
];

async function fetchForFilter(key: FilterKey): Promise<IGDBGame[]> {
  switch (key) {
    case 'popular':   return getTrendingGames(8);
    case 'new':       return getNewReleases(8);
    case 'rpg':       return getGamesByGenre(12, [], 8);
    case 'action':    return getGamesByGenre(4,  [], 8);
    case 'indie':     return getGamesByGenre(32, [], 8);
    case 'adventure': return getGamesByGenre(31, [], 8);
    case 'strategy':  return getGamesByGenre(15, [], 8);
  }
}

function pickLandscapeUrl(
  items: { image_id: string; width?: number; height?: number }[] | null | undefined,
): string | null {
  const pick = items?.find((a) => !a.width || !a.height || a.width / a.height < 2.0);
  return pick ? getArtworkUrl(pick.image_id) : null;
}

function heroImageUrl(game: IGDBGame): string | null {
  return (
    pickLandscapeUrl(game.artworks) ??
    pickLandscapeUrl(game.screenshots) ??
    (game.cover ? getCoverUrl(game.cover.image_id, '720p') : null)
  );
}

export default function HomeScreen() {
  const { userId } = useAuthStore();
  const router = useRouter();

  const [feed, setFeed] = useState<Feed>('games');
  const [filter, setFilter] = useState<FilterKey>('popular');
  const [featured, setFeatured] = useState<IGDBGame[]>([]);
  const [recommended, setRecommended] = useState<IGDBGame[]>([]);
  const [marqueeGames, setMarqueeGames] = useState<IGDBGame[]>([]);
  const [activity, setActivity] = useState<ActivityWithUser[]>([]);
  const [activityGames, setActivityGames] = useState<Map<number, IGDBGame>>(new Map());
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Marquee animation
  const translateX = useSharedValue(0);
  const marqStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    if (marqueeGames.length === 0) return;
    translateX.value = withRepeat(
      withTiming(-LOOP_WIDTH, { duration: 35000, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(translateX);
  }, [marqueeGames.length]);

  const loadFeatured = useCallback(async (key: FilterKey) => {
    setLoadingFeatured(true);
    try {
      const games = await fetchForFilter(key);
      setFeatured(games);
    } catch {
      setFeatured([]);
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [feat, rec, marquee] = await Promise.all([
          fetchForFilter('popular'),
          getTopRated(10),
          getTrendingGames(5),
        ]);
        if (cancelled) return;
        setFeatured(feat);
        setRecommended(rec);
        setMarqueeGames(marquee);
      } catch (e) {
        if (__DEV__) console.error('[Home] initial load error:', e);
      } finally {
        if (!cancelled) {
          setLoadingFeatured(false);
          setLoadingRecommended(false);
        }
      }
    })();
    loadActivity();
    return () => { cancelled = true; };
  }, [loadActivity]);

  const onFilterChange = useCallback(async (key: FilterKey) => {
    setFilter(key);
    await loadFeatured(key);
  }, [loadFeatured]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeatured(filter), loadActivity()]);
    setRefreshing(false);
  }, [filter, loadFeatured, loadActivity]);

  // Memoised so the spread doesn't run on every render
  const marqCovers = useMemo(
    () => [...marqueeGames.slice(0, MARQUEE_COUNT), ...marqueeGames.slice(0, MARQUEE_COUNT)],
    [marqueeGames],
  );

  // ── Unauthenticated hero ────────────────────────────────────────────────
  if (!userId) {
    return (
      <View style={hero.screen}>
        <ScreenHeader />
        <View style={hero.body}>
          <Text style={hero.heading}>{'Find your next\nfavourite game.'}</Text>
          <Text style={hero.sub}>Track, rate and share the games you play.</Text>

          <View style={hero.coversWrapper}>
            <Animated.View style={[hero.coversRow, marqStyle]}>
              {marqCovers.map((game, idx) => {
                const url = game.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
                return url ? (
                  <Image
                    key={`${game.id}-${idx}`}
                    source={{ uri: url }}
                    style={hero.cover}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    key={`${game.id}-${idx}`}
                    style={[hero.cover, { backgroundColor: Colors.surfaceElevated }]}
                  />
                );
              })}
            </Animated.View>
            <LinearGradient
              colors={[Colors.background, 'transparent']}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={hero.fadeLeft}
            />
            <LinearGradient
              colors={['transparent', Colors.background]}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={hero.fadeRight}
            />
          </View>

          <Pressable onPress={() => router.push('/auth')} style={hero.signUpBtn}>
            <Text style={hero.signUpText}>Sign Up</Text>
          </Pressable>

          <View style={hero.signInRow}>
            <Text style={hero.signInText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/auth')}>
              <Text style={[hero.signInText, { color: Colors.accent }]}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Authenticated feed ──────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <ScreenHeader />

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['games', 'friends', 'lists'] as Feed[]).map((t) => {
          const active = feed === t;
          const label = t === 'games' ? 'Games' : t === 'friends' ? 'Friends' : 'Lists';
          return (
            <Pressable
              key={t}
              onPress={() => setFeed(t)}
              style={[styles.tabPill, active && styles.tabPillActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {feed === 'games' && (
          <>
            {/* Filter bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterBar}
            >
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                    onPress={() => onFilterChange(f.key)}
                  >
                    {active && <View style={styles.filterDot} />}
                    <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Hero carousel */}
            {loadingFeatured ? (
              <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                <Skeleton height={220} borderRadius={16} />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false}
                decelerationRate="fast"
                snapToInterval={CARD_W + 12}
                contentContainerStyle={styles.carouselContainer}
              >
                {featured.map((game) => (
                  <HeroCard
                    key={game.id}
                    game={game}
                    onPress={() => router.push(`/game/${game.id}`)}
                  />
                ))}
              </ScrollView>
            )}

            {/* Recommended for You */}
            <Text style={styles.sectionLabel}>RECOMMENDED FOR YOU</Text>
            {loadingRecommended ? (
              <View style={styles.recSkeletonGrid}>
                {[0, 1].map((i) => (
                  <Skeleton key={i} height={180} borderRadius={8} style={{ flex: 1 }} />
                ))}
              </View>
            ) : (
              <FlatList
                data={recommended}
                keyExtractor={(g) => String(g.id)}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item }) => (
                  <RecommendedCard
                    game={item}
                    onPress={() => router.push(`/game/${item.id}`)}
                  />
                )}
              />
            )}
          </>
        )}

        {feed === 'friends' && (
          <View style={{ marginTop: 8 }}>
            {loadingActivity ? (
              <View style={{ gap: 12, paddingHorizontal: 16 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Skeleton width={26} height={26} borderRadius={13} />
                    <Skeleton height={32} borderRadius={6} style={{ flex: 1 }} />
                    <Skeleton width={18} height={24} borderRadius={3} />
                  </View>
                ))}
              </View>
            ) : activity.length === 0 ? (
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
        )}

        {feed === 'lists' && (
          <View style={styles.listsEmpty}>
            <Text style={styles.listsEmptyText}>Lists are coming soon.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HeroCard({ game, onPress }: { game: IGDBGame; onPress: () => void }) {
  const imgUrl = heroImageUrl(game);
  return (
    <Pressable style={[heroCard.card, { width: CARD_W }]} onPress={onPress}>
      {imgUrl ? (
        <Image source={{ uri: imgUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.surfaceElevated }]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
      />
      <View style={heroCard.content}>
        <Text style={heroCard.title} numberOfLines={2}>{game.name}</Text>
        <View style={heroCard.meta}>
          {game.genres?.slice(0, 3).map((genre) => (
            <View key={genre.id} style={heroCard.genrePill}>
              <Text style={heroCard.genreText}>{genre.name}</Text>
            </View>
          ))}
          {game.total_rating != null && (
            <Text style={heroCard.rating}>★ {(game.total_rating / 10).toFixed(1)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function RecommendedCard({ game, onPress }: { game: IGDBGame; onPress: () => void }) {
  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
  return (
    <Pressable style={rec.card} onPress={onPress}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={rec.cover} resizeMode="cover" />
      ) : (
        <View style={[rec.cover, { backgroundColor: Colors.surfaceElevated }]} />
      )}
      <Text style={rec.title} numberOfLines={2}>{game.name}</Text>
      {game.total_rating != null && (
        <StarRating rating={game.total_rating / 10} size={11} />
      )}
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const hero = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  heading: { fontFamily: 'Syne_700Bold', fontSize: 38, color: Colors.textPrimary, lineHeight: 44 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textSecondary, marginTop: 12 },
  coversWrapper: { marginVertical: 36, overflow: 'hidden', height: COVER_H + 8 },
  coversRow: { flexDirection: 'row', alignItems: 'center' },
  cover: { width: COVER_W, height: COVER_H, borderRadius: 10, marginRight: COVER_GAP },
  fadeLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 60 },
  fadeRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 60 },
  signUpBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  signUpText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#0e0e10' },
  signInRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  signInText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
});

const heroCard = StyleSheet.create({
  card: { height: 220, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end' },
  content: { padding: 14, gap: 8 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 16, color: '#fff', lineHeight: 22 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  genrePill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  genreText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#fff' },
  rating: { fontFamily: 'Syne_700Bold', fontSize: 13, color: Colors.accent },
});

const rec = StyleSheet.create({
  card: { flex: 1 },
  cover: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border },
  title: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textPrimary, marginTop: 6, marginBottom: 4 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabPill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 6,
    borderWidth: 0.5, borderColor: Colors.border, backgroundColor: 'transparent',
  },
  tabPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  tabLabelActive: { fontFamily: 'Syne_700Bold', color: '#111' },
  filterBar: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Colors.surfaceElevated,
  },
  filterPillActive: { backgroundColor: Colors.accent },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#111' },
  filterLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  filterLabelActive: { fontFamily: 'Syne_700Bold', color: '#111' },
  carouselContainer: { gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  sectionLabel: {
    fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textMuted,
    letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 16,
  },
  recSkeletonGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  padH: { paddingHorizontal: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, paddingHorizontal: 16 },
  listsEmpty: { paddingTop: 80, alignItems: 'center' },
  listsEmptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted },
});
