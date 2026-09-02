import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ensureSeeded } from '../lib/storage';
import { requestNotificationPermission } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    ensureSeeded();
    requestNotificationPermission();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ title: 'Settings', presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
