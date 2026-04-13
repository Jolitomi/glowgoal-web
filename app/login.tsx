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
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
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

  const float = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstRotate = useRef(new Animated.Value(0)).current;

  const jump = useRef(new Animated.Value(0)).current;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error: any) {
        Alert.alert('Google Error', error.message);
        setGoogleLoading(false);
      }
    } else {
      promptGoogleSignIn();
    }
  };

  const [googleRequest, googleResponse, promptGoogleSignIn] =
    Google.useIdTokenAuthRequest({
      webClientId:
        '146035975275-rrovmbvblm2uh5jd2hvp9pnbitvta8ti.apps.googleusercontent.com',
      androidClientId:
        '146035975275-ucd45fgn5u8i45uut6lct6r21is9qlej.apps.googleusercontent.com',
      iosClientId:
        '146035975275-3qp84p3oi3b20rbcqrpqkfvq8vm3co5c.apps.googleusercontent.com',
      redirectUri: Platform.OS === 'web' ? 'https://glowgoal.com.ng/login': AuthSession.makeRedirectUri({ scheme: 'glowgoal' }),
    });

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
  }, [float, glow, rotate, scale]);

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

  // NEW: Unified completion flow to handle onboarding vs dashboard logic
  const finalizeLogin = async (user: any) => {
    try {
      // 1. Priority Email Scheduling
      await scheduleDailyReminders([], 'hype'); 

      // 2. Background Push Token Update
      registerForPushNotificationsAsync()
        .then(async (token) => {
          if (token) {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { pushToken: token, lastLogin: new Date() });
          }
        })
        .catch(e => console.warn('Push registration skipped:', e));

      // 3. Victory Animations
      triggerSuccessBurst();
      triggerVictoryJump();

      // 4. Data-Driven Navigation Check
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const userSnap = await getDoc(doc(db, 'users', user.uid));


      setTimeout(() => {
        if (!userSnap.exists()) {
          router.replace('/launch');
        } else {
          router.replace('/dashboard');
        }
      }, 5000);

    } catch (error) {
      console.error("Login finalization failed:", error);
      router.replace('/dashboard'); // Fallback
    }
  };

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      const credential = GoogleAuthProvider.credential(id_token);

      setGoogleLoading(true);
      signInWithCredential(auth, credential)
        .then((result) => finalizeLogin(result.user))
        .catch((err) => {
          Alert.alert('Google Login Error', err.message);
          setGoogleLoading(false);
        });
    }
  }, [googleResponse]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Oops!', 'Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        await finalizeLogin(result.user);
      }
    } catch (error: any) {
      Alert.alert('Login failed', 'Check your email/password and try again.');
      setLoading(false);
    }
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
                  disabled={loading || googleLoading}
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
});