import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import { auth } from '../lib/firebase';
import { registerForPushNotificationsAsync } from '../lib/notifications';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  
  // We use a Ref to keep track of the current segments without 
  // re-triggering the useEffect constantly
  const segmentsRef = useRef(segments);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    // 1. Handle Notifications
    registerForPushNotificationsAsync().catch((error) => {
      console.warn('Push registration failed:', error);
    });

    // 2. Handle Authentication Routing
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentSegment = segmentsRef.current[0] as string;
      
      // Determine if we are on a page that should handle its own logic
      const isAuthPage = 
        currentSegment === 'login' || 
        currentSegment === 'signup' || 
        currentSegment === '(auth)' ||
        currentSegment === 'index' || 
        !currentSegment;

      if (user) {
        // --- THE TRAP FIX ---
        // If the user is already inside the app (not on an auth page), 
        // STOP. Do not force them back to the dashboard.
        if (!isAuthPage) {
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
        // Only redirect to welcome if they aren't already on an auth page
        if (segmentsRef.current.length > 0 && !isAuthPage) {
          router.replace('/');
        }
      }
    });

    return unsubscribe;
  }, []); // EMPTY dependency array is the key!

  return <Stack screenOptions={{ headerShown: false }} />;
}