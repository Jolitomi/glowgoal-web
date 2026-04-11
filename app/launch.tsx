import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LaunchScreen() {
  const { height, width } = useWindowDimensions();

  const isShortScreen = height < 760;
  const isVeryShortScreen = height < 700;

  const ui = useMemo(() => {
    if (isVeryShortScreen) {
      return {
        topPadding: 10,
        mascotStage: Math.min(width * 0.88, 320),
        star: Math.min(width * 0.72, 250),
        glowWarm: Math.min(width * 0.58, 210),
        glowPink: Math.min(width * 0.5, 180),
        headingSize: 26,
        subtextSize: 15,
        subtextLine: 22,
        headingMarginTop: -18,
        headingBottom: 10,
        subtextBottom: 10,
        buttonPaddingVertical: 14,
        buttonsBottom: 6,
      };
    }

    if (isShortScreen) {
      return {
        topPadding: 18,
        mascotStage: Math.min(width * 0.92, 360),
        star: Math.min(width * 0.78, 290),
        glowWarm: Math.min(width * 0.64, 240),
        glowPink: Math.min(width * 0.56, 210),
        headingSize: 28,
        subtextSize: 16,
        subtextLine: 23,
        headingMarginTop: -12,
        headingBottom: 12,
        subtextBottom: 12,
        buttonPaddingVertical: 15,
        buttonsBottom: 10,
      };
    }

    return {
      topPadding: 28,
      mascotStage: Math.min(width * 0.96, 430),
      star: Math.min(width * 0.82, 370),
      glowWarm: Math.min(width * 0.68, 290),
      glowPink: Math.min(width * 0.6, 250),
      headingSize: 40,
      subtextSize: 18,
      subtextLine: 24,
      headingMarginTop: -6,
      headingBottom: 14,
      subtextBottom: 12,
      buttonPaddingVertical: 16,
      buttonsBottom: 12,
    };
  }, [height, width, isShortScreen, isVeryShortScreen]);

  const floatAnim = useRef(new Animated.Value(8)).current;
  const glowScaleOne = useRef(new Animated.Value(0.95)).current;
  const glowScaleTwo = useRef(new Animated.Value(0.88)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(18)).current;

  const orbit1 = useRef(new Animated.Value(0)).current;
  const orbit2 = useRef(new Animated.Value(0)).current;
  const orbit3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScaleOne, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScaleOne, {
          toValue: 0.95,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScaleTwo, {
          toValue: 1.12,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScaleTwo, {
          toValue: 0.88,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(orbit1, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(orbit2, {
        toValue: 1,
        duration: 7600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(orbit3, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [
    floatAnim,
    glowScaleOne,
    glowScaleTwo,
    screenOpacity,
    screenTranslateY,
    orbit1,
    orbit2,
    orbit3,
  ]);

  const orbit1Rotate = orbit1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbit2Rotate = orbit2.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const orbit3Rotate = orbit3.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#828C6A', '#A0AB89', '#CCBEB1']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: screenOpacity,
              transform: [{ translateY: screenTranslateY }],
            },
          ]}
        >
          <View style={[styles.centerSection, { paddingTop: ui.topPadding }]}>
            <View
              style={[
                styles.mascotStage,
                {
                  width: ui.mascotStage,
                  height: ui.mascotStage,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.orbitRingLarge,
                  {
                    width: ui.mascotStage * 0.8,
                    height: ui.mascotStage * 0.8,
                    transform: [{ rotate: orbit1Rotate }],
                  },
                ]}
              >
                <View style={[styles.sparkle, styles.sparkleLarge]} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.orbitRingMedium,
                  {
                    width: ui.mascotStage * 0.7,
                    height: ui.mascotStage * 0.7,
                    transform: [{ rotate: orbit2Rotate }],
                  },
                ]}
              >
                <View style={[styles.sparkle, styles.sparkleMedium]} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.orbitRingSmall,
                  {
                    width: ui.mascotStage * 0.58,
                    height: ui.mascotStage * 0.58,
                    transform: [{ rotate: orbit3Rotate }],
                  },
                ]}
              >
                <View style={[styles.sparkle, styles.sparkleSmall]} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.glowWarm,
                  {
                    width: ui.glowWarm,
                    height: ui.glowWarm,
                    borderRadius: ui.glowWarm / 2,
                    transform: [{ scale: glowScaleOne }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.glowPink,
                  {
                    width: ui.glowPink,
                    height: ui.glowPink,
                    borderRadius: ui.glowPink / 2,
                    transform: [{ scale: glowScaleTwo }],
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.mascotWrapper,
                  {
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              >
                <Image
                  source={require('../assets/images/star.png')}
                  style={{ width: ui.star, height: ui.star }}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            <Text
              style={[
                styles.heading,
                {
                  fontSize: ui.headingSize,
                  marginTop: ui.headingMarginTop,
                  marginBottom: ui.headingBottom,
                },
              ]}
            >
              Let’s glow up your goals
            </Text>

            <Text
              style={[
                styles.subtext,
                {
                  fontSize: ui.subtextSize,
                  lineHeight: ui.subtextLine,
                  marginBottom: ui.subtextBottom,
                },
              ]}
            >
              Track goals, build streaks, and get real feedback that actually
              motivates you
            </Text>
          </View>

          <View style={[styles.buttonsSection, { marginBottom: ui.buttonsBottom }]}>
            <View style={styles.buttonsRow}>
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/onboarding');
                }}
                style={({ pressed, hovered }) => [
                  styles.buttonBase,
                  styles.primaryBtn,
                  { paddingVertical: ui.buttonPaddingVertical },
                  (pressed || hovered) && styles.primaryBtnActive,
                  pressed && styles.buttonLift,
                ]}
              >
                {({ pressed, hovered }) => (
                  <Text
                    style={[
                      styles.primaryText,
                      (pressed || hovered) && styles.primaryTextActive,
                    ]}
                  >
                    Get Started
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                   router.push('/login');
                }}
                style={({ pressed, hovered }) => [
                  styles.buttonBase,
                  styles.secondaryBtn,
                  { paddingVertical: ui.buttonPaddingVertical },
                  (pressed || hovered) && styles.secondaryBtnActive,
                  pressed && styles.buttonLift,
                ]}
              >
                {({ pressed, hovered }) => (
                  <Text
                    style={[
                      styles.secondaryText,
                      (pressed || hovered) && styles.secondaryTextActive,
                    ]}
                  >
                    Log in
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 26,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  mascotStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowWarm: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 244, 210, 0.28)',
    shadowColor: '#FFF3C4',
    shadowOpacity: 0.85,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  glowPink: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 200, 120, 0.2)',
    shadowColor: '#fed581',
    shadowOpacity: 0.85,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRingLarge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbitRingMedium: {
    position: 'absolute',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  orbitRingSmall: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sparkle: {
    borderRadius: 999,
    backgroundColor: '#FFF9E8',
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  sparkleLarge: {
    width: 14,
    height: 14,
  },
  sparkleMedium: {
    width: 11,
    height: 11,
  },
  sparkleSmall: {
    width: 9,
    height: 9,
  },
  heading: {
    fontWeight: '800',
    textAlign: 'center',
    color: '#fff',
    maxWidth: 300,
  },
  subtext: {
    textAlign: 'center',
    color: '#FFF8F2',
    maxWidth: 310,
  },
  buttonsSection: {
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  buttonsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  buttonBase: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
  },
  buttonLift: {
    transform: [{ translateY: -4 }],
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
  },
  primaryBtnActive: {
    backgroundColor: '#E88C44',
  },
  primaryText: {
    color: '#E88C44',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryTextActive: {
    color: '#FFFFFF',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  secondaryBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryTextActive: {
    color: '#E88C44',
  },
});