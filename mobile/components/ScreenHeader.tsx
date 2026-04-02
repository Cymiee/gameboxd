import { View, Text, Pressable, StyleSheet, ToastAndroid, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

export default function ScreenHeader() {
  const insets = useSafeAreaInsets();

  function showComingSoon() {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Notifications coming soon', ToastAndroid.SHORT);
    } else {
      Alert.alert('Coming soon', 'Notifications are not yet available.');
    }
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Text style={styles.wordmark}>Shelved</Text>

      <Pressable onPress={showComingSoon} style={styles.bellButton}>
        <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  wordmark: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    color: Colors.accent,
  },
  bellButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
