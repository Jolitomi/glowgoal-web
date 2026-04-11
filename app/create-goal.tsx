import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

type NavTab = 'home' | 'goals' | 'progress' | 'profile';
type Category =
  | 'career'
  | 'health'
  | 'study'
  | 'money'
  | 'personal'
  | 'creative';

const categories: {
  key: Category;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'career', label: 'Career', icon: 'briefcase' },
  { key: 'health', label: 'Health', icon: 'fitness' },
  { key: 'study', label: 'Study', icon: 'school' },
  { key: 'money', label: 'Money', icon: 'wallet' },
  { key: 'personal', label: 'Personal', icon: 'sparkles' },
  { key: 'creative', label: 'Creative', icon: 'brush' },
];

export default function CreateGoalScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isPhone = width < 600;

  const [activeTab] = useState<NavTab>('goals');
  const [goalTitle, setGoalTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [deadline, setDeadline] = useState('');
  const [reason, setReason] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
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
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [fadeAnim, floatAnim]);

  const canContinue = useMemo(() => {
    return goalTitle.trim().length > 0 && selectedCategory !== null;
  }, [goalTitle, selectedCategory]);

  const handleCreateGoal = () => {
    if (!canContinue || !selectedCategory) return;

    router.push({
      pathname: '/goal-breakdown',
      params: {
        goalTitle: goalTitle.trim(),
        category: selectedCategory,
        deadline: deadline.trim(),
        reason: reason.trim(),
      },
    });
  };

  const handleTabPress = (tab: NavTab) => {
    if (tab === 'home') router.push('/dashboard');
    if (tab === 'goals') router.push('/goals');
    if (tab === 'progress') router.push('/progress');
    if (tab === 'profile') router.push('/profile');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarBrand}>GlowGoal⭐</Text>

          <View style={styles.sidebarNav}>
            <NavItem
              label="Home"
              icon="home"
              active={activeTab === 'home'}
              onPress={() => handleTabPress('home')}
              isVertical
            />
            <NavItem
              label="Goals"
              icon="flag"
              active={activeTab === 'goals'}
              onPress={() => handleTabPress('goals')}
              isVertical
            />
            <NavItem
              label="Stats"
              icon="analytics"
              active={activeTab === 'progress'}
              onPress={() => handleTabPress('progress')}
              isVertical
            />
            <NavItem
              label="Profile"
              icon="person"
              active={activeTab === 'profile'}
              onPress={() => handleTabPress('profile')}
              isVertical
            />
          </View>
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.mainWrapper,
            isDesktop && { marginLeft: 280 },
            { opacity: fadeAnim },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.contentContainer}>
              <View style={styles.pageHeader}>
                <Pressable onPress={() => router.push('/goals')} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={22} color="#FFF7EF" />
                </Pressable>

                <View style={styles.pageHeaderTextWrap}>
                  <Text style={styles.headerTitle}>new goal</Text>
                  <Text style={styles.headerSubtext}>
                    start here, then we’ll break it into tiny steps
                  </Text>
                </View>
              </View>

              <View style={styles.heroCard}>
                <View style={[styles.heroContent, isPhone && styles.heroContentPhone]}>
                  <View style={styles.heroTextSection}>
                    <View style={styles.buddyBadge}>
                      <Text style={styles.buddyBadgeText}>plan phase</Text>
                    </View>

                    <Text style={styles.heroTitle}>what&apos;s the big plan?</Text>
                    <Text style={styles.heroDescription}>
                      Start with the big dream. The next screen will break it into
                      smaller, realistic steps.
                    </Text>
                  </View>

                  <Animated.View
                    style={[
                      styles.mascotWrapper,
                      { transform: [{ translateY: floatAnim }] },
                    ]}
                  >
                    <View style={styles.mascotGlow} />
                    <Ionicons name="sparkles" size={54} color="#FFD580" />
                  </Animated.View>
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>the goal</Text>
                <TextInput
                  value={goalTitle}
                  onChangeText={setGoalTitle}
                  placeholder="e.g. land a data role, save for a trip, finish my portfolio"
                  placeholderTextColor="rgba(70,58,48,0.48)"
                  style={[styles.mainInput, styles.goalInput]}
                  multiline
                  textAlignVertical="top"
                />

                <Text style={[styles.inputLabel, styles.sectionGap]}>category</Text>
                <View style={styles.chipGrid}>
                  {categories.map((cat) => {
                    const active = selectedCategory === cat.key;

                    return (
                      <Pressable
                        key={cat.key}
                        onPress={() => setSelectedCategory(cat.key)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={16}
                          color={active ? '#5A3D24' : '#5C5248'}
                        />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.formRow, !isDesktop && styles.formRowStack]}>
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, styles.sectionGap]}>
                      deadline <Text style={styles.optionalText}>(optional)</Text>
                    </Text>
                    <TextInput
                      value={deadline}
                      onChangeText={setDeadline}
                      placeholder="June 15"
                      placeholderTextColor="rgba(70,58,48,0.48)"
                      style={styles.mainInput}
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, styles.sectionGap]}>
                      why it matters <Text style={styles.optionalText}>(optional)</Text>
                    </Text>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="give your buddy some context"
                      placeholderTextColor="rgba(70,58,48,0.48)"
                      style={[styles.mainInput, styles.reasonInput]}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              <Pressable
                onPress={handleCreateGoal}
                disabled={!canContinue}
                style={({ pressed }) => [
                  styles.ctaButton,
                  !canContinue && styles.ctaButtonDisabled,
                  pressed && canContinue && styles.ctaButtonPressed,
                ]}
              >
                <Text style={styles.ctaText}>break this into steps</Text>
                <Ionicons name="arrow-forward" size={18} color="#5A3D24" />
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {!isDesktop && (
        <View style={styles.mobileNavWrapper}>
          <View style={styles.mobileNav}>
            <NavItem
              label="Home"
              icon="home"
              active={activeTab === 'home'}
              onPress={() => handleTabPress('home')}
            />
            <NavItem
              label="Goals"
              icon="flag"
              active={activeTab === 'goals'}
              onPress={() => handleTabPress('goals')}
            />
            <NavItem
              label="Stats"
              icon="analytics"
              active={activeTab === 'progress'}
              onPress={() => handleTabPress('progress')}
            />
            <NavItem
              label="You"
              icon="person"
              active={activeTab === 'profile'}
              onPress={() => handleTabPress('profile')}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
  isVertical,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  isVertical?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.navItem,
        isVertical && styles.navItemVertical,
        active && isVertical && styles.navItemVerticalActive,
      ]}
    >
      <Ionicons
        name={active ? icon : (`${icon}-outline` as any)}
        size={isVertical ? 22 : 24}
        color={
          active
            ? isVertical
              ? '#FFD580'
              : '#5A3D24'
            : isVertical
            ? 'rgba(255,255,255,0.4)'
            : '#A4988D'
        }
      />
      <Text
        style={[
          styles.navLabel,
          isVertical ? styles.navLabelVertical : styles.navLabelMobile,
          active && (isVertical ? { color: '#FFF' } : { color: '#5A3D24' }),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#828C6A' },
  safeArea: { flex: 1 },
  mainWrapper: { flex: 1 },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#6D7856',
    padding: 40,
    zIndex: 100,
  },
  sidebarBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 50,
    letterSpacing: -1,
  },
  sidebarNav: { gap: 15 },

  contentContainer: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 150 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  pageHeaderTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF7EF',
    textTransform: 'lowercase',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,247,239,0.75)',
    lineHeight: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroContentPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  heroTextSection: { flex: 1 },
  buddyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  buddyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F5EDE3',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#FFF7EF',
    letterSpacing: -0.5,
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,247,239,0.82)',
    maxWidth: 460,
  },
  mascotWrapper: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotGlow: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,213,128,0.18)',
  },

  formCard: {
    backgroundColor: '#EFE6D8',
    borderRadius: 26,
    padding: 18,
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5F5347',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionGap: { marginTop: 18 },
  optionalText: {
    color: 'rgba(95,83,71,0.65)',
    fontWeight: '700',
  },
  mainInput: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FBF7F1',
    borderWidth: 1,
    borderColor: '#E6DAC8',
    color: '#473C34',
    fontSize: 15,
    fontWeight: '600',
  },
  goalInput: { minHeight: 94 },
  reasonInput: { minHeight: 88 },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FBF7F1',
    borderWidth: 1,
    borderColor: '#E6DAC8',
  },
  chipActive: {
    backgroundColor: '#FFD580',
    borderColor: '#FFD580',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5C5248',
  },
  chipTextActive: {
    color: '#5A3D24',
  },

  formRow: {
    flexDirection: 'row',
    gap: 14,
  },
  formRowStack: {
    flexDirection: 'column',
  },
  fieldBlock: {
    flex: 1,
  },

  ctaButton: {
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFD580',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  ctaButtonDisabled: {
    opacity: 0.55,
  },
  ctaButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#5A3D24',
  },

  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navItemVertical: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    width: '100%',
  },
  navItemVerticalActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  navLabel: { fontWeight: '700' },
  navLabelMobile: { fontSize: 10, color: '#6D7856', marginTop: 4 },
  navLabelVertical: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },

  mobileNavWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 9999,
    ...Platform.select({ web: { position: 'fixed' as any } }),
  },
  mobileNav: {
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
});