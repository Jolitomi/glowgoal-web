import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { auth } from '../lib/firebase';
import { registerForPushNotificationsAsync } from '../lib/notifications';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Handle Notifications
    registerForPushNotificationsAsync().catch((error) => {
      console.warn('Push registration failed:', error);
    });

    // 2. Handle Authentication Routing
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Cast segment to string to bypass the strict literal check
      const currentSegment = segments[0] as string;
      
      // Check if the user is on a screen that handles its own navigation
      const isAuthPage = 
        currentSegment === 'login' || 
        currentSegment === 'signup' || 
        currentSegment === '(auth)' ||
        currentSegment === 'index' || // The welcome/root screen
        !currentSegment; // Fallback for empty segments

      if (user) {
        // If they are on an auth-related page, let that page's 
        // internal logic (animations/checks) handle the redirect.
        if (isAuthPage) {
          return; 
        }

        const creationTime = new Date(user.metadata.creationTime || 0).getTime();
        const now = new Date().getTime();
        const isNewUser = now - creationTime < 10000;

        if (isNewUser) {
          router.replace('/personality');
        } else {
          router.replace('/dashboard');
        }
      } else {
        // If no user, only redirect to welcome if we aren't already there
        if (segments.length > 0 && !isAuthPage) {
          router.replace('/');
        }
      }
    });

    return unsubscribe;
  }, [segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}