import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../constants/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index:    { label: 'Home',     icon: 'home-outline',    activeIcon: 'home' },
  explore:  { label: 'Search',   icon: 'search-outline',  activeIcon: 'search' },
  discover: { label: 'Discover', icon: 'compass-outline', activeIcon: 'compass' },
  shelf:    { label: 'My Shelf', icon: 'layers-outline',  activeIcon: 'layers' },
  profile:  { label: 'Profile',  icon: 'person-outline',  activeIcon: 'person' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((r) => TAB_CONFIG[r.name]);

  function renderTab(route: typeof state.routes[0]) {
    const cfg = TAB_CONFIG[route.name];
    if (!cfg) return null;
    const focused = state.routes[state.index]?.name === route.name;
    const color = focused ? Colors.accent : '#555555';

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
        <Ionicons name={focused ? cfg.activeIcon : cfg.icon} size={22} color={color} />
        <Text style={[s.label, { color }]}>{cfg.label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[s.barOuter, { paddingBottom: insets.bottom }]}>
      <View style={s.hairline} />
      <View style={s.bar}>
        {visibleRoutes.map(renderTab)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  barOuter: {
    backgroundColor: '#111111',
  },
  hairline: {
    height: 0.5,
    backgroundColor: '#1e1e1e',
  },
  bar: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: '100%',
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
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
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="shelf" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
