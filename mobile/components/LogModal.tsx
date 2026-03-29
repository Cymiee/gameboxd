import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, Image,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { IGDBGame, GameStatus } from '@gameboxd/lib';
import { getCoverUrl, upsertGameLog } from '@gameboxd/lib';
import { useLogModal } from '../store/logModal';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';
import { searchGames } from '../lib/igdb';
import { Colors } from '../constants/colors';

const STATUSES: { label: string; value: GameStatus }[] = [
  { label: 'Playing', value: 'playing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Dropped', value: 'dropped' },
  { label: 'Want to Play', value: 'want_to_play' },
];

export default function LogModal() {
  const { isOpen, preselectedGame, close } = useLogModal();
  const { userId } = useAuthStore();

  const sheetRef = useRef<BottomSheet>(null);
  const [step, setStep] = useState<'search' | 'log'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState<IGDBGame | null>(null);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (preselectedGame) {
        setSelectedGame(preselectedGame);
        setStep('log');
      } else {
        setStep('search');
        setQuery('');
        setResults([]);
      }
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen, preselectedGame]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchGames(query, 15)); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function selectGame(game: IGDBGame) {
    setSelectedGame(game);
    setStatus('playing');
    setRating(null);
    setReview('');
    setStep('log');
  }

  async function handleSave() {
    if (!userId || !selectedGame) return;
    setSaving(true);
    try {
      await upsertGameLog(supabase, userId, selectedGame.id, status, rating, review || null);
      handleClose();
    } catch {
      // silent fail — user can retry
    } finally {
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    close();
    setStep('search');
    setQuery('');
    setResults([]);
    setSelectedGame(null);
    setRating(null);
    setReview('');
  }, [close]);

  const showRating = status === 'completed' || status === 'dropped';
  const coverUrl = selectedGame?.cover ? getCoverUrl(selectedGame.cover.image_id, 'cover_big') : null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['90%']}
      enablePanDownToClose
      onClose={handleClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {step === 'search' && (
            <View>
              <Text style={styles.stepTitle}>Log a game</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search games..."
                placeholderTextColor={Colors.textMuted}
                autoFocus
                style={styles.searchInput}
              />
              {searching ? (
                <ActivityIndicator color={Colors.accent} style={{ marginTop: 24 }} />
              ) : (
                results.map((g) => <SearchRow key={g.id} game={g} onPress={selectGame} />)
              )}
            </View>
          )}

          {step === 'log' && selectedGame && (
            <View>
              <Pressable onPress={() => setStep('search')} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </Pressable>
              <View style={styles.gameHeader}>
                {coverUrl && (
                  <Image source={{ uri: coverUrl }} style={styles.gameCover} resizeMode="cover" />
                )}
                <Text style={styles.gameTitle}>{selectedGame.name}</Text>
              </View>

              <Text style={styles.label}>STATUS</Text>
              <View style={styles.pillRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s.value}
                    onPress={() => setStatus(s.value)}
                    style={[styles.pill, status === s.value && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, status === s.value && styles.pillTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {showRating && (
                <>
                  <Text style={styles.label}>RATING</Text>
                  <View style={styles.ratingRow}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setRating(rating === n ? null : n)}
                        style={[styles.ratingBtn, rating === n && styles.ratingBtnActive]}
                      >
                        <Text style={[styles.ratingBtnText, rating === n && styles.ratingBtnTextActive]}>
                          {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>REVIEW</Text>
              <TextInput
                value={review}
                onChangeText={setReview}
                placeholder="Write a review..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                style={styles.reviewInput}
              />

              {!userId && (
                <Text style={styles.signInNote}>Sign in to save games to your shelf</Text>
              )}
              <Pressable
                onPress={handleSave}
                disabled={saving || !userId}
                style={[styles.saveBtn, (saving || !userId) && styles.saveBtnDisabled]}
              >
                <Text style={[styles.saveBtnText, !userId && styles.saveBtnTextDisabled]}>
                  {saving ? 'Saving…' : 'Save to shelf'}
                </Text>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function SearchRow({ game, onPress }: { game: IGDBGame; onPress: (g: IGDBGame) => void }) {
  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;
  return (
    <Pressable style={styles.resultRow} onPress={() => onPress(game)}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.resultCover} resizeMode="cover" />
      ) : (
        <View style={[styles.resultCover, { backgroundColor: Colors.surfaceElevated }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.resultTitle} numberOfLines={1}>{game.name}</Text>
        {year && <Text style={styles.resultMeta}>{year}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: Colors.surface },
  handle: { backgroundColor: Colors.border },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  stepTitle: { fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 12 },
  searchInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  resultCover: { width: 52, height: 69, borderRadius: 6 },
  resultTitle: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textPrimary },
  resultMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  backBtn: { marginBottom: 12 },
  backText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  gameHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  gameCover: { width: 80, height: 107, borderRadius: 8, borderWidth: 0.5, borderColor: Colors.border },
  gameTitle: { flex: 1, fontFamily: 'Syne_700Bold', fontSize: 15, color: Colors.textPrimary },
  label: { fontFamily: 'Inter_400Regular', fontSize: 9, color: Colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 0.5, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  pillTextActive: { color: '#111' },
  ratingRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  ratingBtn: {
    flex: 1, height: 32, borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  ratingBtnActive: { backgroundColor: Colors.accent },
  ratingBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textMuted },
  ratingBtnTextActive: { color: '#111' },
  reviewInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 8, padding: 10,
    color: Colors.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 13,
    textAlignVertical: 'top', minHeight: 72, marginBottom: 16,
  },
  signInNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: Colors.accent, borderRadius: 10, height: 48,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  saveBtnText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#111' },
  saveBtnTextDisabled: { color: Colors.textMuted },
});
