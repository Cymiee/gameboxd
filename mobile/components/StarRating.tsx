import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ratingToStars } from '../utils/rating';
import { Colors } from '../constants/colors';

interface Props {
  rating: number | null;
  size?: number;
}

export default function StarRating({ rating, size = 14 }: Props) {
  if (rating == null) return null;

  const stars = ratingToStars(rating); // 0.5–5.0
  const positions = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {positions.map((pos) => {
        let name: React.ComponentProps<typeof Ionicons>['name'];
        if (stars >= pos) {
          name = 'star';
        } else if (stars >= pos - 0.5) {
          name = 'star-half';
        } else {
          name = 'star-outline';
        }
        return (
          <Ionicons key={pos} name={name} size={size} color={Colors.accent} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
});
