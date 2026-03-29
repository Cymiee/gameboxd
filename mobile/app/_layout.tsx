import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useFonts, Syne_700Bold } from '@expo-google-fonts/syne';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { getProfile } from '@gameboxd/lib';
import LogModal from '../components/LogModal';

export default function RootLayout() {
  const { setUserId, setProfile } = useAuthStore();

  const [fontsLoaded] = useFonts({ Syne_700Bold, Inter_400Regular, Inter_500Medium });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setUserId(user?.id ?? null);
      if (user) {
        getProfile(supabase, user.id)
          .then(setProfile)
          .catch(() => setProfile(null));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        setUserId(user?.id ?? null);
        if (user) {
          try {
            const profile = await getProfile(supabase, user.id);
            setProfile(profile);
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [setUserId, setProfile]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="shelf/[status]" options={{ headerShown: false }} />
        <Stack.Screen name="list/[id]" options={{ headerShown: false }} />
      </Stack>
      <LogModal />
      </View>
    </GestureHandlerRootView>
  );
}
