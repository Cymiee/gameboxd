import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  Image, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform, ToastAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { IGDBGame } from '@gameboxd/lib';
import { getCoverUrl } from '@gameboxd/lib';
import { searchGames, getTopRated, getTrendingGames, getGamesByGenre } from '../../lib/igdb';
import ScreenHeader from '../../components/ScreenHeader';
import HorizontalGameScroll from '../../components/HorizontalGameScroll';
import { Colors } from '../../constants/colors';

const GENRES = [
  { id: 12, name: 'RPG' }, { id: 31, name: 'Adventure' }, { id: 5, name: 'Shooter' },
  { id: 14, name: 'Sport' }, { id: 10, name: 'Racing' }, { id: 25, name: 'Hack & Slash' },
  { id: 11, name: 'Real Time Strategy' }, { id: 2, name: 'Point-and-click' },
  { id: 4, name: 'Fighting' }, { id: 8, name: 'Platform' }, { id: 9, name: 'Puzzle' },
  { id: 13, name: 'Simulator' }, { id: 15, name: 'Strategy' },
];

const PLATFORMS = ['PS5', 'Xbox Series X', 'PC', 'Nintendo Switch', 'iOS', 'Android'];
const YEARS = ['2020s', '2010s', '2000s', '90s', '80s'];

export default function ExploreScreen() {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [topRated, setTopRated] = useState<IGDBGame[]>([]);
  const [popular, setPopular] = useState<IGDBGame[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tr, pop] = await Promise.all([getTopRated(10), getTrendingGames(10)]);
        setTopRated(tr);
        setPopular(pop);
      } catch {
        // silent
      } finally {
        setLoadingBrowse(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchGames(query)); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function goToGame(game: IGDBGame) { router.push(`/game/${game.id}`); }

  const goToGenre = useCallback((_genreId: number) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Browse by genre coming soon', ToastAndroid.SHORT);
    } else {
      Alert.alert('Coming soon', 'Browse by genre is not yet available.');
    }
  }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!query) setFocused(false); }}
          placeholder="Search games..."
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {(focused || query.length > 0) && (
          <Pressable
            onPress={() => { setQuery(''); setFocused(false); setResults([]); }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {(focused || query.length > 0) ? (
        searching ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 32 }} />
        ) : results.length === 0 && query.length > 0 ? (
          <View style={styles.centred}>
            <Text style={styles.emptyText}>No results</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(g) => String(g.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <SearchResultRow game={item} onPress={goToGame} />}
          />
        )
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
          <Text style={styles.label}>BROWSE BY GENRE</Text>
          <View style={styles.pillWrap}>
            {GENRES.map((g) => (
              <Pressable key={g.id} style={styles.pill} onPress={() => goToGenre(g.id)}>
                <Text style={styles.pillText}>{g.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>BROWSE BY PLATFORM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
            {PLATFORMS.map((p) => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{p}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.label}>BROWSE BY YEAR</Text>
          <View style={styles.pillWrap}>
            {YEARS.map((y) => (
              <View key={y} style={styles.pill}>
                <Text style={styles.pillText}>{y}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 8 }]}>TOP RATED ALL TIME</Text>
          <HorizontalGameScroll games={topRated} loading={loadingBrowse} onPress={goToGame} />

          <Text style={[styles.label, { marginTop: 16 }]}>MOST POPULAR THIS WEEK</Text>
          <HorizontalGameScroll games={popular} loading={loadingBrowse} onPress={goToGame} />

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

function SearchResultRow({ game, onPress }: { game: IGDBGame; onPress: (g: IGDBGame) => void }) {
  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;
  return (
    <Pressable style={rowStyles.row} onPress={() => onPress(game)}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={rowStyles.cover} resizeMode="cover" />
      ) : (
        <View style={[rowStyles.cover, { backgroundColor: Colors.surfaceElevated }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.title} numberOfLines={1}>{game.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {year && <Text style={rowStyles.meta}>{year}</Text>}
          {game.genres?.slice(0, 2).map((g) => (
            <View key={g.id} style={rowStyles.genrePill}>
              <Text style={rowStyles.genreText}>{g.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 16 },
  cover: { width: 52, height: 69, borderRadius: 6, flexShrink: 0 },
  title: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textPrimary },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  genrePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 999,
  },
  genreText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  hRow: { gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 999,
  },
  pillText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
});
