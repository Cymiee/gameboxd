import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { IGDBGame } from '@gameboxd/lib';
import { getCoverUrl } from '@gameboxd/lib';
import { Colors } from '../constants/colors';

interface GameCardProps {
  game: IGDBGame;
  width?: number;
  onPress: (game: IGDBGame) => void;
}

export default function GameCard({ game, width = 110, onPress }: GameCardProps) {
  const height = Math.round(width * 1.5);
  const coverUrl = game.cover ? getCoverUrl(game.cover.image_id, 'cover_big') : null;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={() => onPress(game)}
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
    >
      <Animated.View style={animStyle}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={[styles.cover, { width, height }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, { width, height }]} />
        )}
        <Text style={styles.title} numberOfLines={1}>{game.name}</Text>
        {game.rating != null && (
          <Text style={styles.rating}>{(game.rating / 10).toFixed(1)}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 0 },
  cover: {
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  placeholder: {
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  rating: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.accent,
    marginTop: 1,
  },
});
