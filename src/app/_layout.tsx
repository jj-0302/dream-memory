import { Stack } from 'expo-router';
import { dreamTheme } from '../constants/dream-theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: dreamTheme.background,
        },
      }}
    />
  );
}
