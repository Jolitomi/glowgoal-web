import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { scheduleDailyReminders } from '../lib/daily-reminder-engine';
import { auth } from '../lib/firebase';
import { registerForPushNotificationsAsync } from '../lib/notifications';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const anyLoading = loading || googleLoading;

  // Custom Modal State for Web-friendly Alerts
  const [errorModal, setErrorModal] = useState<{visible: boolean, message: string}>({
    visible: false,
    message: '',
  });

  const showError = (msg: string) => {
    setErrorModal({ visible: true, message: msg });
  };

  const float = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstRotate = useRef(new Animated.Value(0)).current;

  const jump = useRef(new Animated.Value(0)).current;

  // ===============================
  // GOOGLE AUTH REQUEST HOOK
  // ===============================
  const [googleRequest, googleResponse, promptGoogleSignIn] =
    Google.useIdTokenAuthRequest({
      webClientId:
        '146035975275-rrovmbvblm2uh5jd2hvp9pnbitvta8ti.apps.googleusercontent.com',
      androidClientId:
        '146035975275-ucd45fgn5u8i45uut6lct6r21is9qlej.apps.googleusercontent.com',
      iosClientId:
        '146035975275-3qp84p3oi3b20rbcqrpqkfvq8vm3co5c',
      redirectUri: Platform.OS === 'web' ? 'https://glowgoal.com.ng/login' : AuthSession.makeRedirectUri({ scheme: 'glowgoal' }),
    });

  // ===============================
  // FIXED FINAL LOGIN FLOW
  // ===============================
 const finalizeLogin = async (user: any) => {
    try {
      // 1. Trigger Animations immediately
      triggerSuccessBurst();
      triggerVictoryJump();

      // 2. Background tasks (Tokens & Reminders)
      const performSetup = async () => {
        try {
          await scheduleDailyReminders(user.uid, 'hype');
          const token = await registerForPushNotificationsAsync();
          if (token) {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            await updateDoc(doc(db, 'users', user.uid), {
              pushToken: token,
              lastLogin: new Date(),
            });
          }
        } catch (err) {
          console.warn('Background setup failed:', err);
        }
      };
      performSetup();

      // 3. Firestore check (determine if new user)
      let userExists = false;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');

        // IMPORTANT: Double check your collection name is 'users' in Firebase Console
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        
        if (snap.exists()) {
          userExists = true;
          console.log("User document found. Proceeding to Dashboard.");
        } else {
          console.log("No user document found for UID:", user.uid);
          userExists = false;
        }
      } catch (err) {
        // If there's a permission error, we default to dashboard so they aren't stuck
        console.error('Firestore check error:', err);
        userExists = true; 
      }

      // 4. Controlled Navigation
      setTimeout(() => {
        if (!userExists) {
          // Only go to launch if we are 100% sure the doc doesn't exist
          router.replace('/launch');
        } else {
          router.replace('/dashboard');
        }
      }, 2200);

    } catch (error) {
      console.error('Login finalization failed:', error);
      router.replace('/dashboard');
    }
  };

  // ===============================
  // GOOGLE LOGIN LOGIC
  // ===============================
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          await finalizeLogin(result.user);
        }
        return;
      }
      promptGoogleSignIn();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      showError(message);
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (googleResponse?.type !== 'success') return;
      try {
        setGoogleLoading(true);
        const idToken = googleResponse.authentication?.idToken || googleResponse.params?.id_token;
        if (!idToken) throw new Error('No Google ID token received');

        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        await finalizeLogin(result.user);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google login failed';
        showError(message);
        setGoogleLoading(false);
      }
    };
    handleGoogleResponse();
  }, [googleResponse]);

  // ===============================
  // EMAIL LOGIN LOGIC
  // ===============================
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError('Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        await finalizeLogin(result.user);
      }
    } catch (error: any) {
      showError('Check your email/password and try again.');
      setLoading(false);
    }
  };

  // ===============================
  // ANIMATIONS
  // ===============================
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -14,
          duration: 2200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.07,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(rotate, {
          toValue: -1,
          duration: 2500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(glow, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-4deg', '4deg'],
  });

  const burstRotateInterpolate = burstRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '25deg'],
  });

  const triggerSuccessBurst = () => {
    burstScale.setValue(0);
    burstOpacity.setValue(0.95);
    burstRotate.setValue(0);

    Animated.parallel([
      Animated.timing(burstScale, {
        toValue: 1.9,
        duration: 650,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(burstOpacity, {
        toValue: 0,
        duration: 650,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(burstRotate, {
        toValue: 1,
        duration: 650,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  const triggerVictoryJump = () => {
    jump.setValue(0);

    Animated.sequence([
      Animated.timing(jump, {
        toValue: -42,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(jump, {
        toValue: 0,
        friction: 4,
        tension: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  return (
    <LinearGradient colors={['#828C6A', '#A0AB89', '#CCBEB1']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.responsiveWrapper, isDesktop && styles.desktopCard]}>
              <View style={styles.mascotWrap}>
                <Animated.View
                  style={[
                    styles.glow,
                    {
                      opacity: glow,
                      transform: [{ scale: glow }],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.burstRing,
                    {
                      opacity: burstOpacity,
                      transform: [
                        { scale: burstScale },
                        { rotate: burstRotateInterpolate },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.burstSparkHorizontal,
                    {
                      opacity: burstOpacity,
                      transform: [{ scale: burstScale }],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.burstSparkVertical,
                    {
                      opacity: burstOpacity,
                      transform: [{ scale: burstScale }],
                    },
                  ]}
                />
                <Animated.Image
                  source={require('../assets/images/star.png')}
                  resizeMode="contain"
                  style={[
                    styles.logoImage,
                    {
                      transform: [
                        { translateY: Animated.add(float, jump) },
                        { scale },
                        { rotate: rotateInterpolate },
                      ],
                    },
                  ]}
                />
              </View>

              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Your buddy missed you!</Text>

              <View style={styles.formCard}>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                />
                <View style={styles.passwordWrapper}>
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#666"
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#828C6A"
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => router.push('/forgotpassword')}
                  style={styles.forgotPasswordWrap}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </Pressable>

                <Pressable
                  onPress={handleLogin}
                  disabled={anyLoading}
                  style={styles.mainButton}
                >
                  <LinearGradient
                    colors={['#FFD580', '#FFB347']}
                    style={styles.mainButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#3B3128" />
                    ) : (
                      <Text style={styles.buttonText}>Log In</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.socialSection}>
                <Pressable
                  style={styles.socialButton}
                  onPress={handleGoogleSignIn}
                  disabled={anyLoading}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#2F2A26" />
                  ) : (
                    <Text style={styles.socialText}>Continue with Google</Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>New here?</Text>
                <Pressable onPress={() => router.push('/signup')}>
                  <Text style={styles.signupLink}> Create an account</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        transparent
        visible={errorModal.visible}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="alert-circle" size={40} color="#828C6A" />
            <Text style={styles.modalTitle}>Wait a second!</Text>
            <Text style={styles.modalText}>{errorModal.message}</Text>
            
            <Pressable 
              style={styles.modalButton} 
              onPress={() => setErrorModal({ ...errorModal, visible: false })}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  desktopCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 40,
    borderRadius: 40,
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 28,
    width: 220,
    height: 220,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 213, 128, 0.35)',
  },
  burstRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: 'rgba(255, 240, 190, 0.95)',
  },
  burstSparkHorizontal: {
    position: 'absolute',
    width: 200,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 244, 210, 0.9)',
  },
  burstSparkVertical: {
    position: 'absolute',
    width: 10,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 244, 210, 0.9)',
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#3A3128',
    marginBottom: 30,
    fontWeight: '600',
  },
  formCard: {
    width: '100%',
    gap: 12,
  },
  input: {
    backgroundColor: '#FFF',
    height: 55,
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    height: 55,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  eyeButton: {
    paddingRight: 15,
  },
  forgotPasswordWrap: {
    alignSelf: 'flex-end',
    marginTop: -2,
  },
  forgotPasswordText: {
    color: '#4F5A3E',
    fontWeight: '800',
    fontSize: 14,
  },
  mainButton: {
    width: '100%',
    marginTop: 6,
  },
  mainButtonGradient: {
    height: 55,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 18,
    color: '#3B3128',
  },
  socialSection: {
    width: '100%',
    marginTop: 15,
  },
  socialButton: {
    width: '100%',
    height: 55,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialText: {
    fontWeight: '700',
    color: '#2F2A26',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 25,
  },
  footerText: {
    color: '#3A3128',
  },
  signupLink: {
    fontWeight: '800',
    color: '#4F5A3E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3A3128',
    marginTop: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#828C6A',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 15,
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});