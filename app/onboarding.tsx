import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { BuddyType, buddyConfig } from '../lib/buddy';
import { GoalItem, saveGoal } from '../lib/goals';
import {
  CURATED_GOALS,
  CuratedGoalOption,
  FRICTION_OPTIONS,
  OnboardingFriction,
  buildOnboardingGoal,
  getBuddyBanter,
} from '../lib/onboarding-flow';
import { saveUserBuddy, saveUserPreferences } from '../lib/preferences';

const BUDDY_MASCOTS: Record<BuddyType, any> = {
  hype: require('../assets/images/hype.png'),
  soft: require('../assets/images/soft.png'),
  savage: require('../assets/images/savage.png'),
};

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isPhone = width < 768;

  // Step Index: 0 = Goal, 1 = Friction, 2 = Buddy, 3 = Micro-Win
  const [step, setStep] = useState<number>(0);

  // Step 1: Goal state
  const [selectedCuratedId, setSelectedCuratedId] = useState<string>('fitness');
  const [customGoalText, setCustomGoalText] = useState<string>('');
  const [isCustomGoal, setIsCustomGoal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'health' | 'career' | 'study' | 'creative' | 'personal'>('health');

  // Step 2: Friction state
  const [selectedFriction, setSelectedFriction] = useState<OnboardingFriction>('procrastination');

  // Step 3: Buddy state
  const [selectedBuddy, setSelectedBuddy] = useState<BuddyType>('hype');

  // Step 4: Micro-win custom override
  const [customMicroWin, setCustomMicroWin] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mascotScale = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Idle mascot floating animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  const triggerStepTransition = (nextStep: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    setStep(nextStep);
  };

  const handleBuddySelect = (buddy: BuddyType) => {
    if (buddy === selectedBuddy) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedBuddy(buddy);
    mascotScale.setValue(0.85);
    Animated.spring(mascotScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  // Derive active goal info
  const activeGoalTitle = useMemo(() => {
    if (isCustomGoal && customGoalText.trim()) {
      return customGoalText.trim();
    }
    const found = CURATED_GOALS.find((g) => g.id === selectedCuratedId);
    return found ? found.title : 'My Goal';
  }, [isCustomGoal, customGoalText, selectedCuratedId]);

  const activeCategory = useMemo(() => {
    if (isCustomGoal) return selectedCategory;
    const found = CURATED_GOALS.find((g) => g.id === selectedCuratedId);
    return found ? found.category : 'personal';
  }, [isCustomGoal, selectedCategory, selectedCuratedId]);

  // Derived live banter
  const banter = useMemo(() => {
    return getBuddyBanter({
      buddy: selectedBuddy,
      goalTitle: activeGoalTitle,
      friction: selectedFriction,
    });
  }, [selectedBuddy, activeGoalTitle, selectedFriction]);

  // Built goal object for Step 4
  const generatedGoal: GoalItem = useMemo(() => {
    return buildOnboardingGoal({
      title: activeGoalTitle,
      category: activeCategory,
      customMicroWin: customMicroWin.trim() ? customMicroWin.trim() : undefined,
      curatedId: isCustomGoal ? undefined : selectedCuratedId,
    });
  }, [activeGoalTitle, activeCategory, customMicroWin, isCustomGoal, selectedCuratedId]);

  // Save progress and launch
  const handleLaunch = async (mode: 'guest' | 'signup') => {
    try {
      setIsSaving(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Save buddy and preferences
      await saveUserBuddy(selectedBuddy);
      await saveUserPreferences({ buddy: selectedBuddy });

      // Save initial goal
      await saveGoal(generatedGoal);

      if (mode === 'signup') {
        router.push('/signup');
      } else {
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('Failed to complete onboarding launch:', error);
      router.replace('/dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  // Background colors per step or buddy
  const gradientColors: [string, string, string] = useMemo(() => {
    if (step === 2) {
      if (selectedBuddy === 'savage') return ['#3A2F4C', '#584570', '#83679E'];
      if (selectedBuddy === 'soft') return ['#2C4253', '#436177', '#7195AD'];
      return ['#4A472E', '#6B6846', '#9B9670'];
    }
    return ['#353B2C', '#576049', '#828C6A'];
  }, [step, selectedBuddy]);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          {/* Header Navigation & Progress Bar */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              {step > 0 ? (
                <Pressable
                  onPress={() => triggerStepTransition(step - 1)}
                  style={styles.backButton}
                  hitSlop={12}
                >
                  <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.replace('/launch')}
                  style={styles.backButton}
                  hitSlop={12}
                >
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </Pressable>
              )}

              <Text style={styles.brandTitle}>GlowGoal⭐</Text>

              <Pressable
                onPress={() => router.push('/signup')}
                style={styles.skipButton}
                hitSlop={12}
              >
                <Text style={styles.skipButtonText}>Sign In</Text>
              </Pressable>
            </View>

            {/* 4-Step Indicator */}
            <View style={styles.progressContainer}>
              {[0, 1, 2, 3].map((idx) => {
                const isActive = idx <= step;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.progressBar,
                      isActive ? styles.progressBarActive : styles.progressBarInactive,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Dynamic Step Content */}
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              isDesktop && styles.scrollContentDesktop,
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[{ opacity: fadeAnim, width: '100%', maxWidth: 720 }]}>
              {/* ================= STEP 0: GOAL DISCOVERY ================= */}
              {step === 0 && (
                <View style={styles.stepContainer}>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>STEP 1: THE TARGET</Text>
                  </View>
                  <Text style={styles.stepHeading}>What do you want to achieve?</Text>
                  <Text style={styles.stepSubheading}>
                    Pick a starting goal or write your own. We will break it down so it never feels impossible.
                  </Text>

                  {/* Curated Preset Cards */}
                  <View style={styles.optionsList}>
                    {CURATED_GOALS.map((item) => {
                      const isSelected = !isCustomGoal && selectedCuratedId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setIsCustomGoal(false);
                            setSelectedCuratedId(item.id);
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                          style={[
                            styles.cardPill,
                            isSelected ? styles.cardPillActive : styles.cardPillInactive,
                          ]}
                        >
                          <Text style={styles.cardEmoji}>{item.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.cardPillTitle,
                                isSelected ? styles.textDark : styles.textLight,
                              ]}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={[
                                styles.cardPillSubtitle,
                                isSelected ? styles.textDarkDim : styles.textLightDim,
                              ]}
                            >
                              {item.category.toUpperCase()} • 3-min starter task ready
                            </Text>
                          </View>
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                            size={22}
                            color={isSelected ? '#353B2C' : 'rgba(255,255,255,0.4)'}
                          />
                        </Pressable>
                      );
                    })}

                    {/* Custom Goal Accordion / Option */}
                    <Pressable
                      onPress={() => {
                        setIsCustomGoal(true);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      style={[
                        styles.cardPill,
                        isCustomGoal ? styles.cardPillActive : styles.cardPillInactive,
                      ]}
                    >
                      <Text style={styles.cardEmoji}>🎯</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.cardPillTitle,
                            isCustomGoal ? styles.textDark : styles.textLight,
                          ]}
                        >
                          Write my own custom goal
                        </Text>
                        <Text
                          style={[
                            styles.cardPillSubtitle,
                            isCustomGoal ? styles.textDarkDim : styles.textLightDim,
                          ]}
                        >
                          Any project, hobby, habit, or milestone
                        </Text>
                      </View>
                      <Ionicons
                        name={isCustomGoal ? 'create' : 'add-circle-outline'}
                        size={22}
                        color={isCustomGoal ? '#353B2C' : 'rgba(255,255,255,0.4)'}
                      />
                    </Pressable>

                    {/* Custom Input Field when selected */}
                    {isCustomGoal && (
                      <View style={styles.customInputContainer}>
                        <TextInput
                          value={customGoalText}
                          onChangeText={setCustomGoalText}
                          placeholder="e.g. Master React Native, Run a marathon, Save $5k..."
                          placeholderTextColor="rgba(255,255,255,0.5)"
                          style={styles.customTextInput}
                          autoFocus
                        />
                        <View style={styles.categoryPickerRow}>
                          {(['health', 'career', 'study', 'creative', 'personal'] as const).map((cat) => {
                            const isCatActive = selectedCategory === cat;
                            return (
                              <Pressable
                                key={cat}
                                onPress={() => setSelectedCategory(cat)}
                                style={[
                                  styles.categoryChip,
                                  isCatActive && styles.categoryChipActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.categoryChipText,
                                    isCatActive && styles.categoryChipTextActive,
                                  ]}
                                >
                                  {cat}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={() => triggerStepTransition(1)}
                    disabled={isCustomGoal && !customGoalText.trim()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (isCustomGoal && !customGoalText.trim()) && styles.buttonDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Continue to Friction Point</Text>
                    <Ionicons name="arrow-forward" size={18} color="#2A2E22" />
                  </Pressable>
                </View>
              )}

              {/* ================= STEP 1: THE FRICTION POINT ================= */}
              {step === 1 && (
                <View style={styles.stepContainer}>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>STEP 2: THE BLOCKER</Text>
                  </View>
                  <Text style={styles.stepHeading}>What usually breaks your streak?</Text>
                  <Text style={styles.stepSubheading}>
                    Be honest. Your accountability buddy adapts their style to counter this exact trap.
                  </Text>

                  <View style={styles.optionsList}>
                    {FRICTION_OPTIONS.map((item) => {
                      const isSelected = selectedFriction === item.key;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => {
                            setSelectedFriction(item.key);
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                          style={[
                            styles.frictionCard,
                            isSelected ? styles.cardPillActive : styles.cardPillInactive,
                          ]}
                        >
                          <Text style={styles.frictionEmoji}>{item.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.cardPillTitle,
                                isSelected ? styles.textDark : styles.textLight,
                              ]}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={[
                                styles.cardPillSubtitle,
                                isSelected ? styles.textDarkDim : styles.textLightDim,
                              ]}
                            >
                              {item.subtitle}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleActive,
                            ]}
                          >
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => triggerStepTransition(2)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Meet Your Accountability Buddy</Text>
                    <Ionicons name="arrow-forward" size={18} color="#2A2E22" />
                  </Pressable>
                </View>
              )}

              {/* ================= STEP 2: BUDDY & LIVE BANTER ================= */}
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>STEP 3: THE VIBE CHECK</Text>
                  </View>
                  <Text style={styles.stepHeading}>Pick your buddy's style</Text>
                  <Text style={styles.stepSubheading}>
                    Tap each buddy to hear how they will hold you accountable for "{activeGoalTitle}".
                  </Text>

                  {/* Mascot Live Banter Stage */}
                  <View style={styles.liveStage}>
                    {/* Speech Bubble Tail */}
                    <View style={styles.speechBubble}>
                      <View style={styles.speechTagBadge}>
                        <Text style={styles.speechTagText}>{banter.tag}</Text>
                      </View>
                      <Text style={styles.speechText}>{banter.speech}</Text>
                    </View>

                    {/* Animated Mascot */}
                    <Animated.View
                      style={[
                        styles.mascotWrapper,
                        {
                          transform: [
                            { translateY: floatAnim },
                            { scale: mascotScale },
                          ],
                        },
                      ]}
                    >
                      <Image
                        source={BUDDY_MASCOTS[selectedBuddy]}
                        style={styles.mascotImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>

                  {/* 3 Buddy Style Selector Pills */}
                  <View style={styles.buddyGrid}>
                    {(['hype', 'soft', 'savage'] as BuddyType[]).map((type) => {
                      const isSelected = selectedBuddy === type;
                      const config = buddyConfig[type];

                      return (
                        <Pressable
                          key={type}
                          onPress={() => handleBuddySelect(type)}
                          style={[
                            styles.buddyOptionCard,
                            isSelected && styles.buddyOptionCardActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.buddyIconCircle,
                              { backgroundColor: config.accent },
                            ]}
                          >
                            <Text style={styles.buddyIconText}>
                              {type === 'hype' ? '🔥' : type === 'soft' ? '💙' : '😌'}
                            </Text>
                          </View>
                          <Text style={styles.buddyOptionTitle}>{config.label}</Text>
                          <Text style={styles.buddyOptionTagline} numberOfLines={2}>
                            {type === 'hype' && 'Pure praise & high energy'}
                            {type === 'soft' && 'Zero guilt & gentle pacing'}
                            {type === 'savage' && 'Hilarious roast & tough love'}
                          </Text>
                          {isSelected && (
                            <View style={styles.activeCheckmark}>
                              <Ionicons name="checkmark" size={14} color="#FFF" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => triggerStepTransition(3)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Lock In Buddy & See Day 1 Task</Text>
                    <Ionicons name="arrow-forward" size={18} color="#2A2E22" />
                  </Pressable>
                </View>
              )}

              {/* ================= STEP 3: DAY 1 MICRO-WIN ================= */}
              {step === 3 && (
                <View style={styles.stepContainer}>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>STEP 4: DAY 1 MOMENTUM</Text>
                  </View>
                  <Text style={styles.stepHeading}>Your 3-minute micro-win</Text>
                  <Text style={styles.stepSubheading}>
                    Consistency doesn't come from giant leaps. It comes from one ridiculously easy step today.
                  </Text>

                  {/* The Highlighted Day 1 Micro-Win Card */}
                  <View style={styles.microWinHeroCard}>
                    <View style={styles.microWinHeader}>
                      <View style={styles.timeBadge}>
                        <Ionicons name="flash" size={14} color="#FFF" />
                        <Text style={styles.timeBadgeText}>TODAY • 3 MINUTES</Text>
                      </View>
                      <Text style={styles.goalCategoryBadge}>
                        {generatedGoal.category.toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.heroGoalTitle}>{generatedGoal.title}</Text>

                    <View style={styles.taskSpotlight}>
                      <View style={styles.taskSpotlightIcon}>
                        <Ionicons name="play" size={20} color="#E88C44" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskSpotlightEyebrow}>DAY 1 ACTION</Text>
                        <Text style={styles.taskSpotlightText}>
                          {generatedGoal.tasks[0]?.title}
                        </Text>
                      </View>
                    </View>

                    {/* Buddy endorsement line */}
                    <View style={styles.buddyEndorsement}>
                      <Image
                        source={BUDDY_MASCOTS[selectedBuddy]}
                        style={styles.buddySmallAvatar}
                        resizeMode="contain"
                      />
                      <Text style={styles.buddyEndorsementText}>
                        {selectedBuddy === 'hype' &&
                          "Knock this out today, and you're officially on a streak. Let's make it real! 🔥"}
                        {selectedBuddy === 'soft' &&
                          "Just this one small task. No stress, no rush. You've got this 🤍"}
                        {selectedBuddy === 'savage' &&
                          "It's 3 minutes. If you can't do this, we need to have a serious talk 😌"}
                      </Text>
                    </View>

                    {/* Upcoming roadmap glimpse */}
                    <View style={styles.roadmapGlimpse}>
                      <Text style={styles.roadmapHeading}>UPCOMING STEPS IN GLOWGOAL</Text>
                      {generatedGoal.tasks.slice(1, 4).map((t, idx) => (
                        <View key={t.id} style={styles.roadmapRow}>
                          <Text style={styles.roadmapIndex}>0{idx + 2}</Text>
                          <Text style={styles.roadmapText} numberOfLines={1}>
                            {t.title}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Dual Action Buttons: Guest Mode vs Create Account */}
                  <View style={styles.launchButtonsContainer}>
                    <Pressable
                      onPress={() => handleLaunch('guest')}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#2A2E22" />
                      ) : (
                        <>
                          <Text style={styles.primaryButtonText}>
                            Start Crushing It (Guest Mode)
                          </Text>
                          <Ionicons name="arrow-forward" size={18} color="#2A2E22" />
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => handleLaunch('signup')}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.secondaryOutlineButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                      <Text style={styles.secondaryOutlineButtonText}>
                        Save & Create Free Account
                      </Text>
                    </Pressable>

                    <Text style={styles.disclaimerText}>
                      No credit card required. You can always sign up later to sync across devices.
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: '#FFFFFF',
  },
  progressBarInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  scrollContentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  stepHeading: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubheading: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    maxWidth: 520,
    marginBottom: 24,
  },
  optionsList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  cardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 14,
  },
  frictionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 14,
  },
  cardPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  cardPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardEmoji: {
    fontSize: 26,
  },
  frictionEmoji: {
    fontSize: 30,
  },
  cardPillTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardPillSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  textDark: {
    color: '#2A2E22',
  },
  textLight: {
    color: '#FFFFFF',
  },
  textDarkDim: {
    color: 'rgba(42,46,34,0.65)',
  },
  textLightDim: {
    color: 'rgba(255,255,255,0.7)',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#353B2C',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#353B2C',
  },
  customInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  customTextInput: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    marginBottom: 12,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#2A2E22',
    fontWeight: '800',
  },
  liveStage: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  speechBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: 480,
    width: '94%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 14,
  },
  speechTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#353B2C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  speechTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  speechText: {
    color: '#2A2E22',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  mascotImage: {
    width: 170,
    height: 170,
  },
  buddyGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 24,
  },
  buddyOptionCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  buddyOptionCardActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: '#FFFFFF',
  },
  buddyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  buddyIconText: {
    fontSize: 20,
  },
  buddyOptionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  buddyOptionTagline: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  activeCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microWinHeroCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  microWinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E88C44',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  goalCategoryBadge: {
    color: '#828C6A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroGoalTitle: {
    color: '#2A2E22',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
  },
  taskSpotlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 16,
  },
  taskSpotlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E88C44',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  taskSpotlightEyebrow: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  taskSpotlightText: {
    color: '#431407',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  buddyEndorsement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  buddySmallAvatar: {
    width: 38,
    height: 38,
  },
  buddyEndorsementText: {
    flex: 1,
    color: '#4A5568',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  roadmapGlimpse: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 14,
    gap: 8,
  },
  roadmapHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A0AEC0',
    letterSpacing: 1,
    marginBottom: 4,
  },
  roadmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roadmapIndex: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '800',
  },
  roadmapText: {
    flex: 1,
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '600',
  },
  launchButtonsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#2A2E22',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryOutlineButton: {
    width: '100%',
    height: 54,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryOutlineButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  disclaimerText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 420,
    marginTop: 4,
  },
});
