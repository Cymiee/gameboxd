import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth';
import { useLogModal } from '../../store/logModal';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index:   { label: 'Home',     icon: 'home-outline',   activeIcon: 'home' },
  explore: { label: 'Search',   icon: 'search-outline', activeIcon: 'search' },
  shelf:   { label: 'My Shelf', icon: 'layers-outline', activeIcon: 'layers' },
  profile: { label: 'Profile',  icon: 'person-outline', activeIcon: 'person' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();
  const { open } = useLogModal();
  const router = useRouter();

  const visibleRoutes = state.routes.filter((r) => !!TAB_CONFIG[r.name]);

  const left = visibleRoutes.slice(0, 2);
  const right = visibleRoutes.slice(2);

  function renderTab(route: typeof state.routes[0]) {
    const cfg = TAB_CONFIG[route.name];
    if (!cfg) return null;
    const focused = state.routes[state.index]?.name === route.name;
    const color = focused ? Colors.accent : 'rgba(255,255,255,0.35)';

    return (
      <Pressable
        key={route.key}
        style={s.tab}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, {});
          }
        }}
      >
        <View style={[s.tabInner, focused && s.tabInnerActive]}>
          <Ionicons name={focused ? cfg.activeIcon : cfg.icon} size={20} color={color} />
          <Text style={[s.label, { color }, focused && s.labelActive]}>{cfg.label}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={[s.floatOuter, { bottom: insets.bottom + 8 }]}
      pointerEvents="box-none"
    >
      <View style={s.pill} pointerEvents="auto">
        {left.map(renderTab)}

        <View style={s.centerSlot}>
          <Pressable style={s.centerBtn} onPress={() => { if (userId) { open(); } else { router.push('/auth'); } }}>
            <Ionicons name="add" size={28} color="#0e0e10" />
          </Pressable>
        </View>

        {right.map(renderTab)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  floatOuter: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,15,15,0.85)',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 64,
    alignItems: 'center',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabInnerActive: {
    backgroundColor: 'rgba(228,255,26,0.13)',
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  labelActive: {
    fontFamily: 'Inter_500Medium',
  },
  centerSlot: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="shelf" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
