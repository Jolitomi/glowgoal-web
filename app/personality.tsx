import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageSourcePropType,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BuddyType } from '../lib/buddy';
import { updateUserBuddy } from '../lib/preferences';

type Personality = BuddyType;

type PersonalityItem = {
  key: Personality;
  label: string;
  subtitle: string;
  bubble1: string;
  bubble2: string;
  color: string;
  glow: string;
  bgColors: [string, string, string]; // Dynamic BG transition
  image: ImageSourcePropType;
};

const PERSONALITIES: PersonalityItem[] = [
  {
    key: 'hype',
    label: 'Hype',
    subtitle: 'Big energy. Big praise.',
    bubble1: 'You ate that 🔥',
    bubble2: 'Again. Keep going!!',
    color: '#FFD38A',
    glow: 'rgba(255, 190, 92, 0.45)',
    bgColors: ['#727C5A', '#8B9675', '#B8A99A'],
    image: require('../assets/images/hype.png'),
  },
  {
    key: 'soft',
    label: 'Soft',
    subtitle: 'Gentle support. No pressure.',
    bubble1: 'One tiny step 💙',
    bubble2: 'It still counts',
    color: '#D8EEFF',
    glow: 'rgba(170, 220, 255, 0.40)',
    bgColors: ['#5A6F7C', '#758896', '#9AB0B8'],
    image: require('../assets/images/soft.png'),
  },
  {
    key: 'savage',
    label: 'Savage',
    subtitle: 'Funny drag. Effective pressure.',
    bubble1: 'Open the task 😌',
    bubble2: 'Be serious pls',
    color: '#E6D4FF',
    glow: 'rgba(191, 138, 255, 0.35)',
    bgColors: ['#6B5A7C', '#847596', '#A99AB8'],
    image: require('../assets/images/savage.png'),
  },
];

// --- Particle Components (Hype Spark, Soft Orb, Savage Drop) ---

function FloatingOrb({ style, size = 10, delay = 0, duration = 1800, color = 'rgba(255,255,255,0.7)' }: any) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, { toValue: -15, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: 999, backgroundColor: color, transform: [{ translateY }], opacity: 0.6 }, style]} />;
}

function TwinkleSpark({ style, size = 14, delay = 0 }: any) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size, transform: [{ scale }, { rotate: '45deg' }] }, style]}>
      <View style={{ position: 'absolute', top: size / 2 - 1, left: 0, right: 0, height: 2, backgroundColor: '#FFF', borderRadius: 2 }} />
      <View style={{ position: 'absolute', left: size / 2 - 1, top: 0, bottom: 0, width: 2, backgroundColor: '#FFF', borderRadius: 2 }} />
    </Animated.View>
  );
}

function SassyDrop({ style, delay = 0, color = '#8A5CCB' }: any) {
  const translateY = useRef(new Animated.Value(-10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, { toValue: 20, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ position: 'absolute', width: 6, height: 10, borderRadius: 3, backgroundColor: color, transform: [{ translateY }], opacity }, style]} />;
}

// --- Main Screen ---

