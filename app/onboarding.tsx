import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const onboardingSlides = [
  {
    id: 1,
    eyebrow: 'Plan Smarter',
    title: 'Turn big goals\ninto daily wins',
    
    type: 'tasks',
  },
  {
    id: 2,
    eyebrow: 'Stay Accountable',
    title: 'We hype you.\nWe roast you.\nWe support.',
    subtitle:
      'GlowGoal gives feedback with personality, so staying consistent never feels dry or robotic.',
    type: 'feedback',
  },
  {
    id: 3,
    eyebrow: 'Build Momentum',
    title: 'Consistency >\nPerfection',
    type: 'streak',
  },
];

function SlideOnePreview({ short }: { short: boolean }) {
  const card1 = useRef(new Animated.Value(30)).current;
  const card2 = useRef(new Animated.Value(45)).current;
  const card3 = useRef(new Animated.Value(60)).current;

  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  const opacity3 = useRef(new Animated.Value(0)).current;

  const progressWidth = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0.6)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(card1, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity1, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(card2, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity2, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(card3, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity3, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(progressWidth, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(burstOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(burstOpacity, {
            toValue: 0,
            duration: 420,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(burstScale, {
            toValue: 1.2,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(burstScale, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [card1, card2, card3, opacity1, opacity2, opacity3, progressWidth, burstScale, burstOpacity]);

  const animatedBarWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '78%'],
  });

  return (
    <View style={styles.previewFrame}>
      <View style={styles.bgGlowOne} />
      <View style={styles.bgGlowTwo} />

      <View style={styles.taskMainCard}>
        <Text style={styles.previewHeading}>Launch Side Hustle</Text>
        <Text style={styles.previewSubheading}>Today’s power moves</Text>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: animatedBarWidth }]} />
          </View>
          <Text style={styles.progressText}>78%</Text>
        </View>

        <Animated.View
          style={[
            styles.taskFancyRow,
            {
              opacity: opacity1,
              transform: [{ translateY: card1 }],
            },
          ]}
        >
          <View style={styles.taskCheckCircle}>
            <Text style={styles.taskCheckText}>✓</Text>
          </View>
          <View style={styles.taskTextWrap}>
            <Text style={styles.taskMainText}>Research Market</Text>
            <Text style={styles.taskSubText}>15 mins • Warm up task</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.taskFancyRow,
            {
              opacity: opacity2,
              transform: [{ translateY: card2 }],
            },
          ]}
        >
          <View style={styles.taskCheckCircleSoft} />
          <View style={styles.taskTextWrap}>
            <Text style={styles.taskMainText}>Build Landing Page</Text>
            <Text style={styles.taskSubText}>45 mins • Main build</Text>
          </View>
        </Animated.View>

        <View style={styles.motivationStrip}>
          <Text style={styles.motivationStripText}>
            Big goals feel lighter when broken into tiny wins.
          </Text>
        </View>

        <Animated.View
          style={[
            styles.successBurst,
            {
              opacity: burstOpacity,
              transform: [{ scale: burstScale }],
            },
          ]}
        >
          <Text style={styles.successBurstText}>+1 Win ✨</Text>
        </Animated.View>
      </View>

      <View style={[styles.sparkDot, { top: short ? 36 : 24, right: 24 }]} />
      <View style={[styles.sparkDotSmall, { bottom: 48, left: 26 }]} />
    </View>
  );
}

