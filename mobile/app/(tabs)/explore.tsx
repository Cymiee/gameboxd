import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, Keyboard,
  Image, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform, ToastAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { IGDBGame } from '@gameboxd/lib';
import { getCoverUrl } from '@gameboxd/lib';
import type { FriendStatusResult } from '@gameboxd/lib';
import {
  getFriendshipStatus, sendFriendRequest, acceptFriendRequest, declineFriendRequest,
} from '@gameboxd/lib';
import { searchGames, getTopRated, getTrendingGames, getGamesByGenre } from '../../lib/igdb';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
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

type SearchMode = 'games' | 'people';

type UserResult = {
  id: string;
  username: string;
  status: FriendStatusResult['status'];
  friendshipId: string | null;
};

export default function ExploreScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();

  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('games');

  const [results, setResults] = useState<IGDBGame[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
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

  // Games search
  useEffect(() => {
    if (searchMode !== 'games') return;
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchGames(query)); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, searchMode]);

  // People search
  useEffect(() => {
    if (searchMode !== 'people') return;
    if (!userId) return;
    if (!query.trim()) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username')
          .ilike('username', `%${query.trim()}%`)
          .limit(20);
        if (error) throw error;
        const filtered = (data ?? []).filter((u) => u.id !== userId);
        const statuses = await Promise.all(
          filtered.map((u) => getFriendshipStatus(supabase, userId, u.id)),
        );
        setUserResults(
          filtered.map((u, i) => ({
            id: u.id,
            username: u.username,
            status: statuses[i].status,
            friendshipId: statuses[i].friendshipId,
          })),
        );
      } catch {
        setUserResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, searchMode, userId]);

  // Clear results when switching modes
  function handleModeChange(mode: SearchMode) {
    setSearchMode(mode);
    setResults([]);
    setUserResults([]);
  }

  async function refreshUserStatus(targetUserId: string) {
    if (!userId) return;
    const result = await getFriendshipStatus(supabase, userId, targetUserId);
    setUserResults((prev) =>
      prev.map((u) =>
        u.id === targetUserId
          ? { ...u, status: result.status, friendshipId: result.friendshipId }
          : u,
      ),
    );
  }

  function goToGame(game: IGDBGame) { router.push(`/game/${game.id}`); }

  const goToGenre = useCallback((_genreId: number) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Browse by genre coming soon', ToastAndroid.SHORT);
    } else {
      Alert.alert('Coming soon', 'Browse by genre is not yet available.');
    }
  }, []);

  const showSearchArea = focused || query.length > 0;

  function renderSearchResults() {
    if (searchMode === 'people') {
      if (!userId) {
        return (
          <View style={styles.signInBanner}>
            <Text style={styles.signInBannerText}>Sign in to search for friends</Text>
            <Pressable onPress={() => router.push('/auth')} style={styles.signInBannerBtn}>
              <Text style={styles.signInBannerBtnText}>Sign in</Text>
            </Pressable>
          </View>
        );
      }
      if (!query.trim()) {
        return (
          <View style={styles.centred}>
            <Text style={styles.emptyText}>Search for friends by username</Text>
          </View>
        );
      }
      if (searching) return <ActivityIndicator color={Colors.accent} style={{ marginTop: 32 }} />;
      if (userResults.length === 0) {
        return (
          <View style={styles.centred}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={userResults}
          keyExtractor={(u) => u.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <UserResultRow
              user={{ id: item.id, username: item.username }}
              friendshipStatus={item.status}
              friendshipId={item.friendshipId}
              onStatusChange={() => refreshUserStatus(item.id)}
            />
          )}
        />
      );
    }

    // Games mode
    if (searching) return <ActivityIndicator color={Colors.accent} style={{ marginTop: 32 }} />;
    if (results.length === 0 && query.length > 0) {
      return (
        <View style={styles.centred}>
          <Text style={styles.emptyText}>No results</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={results}
        keyExtractor={(g) => String(g.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => <SearchResultRow game={item} onPress={goToGame} />}
      />
    );
  }

  return (
    <Pressable style={styles.screen} onPress={Keyboard.dismiss}>
      <ScreenHeader />

      {/* Search input */}
      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!query) setFocused(false); }}
          placeholder={searchMode === 'people' ? 'Search people...' : 'Search games...'}
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {(focused || query.length > 0) && (
          <Pressable
            onPress={() => { setQuery(''); setFocused(false); setResults([]); setUserResults([]); }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* Mode toggle */}
      <View style={styles.toggleRow}>
        {(['games', 'people'] as SearchMode[]).map((mode) => {
          const active = searchMode === mode;
          return (
            <Pressable
              key={mode}
              style={[styles.togglePill, active && styles.togglePillActive]}
              onPress={() => handleModeChange(mode)}
            >
              <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                {mode === 'games' ? 'Games' : 'People'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showSearchArea || searchMode === 'people' ? (
        renderSearchResults()
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 90 }}>
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
    </Pressable>
  );
}

// ── Game result row ───────────────────────────────────────────────────────────

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

// ── User result row ───────────────────────────────────────────────────────────

function UserResultRow({
  user, friendshipStatus, friendshipId, onStatusChange,
}: {
  user: { id: string; username: string };
  friendshipStatus: FriendStatusResult['status'];
  friendshipId: string | null;
  onStatusChange: () => void;
}) {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!userId || busy) return;
    setBusy(true);
    try {
      await sendFriendRequest(supabase, userId, user.id);
      onStatusChange();
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    if (!friendshipId || busy) return;
    setBusy(true);
    try {
      await acceptFriendRequest(supabase, friendshipId, userId!);
      onStatusChange();
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!friendshipId || busy) return;
    setBusy(true);
    try {
      await declineFriendRequest(supabase, friendshipId, userId!);
      onStatusChange();
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  function renderAction() {
    switch (friendshipStatus) {
      case 'none':
        return (
          <Pressable style={userRowStyles.addBtn} onPress={handleAdd} disabled={busy}>
            <Text style={userRowStyles.addBtnText}>Add Friend</Text>
          </Pressable>
        );
      case 'pending_sent':
        return <Text style={userRowStyles.mutedLabel}>Requested</Text>;
      case 'pending_received':
        return (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable style={userRowStyles.acceptBtn} onPress={handleAccept} disabled={busy}>
              <Text style={userRowStyles.acceptBtnText}>Accept</Text>
            </Pressable>
            <Pressable style={userRowStyles.declineBtn} onPress={handleDecline} disabled={busy}>
              <Text style={userRowStyles.declineBtnText}>Decline</Text>
            </Pressable>
          </View>
        );
      case 'accepted':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={15} color={Colors.accent} />
            <Text style={userRowStyles.friendsLabel}>Friends</Text>
          </View>
        );
    }
  }

  return (
    <View style={userRowStyles.row}>
      <View style={userRowStyles.avatar}>
        <Text style={userRowStyles.avatarText}>{user.username[0]?.toUpperCase()}</Text>
      </View>
      <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); router.push(`/user/${user.id}`); }}>
        <Text style={userRowStyles.username} numberOfLines={1}>{user.username}</Text>
      </Pressable>
      {renderAction()}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 16 },
  cover: { width: 52, height: 69, borderRadius: 6, flexShrink: 0 },
  title: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textPrimary },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  genrePill: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: Colors.surfaceElevated, borderRadius: 999,
  },
  genreText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted },
});

const userRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.accent },
  username: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textPrimary },
  addBtn: {
    backgroundColor: 'rgba(180,255,0,0.15)',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.accent },
  mutedLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  acceptBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  acceptBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#111' },
  declineBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  declineBtnText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  friendsLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.accent },
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
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  togglePillActive: { backgroundColor: Colors.accent },
  toggleLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  toggleLabelActive: { fontFamily: 'Syne_700Bold', color: '#111' },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted },
  signInBanner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  signInBannerText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted },
  signInBannerBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  signInBannerBtnText: { fontFamily: 'Syne_700Bold', fontSize: 14, color: '#111' },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  hRow: { gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
});
