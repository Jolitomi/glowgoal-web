import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  updateProfile,
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
import { auth } from '../lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const float = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.9)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstRotate = useRef(new Animated.Value(0)).current;

  const jump = useRef(new Animated.Value(0)).current;

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'glowgoal',
    preferLocalhost: true,
  });

  const [googleRequest, googleResponse, promptGoogleSignIn] =
    Google.useIdTokenAuthRequest({
      webClientId: '146035975275-rrovmbvblm2uh5jd2hvp9pnbitvta8ti.apps.googleusercontent.com',
      androidClientId: '146035975275-ucd45fgn5u8i45uut6lct6r21is9qlej.apps.googleusercontent.com',
      iosClientId: '146035975275-3qp84p3oi3b20rbcqrpqkfvq8vm3co5c.apps.googleusercontent.com',
      redirectUri: Platform.OS === 'web' ? 'https://glowgoal-web.vercel.app' : AuthSession.makeRedirectUri({ scheme: 'glowgoal' }),
      selectAccount: true,
    });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -12,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: -1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.7,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [float, glow, rotate, scale]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-3deg', '3deg'],
  });

  const burstRotateInterpolate = burstRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '25deg'],
  });

  const triggerSuccessBurst = () => {
    burstScale.setValue(0);
    burstOpacity.setValue(0.9);
    burstRotate.setValue(0);

    Animated.parallel([
      Animated.timing(burstScale, {
        toValue: 1.6,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(burstOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(burstRotate, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerVictoryJump = () => {
    jump.setValue(0);

    Animated.sequence([
      Animated.timing(jump, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(jump, {
        toValue: 0,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    const signIn = async () => {
      if (googleResponse?.type !== 'success') return;

      const idToken =
        googleResponse.authentication?.idToken ||
        googleResponse.params?.id_token;

      if (!idToken) {
        Alert.alert('Google Sign-In Error', 'No ID token returned.');
        return;
      }

      try {
        setGoogleLoading(true);
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);

        triggerSuccessBurst();
        triggerVictoryJump();

        setTimeout(() => {
          router.replace('/personality');
        }, 500);
      } catch (err: any) {
        Alert.alert('Firebase Error', err.message || 'Google sign-in failed');
      } finally {
        setGoogleLoading(false);
      }
    };

    signIn();
  }, [googleResponse]);

  const handleEmailSignUp = async () => {
    if (!name || !email || password.length < 6) {
      Alert.alert('Hold up!', 'I need a name, valid email, and 6+ chars for password.');
      return;
    }

    try {
      setEmailLoading(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name.trim() });
      }

      triggerSuccessBurst();
      triggerVictoryJump();

      setTimeout(() => {
        router.replace('/personality');
      }, 500);
    } catch (error: any) {
      Alert.alert('Sign up failed', error.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const anyLoading = emailLoading || googleLoading;

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
            keyboardShouldPersistTaps="always"
          >
            <View style={[styles.responsiveWrapper, isDesktop && styles.desktopCard]}>
              <View style={styles.buddyHeader}>
                <View style={styles.mascotContainer}>
                  <Animated.View
                    style={[
                      styles.glowEffect,
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

                <View style={styles.speechBubble}>
                  <Text style={styles.bubbleText}>You don't need motivation. You need me</Text>
                </View>
              </View>

              <Text style={styles.title}>Let's get you started</Text>

              <View style={styles.formCard}>
                <TextInput
                  placeholder="Your name"
                  placeholderTextColor="#666"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />

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
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#828C6A"
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleEmailSignUp}
                  disabled={anyLoading}
                  style={({ pressed }) => [
                    styles.mainButtonWrapper,
                    { opacity: pressed || anyLoading ? 0.7 : 1 },
                  ]}
                >
                  <LinearGradient colors={['#FFD580', '#FFB347']} style={styles.mainButtonGradient}>
                    {emailLoading ? (
                      <ActivityIndicator color="#3B3128" />
                    ) : (
                      <Text style={styles.buttonText}>Get My Buddy</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.socialSection}>
                <Pressable
                  style={styles.socialButton}
                 onPress={() => {
  if (Platform.OS === 'web') {
   
    promptGoogleSignIn({
      windowFeatures: undefined, 
    });
  } else {
    promptGoogleSignIn();
  }
}}
                  disabled={anyLoading || !googleRequest}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#2F2A26" />
                  ) : (
                    <Text style={styles.socialText}>Continue with Google</Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Got an account?</Text>
                <Pressable onPress={() => router.push('/login')}>
                  <Text style={styles.loginLink}> Log in</Text>
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
    padding: 30,
    borderRadius: 40,
  },

  buddyHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },

  mascotContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },

  glowEffect: {
    position: 'absolute',
    width: 130,
    height: 130,
    backgroundColor: '#FFE096',
    borderRadius: 65,
  },

  burstRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,240,190,0.9)',
  },

  burstSparkHorizontal: {
    position: 'absolute',
    width: 150,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,244,210,0.9)',
  },

  burstSparkVertical: {
    position: 'absolute',
    width: 8,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(255,244,210,0.9)',
  },

  logoImage: {
    width: 110,
    height: 110,
  },

  speechBubble: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 15,
    marginTop: 10,
  },

  bubbleText: {
    fontWeight: '700',
    color: '#3A3128',
    fontSize: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 20,
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
    color: '#000',
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
    color: '#000',
  },

  eyeButton: {
    paddingRight: 15,
  },

  mainButtonWrapper: {
    width: '100%',
    marginTop: 10,
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

  loginLink: {
    fontWeight: '800',
    color: '#4F5A3E',
  },
});