import { Stack, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { auth } from '../lib/firebase';
import { registerForPushNotificationsAsync } from '../lib/notifications';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // 1. Handle Notifications
    registerForPushNotificationsAsync().catch((error) => {
      console.warn('Push registration failed:', error);
    });

    // 2. Handle Authentication Routing
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // --- THE FIX ---
        // Check if the account was created in the last 10 seconds
        const creationTime = new Date(user.metadata.creationTime || 0).getTime();
        const now = new Date().getTime();
        const isNewUser = now - creationTime < 10000; // 10-second window

        if (isNewUser) {
          router.replace('/personality');
        } else {
          router.replace('/dashboard');
        }
        // ----------------
      } else {
        router.replace('/');
      }
    });

    return unsubscribe;
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}