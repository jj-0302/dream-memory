import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dreamTheme as c } from '../constants/dream-theme';

type Tab = 'home' | 'history' | 'insights' | 'data';

const tabs = [
  { id: 'home', label: '首页', icon: '⌂', href: '/' },
  { id: 'history', label: '梦境', icon: '▤', href: '/history' },
  { id: 'insights', label: '洞察', icon: '◔', href: '/insights' },
  { id: 'data', label: '我的', icon: '◌', href: '/data-management' },
] as const;

export function DreamBottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
        const selected = tab.id === active;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!selected) router.replace(tab.href);
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Text style={[styles.icon, selected && styles.selected]}>{tab.icon}</Text>
            <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    paddingTop: 10,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  item: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  icon: { color: c.muted, fontSize: 24, lineHeight: 27 },
  label: { color: c.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  selected: { color: c.primaryDark },
  pressed: { opacity: 0.65 },
});
