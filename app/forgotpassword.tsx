import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import BuddyPopup from '../components/BuddyPopup';
import { BuddyType, getResetPopupContent } from '../lib/buddy-reset';
import { auth } from '../lib/firebase';
import { subscribeToUserPreferences } from '../lib/preferences';

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [buddy, setBuddy] = useState<BuddyType>('soft');

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');

  const float = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstRotate = useRef(new Animated.Value(0)).current;

  const jump = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -14,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.07,
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
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [float, glow, rotate, scale]);

  useEffect(() => {
    const unsub = subscribeToUserPreferences((prefs) => {
      if (prefs?.buddy) {
        setBuddy(prefs.buddy);
      }
    });

    return unsub;
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-4deg', '4deg'],
  });

  const burstRotateInterpolate = burstRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '25deg'],
  });

  const showPopup = (title: string, message: string) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupVisible(true);
  };

  const triggerSuccessBurst = () => {
    burstScale.setValue(0);
    burstOpacity.setValue(0.95);
    burstRotate.setValue(0);

    Animated.parallel([
      Animated.timing(burstScale, {
        toValue: 1.9,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(burstOpacity, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(burstRotate, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerVictoryJump = () => {
    jump.setValue(0);

    Animated.sequence([
      Animated.timing(jump, {
        toValue: -42,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(jump, {
        toValue: 0,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      showPopup('Oops!', 'Please enter your email.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      showPopup('Invalid email', 'Enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(auth, trimmedEmail);

      const popup = getResetPopupContent(buddy);

      triggerSuccessBurst();
      triggerVictoryJump();
      showPopup(popup.title, popup.message);

      setEmail('');
      setEmailSent(true);
    } catch (error) {
      const popup = getResetPopupContent(buddy);
      showPopup(popup.title, popup.message);

      setEmail('');
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#828C6A', '#A0AB89', '#CCBEB1']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <BuddyPopup
          visible={popupVisible}
          title={popupTitle}
          message={popupMessage}
          onClose={() => setPopupVisible(false)}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.wrapper, isDesktop && styles.desktopCard]}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#3A3128" />
              </Pressable>

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
                    styles.logo,
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

              <Text style={styles.title}>Reset your password</Text>

              <Text style={styles.subtitle}>
                Enter your email and we’ll send you a reset link.
              </Text>

              <View style={styles.form}>
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailSent) setEmailSent(false);
                  }}
                />

                <Pressable
                  onPress={handleResetPassword}
                  disabled={loading}
                  style={styles.button}
                >
                  <LinearGradient
                    colors={['#FFD580', '#FFB347']}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#3B3128" />
                    ) : (
                      <Text style={styles.buttonText}>Send reset link</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                {emailSent && (
                  <Text style={styles.successText}>
                    Check your inbox and spam folder. If your email is linked to an
                    account, you’ll get a reset link.
                  </Text>
                )}

                <Pressable
                  onPress={() => router.replace('/login')}
                  style={styles.backToLogin}
                >
                  <Text style={styles.backToLoginText}>Back to login</Text>
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

  wrapper: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    position: 'relative',
  },

  desktopCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 40,
    borderRadius: 40,
  },

  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.45)',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
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

  logo: {
    width: 170,
    height: 170,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: '#3A3128',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: '600',
  },

  form: {
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

  button: {
    width: '100%',
  },

  buttonGradient: {
    height: 55,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    fontWeight: '800',
    fontSize: 17,
    color: '#3B3128',
  },

  successText: {
    textAlign: 'center',
    color: '#3A3128',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 8,
  },

  backToLogin: {
    alignSelf: 'center',
    marginTop: 6,
  },

  backToLoginText: {
    color: '#4F5A3E',
    fontWeight: '800',
    fontSize: 14,
  },
});