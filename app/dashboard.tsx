import { scheduleDailyReminders } from '@/lib/daily-reminder-engine';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Added for the sync logic
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
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
import { buddyConfig, BuddyType } from '../lib/buddy';
import { auth, db } from '../lib/firebase'; // Added db
import {
  calculateStreak,
  deleteGoal,
  getGoals,
  GoalItem,
  subscribeToGoals,
} from '../lib/goals';
import {
  getUserPreferences,
  subscribeToUserPreferences,
} from '../lib/preferences';
import { updateLastAppOpened } from '../lib/user-activity';
import { resetMissedDays } from '../lib/user-behavior';

type NavTab = 'home' | 'goals' | 'progress' | 'profile';


const syncUserEmailToFirestore = async (user: User | null) => {
  if (user && user.email) {
    try {
      const prefRef = doc(db, "users", user.uid, "profile", "preferences");
      await setDoc(prefRef, {
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("✅ Background Sync: Email secured for cloud scheduler.");
    } catch (error) {
      console.log("❌ Background Sync Failed:", error);
    }
  }
};

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isPhone = width < 600;

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [buddy, setBuddy] = useState<BuddyType | null>(null);
  const [streak, setStreak] = useState(0);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<GoalItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const userName = useMemo(() => {
    const name =
      currentUser?.displayName ||
      currentUser?.email?.split('@')[0] ||
      'friend';

    return name.split(' ')[0].toLowerCase();
  }, [currentUser]);

  const previewGoals = useMemo(() => goals.slice(0, 2), [goals]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const run = async () => {
        try {
          await updateLastAppOpened();
          await resetMissedDays();

          const liveGoals = await getGoals();
          const prefs = await getUserPreferences();
          const activeBuddy = prefs?.buddy ?? 'hype';

          if (!isActive) return;

          // Also trigger sync on focus just to be safe for launch
          if (auth.currentUser) {
            await syncUserEmailToFirestore(auth.currentUser);
          }

          await scheduleDailyReminders(liveGoals, activeBuddy);
        } catch (error) {
          console.log('Dashboard focus effect failed:', error);
        }
      };

      run();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    let unsubscribeGoals: (() => void) | undefined;
    let unsubscribePreferences: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // Trigger the email sync as soon as auth state is confirmed
      if (user) {
        syncUserEmailToFirestore(user);
      }

      unsubscribeGoals?.();
      unsubscribePreferences?.();

      if (!user) {
        getGoals().then((liveGoals) => {
          setGoals(liveGoals);
          setStreak(calculateStreak(liveGoals));
        }).catch(() => {
          setGoals([]);
          setStreak(0);
        });
        getUserPreferences().then((prefs) => {
          setBuddy(prefs?.buddy ?? 'hype');
        }).catch(() => {
          setBuddy('hype');
        });
        return;
      }

      unsubscribeGoals = subscribeToGoals((liveGoals) => {
        setGoals(liveGoals);
        setStreak(calculateStreak(liveGoals));
      });

      unsubscribePreferences = subscribeToUserPreferences((prefs) => {
        setBuddy(prefs?.buddy ?? 'hype');
      });
    });

    return () => {
      unsubscribeGoals?.();
      unsubscribePreferences?.();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();

    return () => {
      floatLoop.stop();
    };
  }, [fadeAnim, floatAnim]);

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (streak > 0) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      pulseLoop?.stop();
    };
  }, [pulseAnim, streak]);

  const handleDeleteGoal = (goal: GoalItem) => {
    setGoalToDelete(goal);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalVisible(false);
    setGoalToDelete(null);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteGoal(goalToDelete.id);
      setDeleteModalVisible(false);
      setGoalToDelete(null);
    } catch (error) {
      console.log('Could not delete goal right now:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!buddy) return null;
  const currentBuddy = buddyConfig[buddy];

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
              onPress={() => setActiveTab('home')}
              isVertical
            />
            <NavItem
              label="Goals"
              icon="flag"
              active={activeTab === 'goals'}
              onPress={() => router.push('/goals')}
              isVertical
            />
            <NavItem
              label="Stats"
              icon="analytics"
              active={activeTab === 'progress'}
              onPress={() => router.push('/progress')}
              isVertical
            />
            <NavItem
              label="Profile"
              icon="person"
              active={activeTab === 'profile'}
              onPress={() => router.push('/profile')}
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
              <View style={styles.header}>
                <View>
                  <Text style={styles.greeting}>hey, {userName} ✨</Text>
                  <Text style={styles.subtitle}>your brand is growing today.</Text>
                </View>

                <View style={styles.profileCircle}>
                  <Text style={styles.profileInitial}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>

              {!currentUser && (
                <View style={styles.guestBanner}>
                  <View style={styles.guestBannerLeft}>
                    <Ionicons name="sparkles" size={16} color="#6D4AFF" />
                    <Text style={styles.guestBannerText}>
                      Guest session active • Save your streak & sync across devices
                    </Text>
                  </View>
                  <Pressable
                    style={styles.guestBannerButton}
                    onPress={() => router.push('/signup')}
                  >
                    <Text style={styles.guestBannerButtonText}>Sign Up Free</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.heroCard}>
                <View
                  style={[
                    styles.heroContent,
                    isPhone && { flexDirection: 'column' },
                  ]}
                >
                  <View style={styles.heroTextSection}>
                    <View style={styles.buddyBadge}>
                      <Text style={styles.buddyBadgeText}>
                        {currentBuddy.label} buddy
                      </Text>
                    </View>

                    <Text style={styles.heroTitle} numberOfLines={2}>
                      keep the momentum
                    </Text>

                    <Text style={styles.heroDescription}>
                      {currentBuddy.nudgeBody}
                    </Text>

                    <Pressable
                      style={styles.mainAction}
                      onPress={() => router.push('/create-goal')}
                    >
                      <Text style={styles.mainActionText}>New Goal</Text>
                      <Ionicons name="add-circle" size={18} color="#211A3A" />
                    </Pressable>
                  </View>

                  <Animated.View
                    style={[
                      styles.mascotWrapper,
                      { transform: [{ translateY: floatAnim }] },
                      isPhone && { alignSelf: 'flex-end', marginTop: -30 },
                    ]}
                  >
                    <Image
                      source={currentBuddy.image}
                      style={styles.mascotImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View
                  style={[styles.statCard, streak > 0 && styles.statCardActive]}
                >
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>WIN STREAK</Text>
                    {streak > 0 && (
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Ionicons name="flame" size={16} color="#D7FF64" />
                      </Animated.View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.statValue,
                      streak > 0 && styles.statValueActive,
                    ]}
                  >
                    {streak} day{streak === 1 ? '' : 's'}
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>TOTAL GOALS</Text>
                  <Text style={styles.statValue}>{goals.length}</Text>
                </View>
              </View>

              <View style={styles.goalsSection}>
                <View style={styles.goalsHeader}>
                  <Text style={styles.goalsTitle}>your goals</Text>

                  <View style={styles.goalsHeaderRight}>
                    {goals.length > 0 && (
                      <Text style={styles.goalsCount}>{goals.length}</Text>
                    )}

                    {goals.length > 2 && (
                      <Pressable onPress={() => router.push('/goals')}>
                        <Text style={styles.seeAllText}>see all</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {goals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No goals yet</Text>
                    <Text style={styles.emptyStateText}>
                      Add a goal and it will show up here.
                    </Text>
                  </View>
                ) : (
                  previewGoals.map((goal) => {
                    const completedCount = goal.tasks.filter(
                      (task) => task.completed
                    ).length;

                    return (
                      <Pressable
                        key={goal.id}
                        style={styles.goalCard}
                        onPress={() =>
                          router.push({
                            pathname: '/goal-details',
                            params: { goalId: goal.id },
                          })
                        }
                      >
                        <View style={styles.goalTopRow}>
                          <View style={styles.goalCategoryPill}>
                            <Text style={styles.goalCategoryText}>
                              {goal.category}
                            </Text>
                          </View>

                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteGoal(goal);
                            }}
                            hitSlop={12}
                            style={styles.goalDeleteBtn}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#7A4B32"
                            />
                          </Pressable>
                        </View>

                        <Text style={styles.goalCardTitle} numberOfLines={2}>
                          {goal.title}
                        </Text>

                        {!!goal.deadline && (
                          <Text style={styles.goalDeadline}>
                            Due: {goal.deadline}
                          </Text>
                        )}

                        <View style={styles.goalProgressRow}>
                          <View style={styles.goalProgressTrack}>
                            <View
                              style={[
                                styles.goalProgressFill,
                                { width: `${goal.progress}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.goalProgressText}>
                            {goal.progress}%
                          </Text>
                        </View>

                        <Text style={styles.goalMeta}>
                          {completedCount}/{goal.tasks.length} tasks completed
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
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
              onPress={() => setActiveTab('home')}
            />
            <NavItem
              label="Goals"
              icon="flag"
              active={activeTab === 'goals'}
              onPress={() => router.push('/goals')}
            />
            <NavItem
              label="Stats"
              icon="analytics"
              active={activeTab === 'progress'}
              onPress={() => router.push('/progress')}
            />
            <NavItem
              label="You"
              icon="person"
              active={activeTab === 'profile'}
              onPress={() => router.push('/profile')}
            />
          </View>
        </View>
      )}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteModal} />

          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash-outline" size={22} color="#7A4B32" />
            </View>

            <Text style={styles.modalTitle}>Delete this goal?</Text>

            <Text style={styles.modalText}>
              {goalToDelete
                ? `Are you sure you want to delete "${goalToDelete.title}"? This action cannot be undone.`
                : 'Are you sure you want to delete this goal?'}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={closeDeleteModal}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalDeleteBtn]}
                onPress={confirmDeleteGoal}
                disabled={isDeleting}
              >
                <Text style={styles.modalDeleteText}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NavItem({ label, icon, active, onPress, isVertical }: any) {
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
              ? '#D7FF64'
              : '#211A3A'
            : isVertical
              ? 'rgba(255,255,255,0.48)'
              : '#89839D'
        }
      />
      <Text
        style={[
          styles.navLabel,
          isVertical ? styles.navLabelVertical : styles.navLabelMobile,
          active && (isVertical ? { color: '#211A3A' } : { color: '#211A3A' }),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  safeArea: { flex: 1 },
  mainWrapper: { flex: 1 },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#171329',
    padding: 40,
    zIndex: 100,
  },
  sidebarBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: '#211A3A',
    marginBottom: 50,
    letterSpacing: -1,
  },
  sidebarNav: { gap: 15 },

  contentContainer: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 150 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: { fontSize: 28, fontWeight: '900', color: '#211A3A', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: 'rgba(33,26,58,0.68)', fontWeight: '500' },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(109,74,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(109,74,255,0.18)',
  },
  profileInitial: { fontWeight: '800', color: '#211A3A' },

  heroCard: {
    backgroundColor: '#211A3A',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(109,74,255,0.12)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextSection: { flex: 1 },
  buddyBadge: {
    backgroundColor: 'rgba(109,74,255,0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  buddyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 36,
    textTransform: 'lowercase',
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 20,
  },
  mainAction: {
    backgroundColor: '#D7FF64',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  mainActionText: {
    color: '#211A3A',
    fontWeight: '900',
    marginRight: 6,
    fontSize: 14,
  },
  mascotWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotImage: { width: '100%', height: '100%' },

  statsGrid: { flexDirection: 'row', gap: 16, marginTop: 16, marginBottom: 22 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(33,26,58,0.06)',
  },
  statCardActive: {
    borderColor: 'rgba(255,213,128,0.3)',
    shadowColor: '#D7FF64',
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(119,113,140,0.8)',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: '#211A3A' },
  statValueActive: { color: '#D7FF64' },

  goalsSection: {
    marginTop: 4,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  goalsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#211A3A',
    textTransform: 'lowercase',
  },
  goalsCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(109,74,255,0.08)',
    color: '#211A3A',
    fontWeight: '800',
    paddingTop: Platform.OS === 'android' ? 4 : 6,
  },
  seeAllText: {
    color: '#D7FF64',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'lowercase',
  },

  emptyState: {
    backgroundColor: 'rgba(109,74,255,0.06)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(109,74,255,0.12)',
  },
  emptyStateTitle: {
    color: '#211A3A',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },

  goalCard: {
    backgroundColor: '#211A3AFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E0F2',
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalCategoryPill: {
    backgroundColor: '#F0ECFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  goalCategoryText: {
    color: '#77718C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  goalDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4E7',
  },
  goalCardTitle: {
    color: '#211A3A',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  goalDeadline: {
    color: '#77718C',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  goalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  goalProgressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E9E5F5',
    borderRadius: 999,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#6D4AFF',
    borderRadius: 999,
  },
  goalProgressText: {
    color: '#77718C',
    fontSize: 12,
    fontWeight: '900',
    width: 38,
    textAlign: 'right',
  },
  goalMeta: {
    color: '#77718C',
    fontSize: 13,
    fontWeight: '700',
  },

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
    backgroundColor: '#211A3AFFF',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
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
  navItemVerticalActive: { backgroundColor: 'rgba(109,74,255,0.12)' },
  navLabel: { fontWeight: '700' },
  navLabelMobile: { fontSize: 10, color: '#171329', marginTop: 4 },
  navLabelVertical: { fontSize: 15, color: 'rgba(255,255,255,0.68)' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 19, 41, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#211A3AFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E0F2',
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE4E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#211A3A',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#77718C',
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F0ECFF',
  },
  modalDeleteBtn: {
    backgroundColor: '#E65068',
  },
  modalCancelText: {
    color: '#5E4B3D',
    fontWeight: '800',
    fontSize: 14,
  },
  modalDeleteText: {
    color: '#211A3A',
    fontWeight: '900',
    fontSize: 14,
  },
  guestBanner: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#E5E0F2',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  guestBannerLeft: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestBannerText: {
    color: '#77718C',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  guestBannerButton: {
    backgroundColor: '#6D4AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  guestBannerButtonText: {
    color: '#211A3AFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});