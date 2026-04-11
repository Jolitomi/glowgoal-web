import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.85)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale = useRef(new Animated.Value(1)).current;

  const sparkle1Y = useRef(new Animated.Value(0)).current;
  const sparkle1Opacity = useRef(new Animated.Value(0.4)).current;

  const sparkle2Y = useRef(new Animated.Value(0)).current;
  const sparkle2Opacity = useRef(new Animated.Value(0.5)).current;

  const sparkle3Y = useRef(new Animated.Value(0)).current;
  const sparkle3Opacity = useRef(new Animated.Value(0.35)).current;

  const fullTagline = 'Your accountability buddy, not just a to-do list';
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -16,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.08,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.85,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glowPulse]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [cursorOpacity]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkle1Y, {
            toValue: -18,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle1Opacity, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(sparkle1Y, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle1Opacity, {
            toValue: 0.35,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [sparkle1Y, sparkle1Opacity]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkle2Y, {
            toValue: -24,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle2Opacity, {
            toValue: 1,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(sparkle2Y, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle2Opacity, {
            toValue: 0.4,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [sparkle2Y, sparkle2Opacity]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkle3Y, {
            toValue: -15,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle3Opacity, {
            toValue: 0.95,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(sparkle3Y, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkle3Opacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [sparkle3Y, sparkle3Opacity]);

  useEffect(() => {
    let index = 0;

    const typingInterval = setInterval(() => {
      index += 1;
      setDisplayedText(fullTagline.slice(0, index));

      if (index >= fullTagline.length) {
        clearInterval(typingInterval);
      }
    }, 65);

    return () => clearInterval(typingInterval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(screenScale, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.replace('/launch');
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [screenOpacity, screenScale]);

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
              transform: [{ scale: screenScale }],
            },
          ]}
        >
          <Text style={styles.logo}>GlowGoal</Text>

          <View style={styles.taglineWrap}>
            <Text style={styles.tagline}>{displayedText}</Text>
            <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
              |
            </Animated.Text>
          </View>

          <View style={styles.mascotStage}>
            <Animated.View
              style={[
                styles.sparkle,
                styles.sparkleOne,
                {
                  opacity: sparkle1Opacity,
                  transform: [{ translateY: sparkle1Y }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.sparkle,
                styles.sparkleTwo,
                {
                  opacity: sparkle2Opacity,
                  transform: [{ translateY: sparkle2Y }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.sparkle,
                styles.sparkleThree,
                {
                  opacity: sparkle3Opacity,
                  transform: [{ translateY: sparkle3Y }],
                },
              ]}
            />

            <Animated.View
              style={[
                styles.glow,
                {
                  transform: [{ scale: glowPulse }],
                },
              ]}
            />

            <Animated.View
              style={[
                styles.mascotWrapper,
                {
                  transform: [{ translateY: floatAnim }, { scale: 1.08 }],
                },
              ]}
            >
              <Image
                source={require('../assets/images/star.png')}
                style={styles.star}
                resizeMode="contain"
              />
            </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  taglineWrap: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  tagline: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    color: '#FFF8F2',
    maxWidth: 300,
  },
  cursor: {
    fontSize: 18,
    lineHeight: 28,
    color: '#FFF8F2',
    marginLeft: 2,
  },
  mascotStage: {
    width: 380,
    height: 380,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 200, 120, 0.2)',
    shadowColor: '#FFD580',
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    width: 360,
    height: 360,
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: '#FFF9E8',
    borderRadius: 999,
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  sparkleOne: {
    width: 12,
    height: 12,
    top: 82,
    left: 68,
  },
  sparkleTwo: {
    width: 10,
    height: 10,
    top: 58,
    right: 82,
  },
  sparkleThree: {
    width: 14,
    height: 14,
    bottom: 94,
    right: 58,
  },
});