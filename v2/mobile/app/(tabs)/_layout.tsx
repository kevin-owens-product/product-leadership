import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { Colors, Spacing, FontSize } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  iconFocused: IoniconsName;
  iconDefault: IoniconsName;
}

const TAB_CONFIG: TabConfig[] = [
  { name: 'index', title: 'Home', iconFocused: 'home', iconDefault: 'home-outline' },
  { name: 'create', title: 'Create', iconFocused: 'add-circle', iconDefault: 'add-circle-outline' },
  { name: 'profile', title: 'Profile', iconFocused: 'person', iconDefault: 'person-outline' },
];

/**
 * Custom tab bar that renders a MiniPlayer above the tab buttons.
 */
function CustomTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: any;
  descriptors: any;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tabBarWrapper}>
      <MiniPlayer />
      <View
        style={[
          styles.tabBar,
          { paddingBottom: insets.bottom || Spacing.sm },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? Colors.accent : Colors.textTertiary;

          const tabConfig = TAB_CONFIG.find((t) => t.name === route.name);
          const iconName = isFocused
            ? tabConfig?.iconFocused ?? 'ellipse'
            : tabConfig?.iconDefault ?? 'ellipse-outline';
          const label = tabConfig?.title ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            >
              <Ionicons name={iconName} size={24} color={color} />
              <Text
                style={[
                  styles.tabLabel,
                  { color },
                  isFocused && styles.tabLabelFocused,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="create" options={{ title: 'Create' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBarWrapper: {
    backgroundColor: Colors.surface,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  tabLabelFocused: {
    fontWeight: '600',
  },
});
