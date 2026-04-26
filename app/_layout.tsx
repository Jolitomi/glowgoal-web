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
      
      const isAuthPage = 
        currentSegment === 'login' || 
        currentSegment === 'signup' || 
        currentSegment === '(auth)' ||
        currentSegment === 'index' || 
        !currentSegment;

      // NEW: Check if we are already where we need to be
      const isAlreadyInApp = 
        currentSegment === 'dashboard' || 
        currentSegment === 'goals' || 
        currentSegment === 'profile';

      if (user) {
        // 1. If the user is on Login/Signup, DO NOTHING.
        // Let LoginScreen's animations and finalizeLogin handle the navigation.
        if (isAuthPage) {
          return; 
        }

        // 2. If the user is already on the dashboard or other app pages, STOP.
        // This prevents the "Glitch" where the layout tries to redirect you 
        // to a page you are already standing on.
        if (isAlreadyInApp) {
          return;
        }

        // 3. This part now only runs on "Cold Starts" (opening the app while already logged in)
        const creationTime = new Date(user.metadata.creationTime || 0).getTime();
        const now = new Date().getTime();
        const isNewUser = now - creationTime < 10000;

        if (isNewUser) {
          router.replace('/personality');
        } else {
          router.replace('/dashboard');
        }
      } else {
        // 4. If no user, only redirect to welcome if we aren't already there
        if (segmentsRef.current.length > 0 && !isAuthPage) {
          router.replace('/');
        }
      }
    });
    return unsubscribe;
  }, []); // EMPTY dependency array is the key!

  return <Stack screenOptions={{ headerShown: false }} />;
}