import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ratingToStars, starsToRating } from '../utils/rating';
import { Colors } from '../constants/colors';

interface Props {
  value: number | null;  // raw 1–10 stored value
  onChange: (v: number | null) => void;
}

const STAR_WIDTH = 36;

export default function StarRatingInput({ value, onChange }: Props) {
  const currentStars = value != null ? ratingToStars(value) : null;

  function handlePress(stars: number) {
    const newRaw = starsToRating(stars);
    // Deselect if tapping the already-selected value
    if (value === newRaw) {
      onChange(null);
    } else {
      onChange(newRaw);
    }
  }

  const positions = [1, 2, 3, 4, 5];

  return (
    <View style={s.container}>
      <View style={s.starsRow}>
        {positions.map((pos) => {
          const halfStarVal = pos - 0.5;
          const fullStarVal = pos;

          let iconName: React.ComponentProps<typeof Ionicons>['name'];
          if (currentStars != null && currentStars >= fullStarVal) {
            iconName = 'star';
          } else if (currentStars != null && currentStars >= halfStarVal) {
            iconName = 'star-half';
          } else {
            iconName = 'star-outline';
          }

          return (
            <View key={pos} style={s.starSlot}>
              {/* Left half → half star */}
              <Pressable
                style={s.halfPressable}
                onPress={() => handlePress(halfStarVal)}
                hitSlop={4}
              />
              {/* Right half → full star */}
              <Pressable
                style={s.halfPressable}
                onPress={() => handlePress(fullStarVal)}
                hitSlop={4}
              />
              {/* Visual icon — pointer-events none so presses go to halves */}
              <View style={s.iconOverlay} pointerEvents="none">
                <Ionicons name={iconName} size={32} color={Colors.accent} />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={s.label}>
        {currentStars != null ? `${currentStars} star${currentStars !== 1 ? 's' : ''}` : 'Not rated'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', gap: 4 },
  starSlot: {
    width: STAR_WIDTH,
    height: STAR_WIDTH,
    flexDirection: 'row',
    position: 'relative',
  },
  halfPressable: {
    flex: 1,
    height: '100%',
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
});
