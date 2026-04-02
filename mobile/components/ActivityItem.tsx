import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { ActivityWithUser } from '@gameboxd/lib';
import { useAuthStore } from '../store/auth';
import StarRating from './StarRating';
import { Colors } from '../constants/colors';

interface Props {
  item: ActivityWithUser;
  gameCover?: string | null;
  gameName?: string;
}

export default function ActivityItem({ item, gameCover, gameName }: Props) {
  const router = useRouter();
  const { userId: currentUserId } = useAuthStore();
  const initial = item.user.username[0]?.toUpperCase() ?? '?';

  const meta = item.metadata as Record<string, unknown> | null;
  const rating = typeof meta?.rating === 'number' ? meta.rating : null;
  const status = typeof meta?.status === 'string' ? meta.status : null;

  function buildActionText(): string {
    if (item.type === 'rated' && rating != null) return `rated ${gameName ?? 'a game'}`;
    if (item.type === 'reviewed') return `reviewed ${gameName ?? 'a game'}`;
    if (item.type === 'topped') return `added ${gameName ?? 'a game'} to favourites`;
    if (status) {
      const readable = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return `marked ${gameName ?? 'a game'} as ${readable}`;
    }
    return `logged ${gameName ?? 'a game'}`;
  }

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/game/${item.game_igdb_id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.line} numberOfLines={2}>
          <Text
            style={styles.username}
            suppressHighlighting
            onPress={() => {
              if (item.user.id !== currentUserId) router.push(`/user/${item.user.id}`);
            }}
          >
            {item.user.username}
          </Text>
          <Text style={styles.action}> {buildActionText()}</Text>
        </Text>
        {rating != null && (
          <StarRating rating={rating} size={12} />
        )}
      </View>
      {gameCover ? (
        <Image source={{ uri: gameCover }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
    gap: 10,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.accent,
  },
  textBlock: { flex: 1 },
  line: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  username: { fontFamily: 'Inter_500Medium', color: Colors.textPrimary },
  action: { color: Colors.textSecondary },
  thumb: {
    width: 18,
    height: 24,
    borderRadius: 3,
    flexShrink: 0,
  },
  thumbPlaceholder: { backgroundColor: Colors.surfaceElevated },
});
