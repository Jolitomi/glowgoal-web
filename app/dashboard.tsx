import { scheduleDailyReminders } from '@/lib/daily-reminder-engine';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { auth, db } from '../lib/firebase';
import {
  calculateStreak,
  deleteGoal,
  getGoals,
  GoalItem,
  subscribeToGoals,
} from '../lib/goals';
import {
  getSyncState,
  subscribeToSyncState,
  SyncState,
} from '../lib/guest-storage';
import {
  getUserPreferences,
  subscribeToUserPreferences,
} from '../lib/preferences';
import {
  dismissSyncFailure,
  retrySync,
  syncGuestDataToAccount,
} from '../lib/sync-manager';
import { updateLastAppOpened } from '../lib/user-activity';
import { resetMissedDays } from '../lib/user-behavior';

type NavTab = 'home' | 'goals' | 'progress' | 'profile';

const syncUserEmailToFirestore = async (user: User | null) => {
  if (user && user.email) {
    try {
      const prefRef = doc(db, 'users', user.uid, 'profile', 'preferences');
      await setDoc(prefRef, {
        email: user.email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log('✅ Background Sync: Email secured for cloud scheduler.');
    } catch (error) {
      console.log('❌ Background Sync Failed:', error);
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

  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    pendingGoalsCount: 0,
    failedAttempts: 0,
  });
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

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

  // Subscribe to guest-to-cloud sync status
  useEffect(() => {
    const unsubscribeSync = subscribeToSyncState((state) => {
      setSyncState(state);
    });
    return () => {
      unsubscribeSync();
    };
  }, []);

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

          // Trigger email sync on focus if user is authenticated
          if (auth.currentUser) {
            await syncUserEmailToFirestore(auth.currentUser);

            // Auto-retry pending guest goals sync in the background
            const currentSync = await getSyncState();
            if (currentSync.pendingGoalsCount > 0 && currentSync.status !== 'syncing') {
              syncGuestDataToAccount()
                .then(async (report) => {
                  if (report.status === 'synced' && isActive) {
                    const refreshedGoals = await getGoals();
                    setGoals(refreshedGoals);
                    setStreak(calculateStreak(refreshedGoals));
                  }
                })
                .catch(() => {});
            }
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

  const handleRetrySync = async () => {
    setIsRetryingSync(true);
    try {
      const report = await retrySync();
      if (report.status === 'synced') {
        const count = report.syncedGoalsCount + report.mergedGoalsCount;
        setSyncSuccessToast(
          count > 0
            ? `Synced ${count} goal${count === 1 ? '' : 's'} to your cloud account!`
            : 'All goals are safely synced!'
        );
        setTimeout(() => setSyncSuccessToast(null), 4000);
        const liveGoals = await getGoals();
        setGoals(liveGoals);
        setStreak(calculateStreak(liveGoals));
      }
    } catch (err) {
      console.warn('Manual sync retry failed:', err);
    } finally {
      setIsRetryingSync(false);
    }
  };

  const handleDismissSync = async () => {
    await dismissSyncFailure();
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
                    <Ionicons name="sparkles" size={16} color="#E88C44" />
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

              {/* Sync Recovery Safeguard Banner */}
              {currentUser && syncState.pendingGoalsCount > 0 && syncState.status === 'failed' && (
                <View style={styles.syncErrorBanner}>
                  <View style={styles.syncBannerTop}>
                    <View style={styles.syncIconWrap}>
                      <Ionicons name="cloud-offline-outline" size={20} color="#9A3412" />
                    </View>
                    <View style={styles.syncBannerTextWrap}>
                      <Text style={styles.syncBannerTitle}>Cloud Sync Paused</Text>
                      <Text style={styles.syncBannerSubtitle}>
                        {syncState.pendingGoalsCount} goal{syncState.pendingGoalsCount === 1 ? '' : 's'} from your guest session couldn't be uploaded yet. Your data is safely saved on this device.
                      </Text>
                      {!!syncState.errorMessage && (
                        <Text style={styles.syncBannerErrorDetail} numberOfLines={2}>
                          {syncState.errorMessage}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.syncBannerActions}>
                    <Pressable
                      style={[styles.syncRetryBtn, isRetryingSync && styles.syncBtnDisabled]}
                      onPress={handleRetrySync}
                      disabled={isRetryingSync}
                    >
                      {isRetryingSync ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="refresh" size={14} color="#FFFFFF" />
                          <Text style={styles.syncRetryText}>Retry Sync</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      style={styles.syncDismissBtn}
                      onPress={handleDismissSync}
                      disabled={isRetryingSync}
                    >
                      <Text style={styles.syncDismissText}>Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Sync Success Feedback Toast */}
              {!!syncSuccessToast && (
                <View style={styles.syncSuccessToast}>
                  <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                  <Text style={styles.syncSuccessToastText}>{syncSuccessToast}</Text>
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
                      <Ionicons name="add-circle" size={18} color="#5A3D24" />
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
                        <Ionicons name="flame" size={16} color="#FFD580" />
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

  contentContainer: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 150 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInitial: { fontWeight: '800', color: '#FFF' },

  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextSection: { flex: 1 },
  buddyBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  buddyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
    lineHeight: 36,
    textTransform: 'lowercase',
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 20,
  },
  mainAction: {
    backgroundColor: '#FFD580',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  mainActionText: {
    color: '#5A3D24',
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
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statCardActive: {
    borderColor: 'rgba(255,213,128,0.3)',
    shadowColor: '#FFD580',
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
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  statValueActive: { color: '#FFD580' },

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
    color: '#FFF',
    textTransform: 'lowercase',
  },
  goalsCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#FFF',
    fontWeight: '800',
    paddingTop: Platform.OS === 'android' ? 4 : 6,
  },
  seeAllText: {
    color: '#FFD580',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'lowercase',
  },

  emptyState: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyStateTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },

  goalCard: {
    backgroundColor: '#F4EBDD',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7D7C1',
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalCategoryPill: {
    backgroundColor: '#E9DECF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  goalCategoryText: {
    color: '#6B5A4A',
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
    backgroundColor: '#F8DDD1',
  },
  goalCardTitle: {
    color: '#463A31',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  goalDeadline: {
    color: '#7B6B5D',
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
    backgroundColor: '#E6D7C7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#D7A85B',
    borderRadius: 999,
  },
  goalProgressText: {
    color: '#6B5A4A',
    fontSize: 12,
    fontWeight: '900',
    width: 38,
    textAlign: 'right',
  },
  goalMeta: {
    color: '#7B6B5D',
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 24, 20, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#F4EBDD',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E7D7C1',
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8DDD1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#463A31',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B5A4A',
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
    backgroundColor: '#E9DECF',
  },
  modalDeleteBtn: {
    backgroundColor: '#C96F5D',
  },
  modalCancelText: {
    color: '#5E4B3D',
    fontWeight: '800',
    fontSize: 14,
  },
  modalDeleteText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  guestBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
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
    color: '#7C2D12',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  guestBannerButton: {
    backgroundColor: '#E88C44',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  guestBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  syncErrorBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  syncBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  syncIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBannerTextWrap: {
    flex: 1,
  },
  syncBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C2D12',
    marginBottom: 4,
  },
  syncBannerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9A3412',
    fontWeight: '500',
  },
  syncBannerErrorDetail: {
    fontSize: 11,
    lineHeight: 16,
    color: '#C2410C',
    marginTop: 4,
    fontStyle: 'italic',
  },
  syncBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingLeft: 48,
  },
  syncRetryBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncRetryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  syncDismissBtn: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  syncDismissText: {
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '700',
  },
  syncSuccessToast: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncSuccessToastText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '800',
  },
});