function FloatingPopup({
  style,
  bubbleStyle,
  textStyle,
  text,
  animation,
}: {
  style?: object;
  bubbleStyle?: object;
  textStyle?: object;
  text: string;
  animation: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        styles.popupWrap,
        style,
        {
          opacity: animation.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [18, -12],
              }),
            },
            {
              scale: animation.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0.92, 1, 1.02],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.popupBubble, bubbleStyle]}>
        <Text style={[styles.popupText, textStyle]}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function SlideTwoPreview() {
  const orbPulse = useRef(new Animated.Value(1)).current;
  const popup1 = useRef(new Animated.Value(0)).current;
  const popup2 = useRef(new Animated.Value(0)).current;
  const popup3 = useRef(new Animated.Value(0)).current;
  const popup4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(orbPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const loopPopup = (value: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          }),
          Animated.delay(1300),
          Animated.timing(value, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    loopPopup(popup1, 0);
    loopPopup(popup2, 500);
    loopPopup(popup3, 1000);
    loopPopup(popup4, 1500);
  }, [orbPulse, popup1, popup2, popup3, popup4]);

  const popupAnim = (value: Animated.Value) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.88, 1],
        }),
      },
    ],
  });

  return (
    <View style={styles.previewFrame}>
      <View style={styles.feedbackCoreCard}>
        <Text style={styles.previewHeading}>Buddy Feedback</Text>
        <Text style={styles.previewSubheading}>Accountability with personality</Text>

        <Animated.View style={[styles.liveBuddyOrb, { transform: [{ scale: orbPulse }] }]}>
          <Text style={styles.liveBuddyOrbEmoji}>✨</Text>
        </Animated.View>

        <View style={styles.personalityChips}>
          <View style={styles.personalityChip}>
            <Text style={styles.personalityChipText}>Hype Bestie</Text>
          </View>
          <View style={styles.personalityChip}>
            <Text style={styles.personalityChipText}>Savage Coach</Text>
          </View>
          <View style={styles.personalityChip}>
            <Text style={styles.personalityChipText}>Soft Support</Text>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.popupWrap, { top: 20, left: 6 }, popupAnim(popup1)]}>
        <View style={[styles.popupBubble, styles.popupGood]}>
          <Text style={[styles.popupText, styles.popupGoodText]}>You did that! 🔥</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.popupWrap, { top: 92, right: 4 }, popupAnim(popup2)]}>
        <View style={[styles.popupBubble, styles.popupRoast]}>
          <Text style={[styles.popupText, styles.popupRoastText]}>
            Babe… be serious 😭
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.popupWrap, { bottom: 86, left: 22 }, popupAnim(popup3)]}>
        <View style={[styles.popupBubble, styles.popupSoft]}>
          <Text style={[styles.popupText, styles.popupSoftText]}>
            Progress, not perfection 💛
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.popupWrap, { bottom: 26, right: 18 }, popupAnim(popup4)]}>
        <View style={[styles.popupBubble, styles.popupGood]}>
          <Text style={[styles.popupText, styles.popupGoodText]}>
            One task. Start there ✨
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

function SlideThreePreview() {
  const glow = useRef(new Animated.Value(0.7)).current;
  const shimmer = useRef(new Animated.Value(-140)).current;
  const [count, setCount] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.7,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 180,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: -140,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ])
    ).start();

    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setCount(current);
      if (current >= 30) {
        clearInterval(timer);
      }
    }, 35);

    return () => clearInterval(timer);
  }, [glow, shimmer]);

  return (
    <View style={styles.previewFrame}>
      <Animated.View style={[styles.streakGlow, { opacity: glow }]} />

      <View style={styles.streakMainCard}>
        <Text style={styles.previewHeading}>Consistency Tracker</Text>
        <Text style={styles.previewSubheading}>Momentum over perfection</Text>

        <View style={styles.streakHero}>
          <Text style={styles.streakHeroText}>🔥 {count}</Text>
          <Text style={styles.streakHeroSub}>Days Streak</Text>

          <Animated.View
            style={[
              styles.shimmerBar,
              {
                transform: [{ translateX: shimmer }, { rotate: '18deg' }],
              },
            ]}
          />
        </View>

        <View style={styles.streakGrid}>
          {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => (
            <View
              key={day}
              style={[
                styles.streakChip,
                day <= 10 ? styles.streakChipActive : null,
              ]}
            >
              <Text style={styles.streakChipText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.motivationStrip}>
          <Text style={styles.motivationStripText}>
            Progress is a journey, not a race. Keep glowing.
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const { width, height } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const gradients: readonly [string, string, string][] = [
  ['#828C6A', '#A0AB89', '#CCBEB1'],
  ['#8C6A7E', '#B59AA8', '#F1E7EC'],
  ['#828C6A', '#A0AB89', '#CCBEB1'],
];

  const isWide = width >= 900;
  const isTablet = width >= 700;
  const isShort = height < 760;

  const slide = onboardingSlides[currentSlide];

  const ui = useMemo(() => {
    return {
      horizontalPadding: isWide ? 52 : 24,
      titleSize: isWide ? 50 : isTablet ? 42 : 34,
      titleLineHeight: isWide ? 58 : isTablet ? 48 : 40,
      subtitleSize: isWide ? 18 : 16,
      subtitleLineHeight: isWide ? 28 : 24,
      sectionGap: isWide ? 36 : 22,
      buttonPadding: isShort ? 14 : 16,
      topPad: isShort ? 6 : 10,
    };
  }, [isWide, isTablet, isShort]);

  useEffect(() => {
  fadeAnim.setValue(0);
  slideAnim.setValue(24);

  Animated.parallel([
    // screen transition
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),

    // dots animation
    Animated.timing(dotAnim, {
      toValue: currentSlide,
      duration: 300,
      useNativeDriver: false,
    }),

    // background animation
    Animated.timing(bgAnim, {
      toValue: currentSlide,
      duration: 500,
      useNativeDriver: false,
    }),
  ]).start();
}, [currentSlide]);

const goNext = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  if (currentSlide < onboardingSlides.length - 1) {
    setCurrentSlide((prev) => prev + 1);
  } else {
    router.push('/signup');
  }
};

const goBack = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  if (currentSlide === 0) {
    router.back();
  } else {
    setCurrentSlide((prev) => prev - 1);
  }
};

  return (
    <LinearGradient
      colors={gradients[currentSlide]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView
        style={[
          styles.container,
          { paddingHorizontal: ui.horizontalPadding, paddingTop: ui.topPad },
        ]}
      >
        <StatusBar barStyle="light-content" />

        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={10}>
            <Text style={styles.topAction}>
              {currentSlide === 0 ? 'Back' : 'Previous'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/signup')} hitSlop={10}>
            <Text style={styles.topAction}>Skip</Text>
          </Pressable>
        </View>

        <Animated.View
          style={[
            styles.main,
            isWide && styles.mainWide,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.textSection, isWide && styles.textSectionWide]}>
            <View style={styles.eyebrowPill}>
              <Text style={styles.eyebrowText}>{slide.eyebrow}</Text>
            </View>

            <Text
              style={[
                styles.title,
                {
                  fontSize: ui.titleSize,
                  lineHeight: ui.titleLineHeight,
                },
              ]}
            >
              {slide.title}
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: ui.subtitleSize,
                  lineHeight: ui.subtitleLineHeight,
                },
              ]}
            >
              {slide.subtitle}
            </Text>
          </View>