export default function PersonalityScreen() {
  const [selected, setSelected] = useState<Personality>('hype');
  const { width, height } = useWindowDimensions();
  
  const isSmallPhone = height < 750;
  const isWide = width >= 900;
  
  const fadeAnim = useRef(new Animated.Value(0)).current; // Background cross-fade
  const mascotScale = useRef(new Animated.Value(1)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  const current = useMemo(() => PERSONALITIES.find((p) => p.key === selected)!, [selected]);

  useEffect(() => {
    // Initial entry
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
    
    // Constant mascot idle
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -10, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const selectBuddy = (key: Personality) => {
    if (key === selected) return;
    
    // Trigger Haptics
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate mascot pop
    mascotScale.setValue(0.9);
    Animated.spring(mascotScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    
    setSelected(key);
  };

  const handleContinue = async () => {
  try {
    await updateUserBuddy(selected);

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.replace('/dashboard');
  } catch (e) {
    console.error(e);
  }
};

  return (
    <View style={styles.container}>
      {/* Dynamic Background Layer */}
      <LinearGradient colors={current.bgColors} style={StyleSheet.absoluteFill} />
      
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.eyebrow}>STEP 2: THE VIBE CHECK</Text>
          <Text style={styles.title}>Pick your buddy</Text>

          <View style={[styles.mainLayout, isWide ? styles.mainLayoutWide : styles.mainLayoutStack]}>
            
            {/* Mascot Preview Card */}
            <View style={styles.previewColumn}>
              <View style={[styles.previewCard, { height: isSmallPhone ? 320 : 420 }]}>
                
                {/* Visual Effects */}
                <View style={[styles.glow, { backgroundColor: current.glow }]} />
                
                {selected === 'hype' && <><TwinkleSpark style={{ top: 40, left: 40 }} delay={0} /><TwinkleSpark style={{ bottom: 80, right: 40 }} delay={400} /></>}
                {selected === 'soft' && <><FloatingOrb style={{ top: 60, right: 30 }} delay={0} /><FloatingOrb style={{ bottom: 40, left: 50 }} delay={800} /></>}
                {selected === 'savage' && <><SassyDrop style={{ top: 40, left: '50%' }} delay={0} /><SassyDrop style={{ top: 80, left: '30%' }} delay={500} /></>}

                {/* Chat Bubbles (Glassmorphism) */}
                <View style={styles.chatBubbleTop}><Text style={styles.chatText}>{current.bubble1}</Text></View>
                <View style={styles.chatBubbleSide}><Text style={styles.chatText}>{current.bubble2}</Text></View>

                <Animated.Image 
                  source={current.image} 
                  style={[styles.mascotImage, { width: 220, height: 220, transform: [{ translateY: floatY }, { scale: mascotScale }] }]} 
                  resizeMode="contain" 
                />
                
                <Text style={styles.previewLabel}>{current.label} Mode</Text>
              </View>
            </View>

            {/* Selection List */}
            <View style={styles.optionsColumn}>
              <View style={styles.optionList}>
                {PERSONALITIES.map((item) => {
                  const active = selected === item.key;
                  return (
                    <Pressable key={item.key} onPress={() => selectBuddy(item.key)} style={[
                      styles.optionPill,
                      active ? styles.optionPillActive : styles.optionPillInactive
                    ]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionTitle, { color: active ? '#2A2E22' : '#FFF' }]}>{item.label} Buddy</Text>
                        <Text style={[styles.optionSubtitle, { color: active ? 'rgba(42,46,34,0.6)' : 'rgba(255,255,255,0.6)' }]}>{item.subtitle}</Text>
                      </View>
                      <View style={[styles.dot, active && { backgroundColor: item.color }]}>
                         {active && <View style={styles.dotInner} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={handleContinue} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <LinearGradient colors={['#FFF', '#E8E8E8']} style={styles.button}>
                  <Text style={styles.buttonText}>Confirm Personality</Text>
                </LinearGradient>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#727C5A' },
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, alignItems: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 24, textAlign: 'center' },
  mainLayout: { width: '100%', maxWidth: 1000 },
  mainLayoutStack: { gap: 20 },
  mainLayoutWide: { flexDirection: 'row', gap: 30, alignItems: 'center' },
  previewColumn: { flex: 1.2, width: '100%' },
  optionsColumn: { flex: 0.8, width: '100%' },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, opacity: 0.5 },
  mascotImage: { zIndex: 2 },
  previewLabel: { marginTop: 10, fontSize: 18, fontWeight: '900', color: '#FFF', opacity: 0.9 },
  chatBubbleTop: { 
    position: 'absolute', top: 30, left: 20, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    paddingHorizontal: 16, paddingVertical: 10, 
    borderRadius: 20, zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  chatBubbleSide: { 
    position: 'absolute', bottom: 80, right: 20, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    paddingHorizontal: 16, paddingVertical: 10, 
    borderRadius: 20, zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  chatText: { fontSize: 13, fontWeight: '900', color: '#3E342E' },
  optionList: { gap: 12, marginBottom: 24 },
  optionPill: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, borderRadius: 28, borderWidth: 1.5,
  },
  optionPillActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  optionPillInactive: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)' },
  optionTitle: { fontSize: 18, fontWeight: '900' },
  optionSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF', opacity: 0.9 },
  button: { height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 18, fontWeight: '900', color: '#3E342E' },
});