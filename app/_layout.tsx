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
        
        router.replace('/dashboard'); 
      } else {
        // 
        router.replace('/');
      }
    });

    return unsubscribe; 
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}