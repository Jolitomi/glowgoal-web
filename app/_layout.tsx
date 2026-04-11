import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync().catch((error) => {
      console.warn('Push registration failed:', error);
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}