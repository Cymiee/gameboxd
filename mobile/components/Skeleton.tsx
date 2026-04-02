import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';

interface Props {
  height: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ height, width, borderRadius = 6, style }: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: Colors.surfaceElevated,
          height,
          borderRadius,
          ...(width !== undefined ? { width } : {}),
        },
        animStyle,
        style,
      ]}
    />
  );
}