<View
  style={[
    styles.previewArea,
    isWide ? styles.previewAreaWide : styles.previewAreaMobile,
  ]}
>
  <Animated.View
    key={currentSlide}
    style={[
      styles.page,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}
  >
    {currentSlide === 0 && <SlideOnePreview short={isShort} />}
    {currentSlide === 1 && <SlideTwoPreview />}
    {currentSlide === 2 && <SlideThreePreview />}
  </Animated.View>
</View>
           </Animated.View>

        <View style={styles.dotsRow}>
  {onboardingSlides.map((_, index) => {
    const width = dotAnim.interpolate({
      inputRange: [index - 1, index, index + 1],
      outputRange: [10, 28, 10],
      extrapolate: 'clamp',
    });

    const opacity = dotAnim.interpolate({
      inputRange: [index - 1, index, index + 1],
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          {
            width,
            opacity,
          },
        ]}
      />
    );
  })}
</View>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={goBack}
              style={({ pressed, hovered }) => [
                styles.secondaryButton,
                (pressed || hovered) && styles.secondaryButtonActive,
              ]}
            >
              {({ pressed, hovered }) => (
                <Text
                  style={[
                    styles.secondaryButtonText,
                    (pressed || hovered) && styles.secondaryButtonTextActive,
                  ]}
                >
                  {currentSlide === 0 ? 'Exit' : 'Back'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={goNext}
              style={({ pressed, hovered }) => [
                styles.primaryButton,
                { paddingVertical: ui.buttonPadding },
                (pressed || hovered) && styles.primaryButtonActive,
              ]}
            >
              {({ pressed, hovered }) => (
                <Text
                  style={[
                    styles.primaryButtonText,
                    (pressed || hovered) && styles.primaryButtonTextActive,
                  ]}
                >
                  {currentSlide === onboardingSlides.length - 1 ? 'Get Started' : 'Next'}
                </Text>
              )}
            </Pressable>
          </View>
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
    paddingBottom: 18,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topAction: {
    color: '#FFF8F2',
    fontSize: 15,
    fontWeight: '700',
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  mainWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textSection: {
    alignItems: 'center',
  },
  textSectionWide: {
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: 32,
  },
  eyebrowPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
  },
  eyebrowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
    maxWidth: 460,
  },
  subtitle: {
    color: '#FFF8F2',
    textAlign: 'center',
    maxWidth: 420,
  },
  previewArea: {
    justifyContent: 'center',
    position: 'relative',
  },
  previewAreaMobile: {
    width: '100%',
    minHeight: 360,
    alignSelf: 'center',
  },
  previewAreaWide: {
    width: 460,
    minHeight: 380,
    alignSelf: 'center',
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFrame: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
  },
  bgGlowOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: 20,
    left: -2,
  },
  bgGlowTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    bottom: 28,
    right: 8,
  },
  progressBadge: {
    position: 'absolute',
    top: 0,
    right: 10,
    zIndex: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: '#8D4B1F',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  progressBadgeText: {
    color: '#E88C44',
    fontSize: 13,
    fontWeight: '800',
  },
  taskStackCardBack: {
    position: 'absolute',
    top: 78,
    left: 38,
    right: 38,
    height: 220,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  taskStackCardMid: {
    position: 'absolute',
    top: 60,
    left: 28,
    right: 28,
    height: 240,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  taskMainCard: {
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 30,
    padding: 22,
    minHeight: 310,
    justifyContent: 'center',
    shadowColor: '#8D4B1F',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  previewHeading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  previewSubheading: {
    color: '#FFF8F2',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  taskFancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 12,
  },
  taskCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskCheckText: {
    color: '#E88C44',
    fontWeight: '900',
    fontSize: 13,
  },
  taskCheckCircleSoft: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)',
    marginRight: 12,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskMainText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  taskSubText: {
    color: '#FFF8F2',
    fontSize: 12,
  },
  motivationStrip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  motivationStripText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
  sparkDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#FFF9E8',
  },
  sparkDotSmall: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFF9E8',
  },
  feedbackGlow: {
    position: 'absolute',
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  feedbackCoreCard: {
    alignSelf: 'center',
    width: '88%',
    minHeight: 250,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    shadowColor: '#8D4B1F',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buddyAvatar: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buddyAvatarEmoji: {
    fontSize: 28,
  },
  popupWrap: {
    position: 'absolute',
    zIndex: 5,
  },
  popupBubble: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    maxWidth: 170,
    shadowColor: '#8D4B1F',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  popupText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  popupGood: {
    backgroundColor: '#FFFFFF',
  },
  popupGoodText: {
    color: '#E88C44',
  },
  popupRoast: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  popupRoastText: {
    color: '#FFFFFF',
  },
  popupSoft: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  popupSoftText: {
    color: '#FFFFFF',
  },
  streakGlow: {
    position: 'absolute',
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  streakMainCard: {
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 30,
    padding: 22,
    minHeight: 310,
    justifyContent: 'center',
    shadowColor: '#8D4B1F',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  streakHero: {
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  streakHeroText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 4,
  },
  streakHeroSub: {
    color: '#FFF8F2',
    fontSize: 14,
  },
  streakGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  streakChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakChipActive: {
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  streakChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomPanel: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 28,
    padding: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
  },
  primaryButtonActive: {
    backgroundColor: '#E88C44',
  },
  primaryButtonText: {
    color: '#E88C44',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButtonTextActive: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  secondaryButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonTextActive: {
    color: '#E88C44',
  },
  progressWrap: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
},
progressTrack: {
  flex: 1,
  height: 10,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.2)',
  overflow: 'hidden',
  marginRight: 10,
},
progressFill: {
  height: '100%',
  borderRadius: 999,
  backgroundColor: '#FFFFFF',
},
progressText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '800',
},
successBurst: {
  position: 'absolute',
  top: 10,
  left: 12,
  backgroundColor: '#FFFFFF',
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8,
},
successBurstText: {
  color: '#E88C44',
  fontSize: 12,
  fontWeight: '800',
},
liveBuddyOrb: {
  width: 86,
  height: 86,
  borderRadius: 999,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 10,
  marginBottom: 16,
  alignSelf: 'center',
},
liveBuddyOrbEmoji: {
  fontSize: 32,
},
personalityChips: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
},
personalityChip: {
  backgroundColor: 'rgba(255,255,255,0.18)',
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8,
},
personalityChipText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '700',
},
shimmerBar: {
  position: 'absolute',
  width: 38,
  height: 120,
  backgroundColor: 'rgba(255,255,255,0.18)',
  top: -10,
},
});