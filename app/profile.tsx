import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
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
import { auth } from '../lib/firebase';
import {
  cancelGlowGoalNotifications,
  ensureNotificationPermissions,
  registerForPushNotificationsAsync,
} from '../lib/notifications';
import {
  getUserPreferences,
  updateEmailNotificationsEnabled,
  updatePushNotificationsEnabled,
  updateUserBuddy
} from '../lib/preferences';

type NavTab = 'home' | 'goals' | 'progress' | 'profile';
type ModalType =
  | 'buddy'
  | 'signout'
  | 'theme'
  | 'support'
  | 'notifications'
  | 'emailNotifications'
  | 'success';

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [activeTab] = useState<NavTab>('profile');
  const [buddy, setBuddy] = useState<BuddyType | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState<BuddyType | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    type: ModalType;
  }>({
    title: '',
    type: 'buddy',
  });

  const [pendingNotificationState, setPendingNotificationState] =
    useState<boolean | null>(null);
  const [pendingEmailState, setPendingEmailState] =
    useState<boolean | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const user = auth.currentUser;
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Explorer';

  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getUserPreferences();

        setBuddy(prefs?.buddy ?? 'hype');
        setNotificationsEnabled(prefs?.pushNotificationsEnabled ?? true);
        setEmailEnabled(prefs?.emailNotificationsEnabled ?? false);

      } catch (error) {
        console.error('Failed to load preferences:', error);
        setBuddy('hype');
        setNotificationsEnabled(true);
        setEmailEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const updateBuddy = async (type: BuddyType) => {
    try {
      setIsUpdating(type);
      await updateUserBuddy(type);

      setTimeout(() => {
        setBuddy(type);
        setModalVisible(false);
        setIsUpdating(null);
      }, 500);
    } catch (error) {
      console.log('Failed to update buddy:', error);
      setIsUpdating(null);
    }
  };

  const getNotificationConfirmMessage = (
    buddyType: BuddyType,
    turningOn: boolean
  ) => {
    if (turningOn) {
      switch (buddyType) {
        case 'soft':
          return {
            title: 'turn notifications on?',
            body: 'your buddy can gently keep you close to your goals again 🤍',
            cta: 'turn on',
          };
        case 'savage':
          return {
            title: 'turn notifications back on?',
            body: 'good. because without them, your buddy cannot drag you when you disappear.',
            cta: 'turn on',
          };
        case 'hype':
        default:
          return {
            title: 'turn notifications on?',
            body: 'yesss. let your buddy hype you up and keep your glow goals alive 🔥',
            cta: 'turn on',
          };
      }
    }

    switch (buddyType) {
      case 'soft':
        return {
          title: 'turn notifications off?',
          body: 'if you do this, your buddy cannot check on you when you drift from your goals 🤍',
          cta: 'turn off',
        };
      case 'savage':
        return {
          title: 'turn notifications off?',
          body: 'so… no reminders? your buddy will not be able to hold you accountable when you vanish.',
          cta: 'turn off',
        };
      case 'hype':
      default:
        return {
          title: 'turn notifications off?',
          body: 'your buddy will be here all alone while your goals wait for you 😭',
          cta: 'turn off',
        };
    }
  };

  const getEmailConfirmMessage = (
    buddyType: BuddyType,
    turningOn: boolean
  ) => {
    if (turningOn) {
      switch (buddyType) {
        case 'soft':
          return {
            title: 'turn email reminders on?',
            body: 'your buddy will gently check in through your inbox 🤍',
            cta: 'turn on',
          };
        case 'savage':
          return {
            title: 'enable email reminders?',
            body: 'good. now even your inbox will hold you accountable.',
            cta: 'turn on',
          };
        default:
          return {
            title: 'turn on email reminders?',
            body: 'yesss 🔥 your buddy will keep you on track even in your inbox!',
            cta: 'turn on',
          };
      }
    }

    return {
      title: 'turn off email reminders?',
      body: 'you might miss important nudges 😭',
      cta: 'turn off',
    };
  };

  const getNotificationSuccessMessage = (
    buddyType: BuddyType,
    turnedOn: boolean
  ) => {
    if (turnedOn) {
      switch (buddyType) {
        case 'soft':
          return 'notifications are back on 🤍 your buddy will gently keep you near your goals.';
        case 'savage':
          return 'notifications are on. good. now your buddy can call you out properly.';
        case 'hype':
        default:
          return 'yesss 🔥 notifications are on. let’s make your glow goals real.';
      }
    }

    switch (buddyType) {
      case 'soft':
        return 'notifications are off 🤍 your buddy will be waiting quietly for you.';
      case 'savage':
        return 'notifications are off. your buddy cannot save you from your own avoidance now.';
      case 'hype':
      default:
        return 'notifications are off 😭 your buddy will be here all alone waiting.';
    }
  };

  const openModal = (type: ModalType, title: string) => {
    setModalConfig({ type, title });
    setModalVisible(true);
  };

  const handleToggleNotifications = async () => {
    if (!buddy) return;
    const nextState = !notificationsEnabled;
    setPendingNotificationState(nextState);

    const config = getNotificationConfirmMessage(buddy, nextState);
    openModal('notifications', config.title);
  };

  const confirmToggleNotifications = async () => {
    if (
      pendingNotificationState === null ||
      !buddy ||
      isTogglingNotifications
    ) {
      return;
    }

    const turningOn = pendingNotificationState;
    setIsTogglingNotifications(true);

    try {
      if (!turningOn) {
        await updatePushNotificationsEnabled(false);
        await cancelGlowGoalNotifications();

        setNotificationsEnabled(false);
        setModalVisible(false);
        setSuccessMessage(getNotificationSuccessMessage(buddy, false));
        setModalConfig({ type: 'success', title: 'done' });
        setPendingNotificationState(null);
        setModalVisible(true);
        return;
      }

      const permissionGranted = await ensureNotificationPermissions();

      if (!permissionGranted) {
        setModalVisible(false);
        setSuccessMessage(
          'notifications stayed off because permission was not granted.'
        );
        setModalConfig({ type: 'success', title: 'not enabled' });
        setPendingNotificationState(null);
        setModalVisible(true);
        return;
      }

      await registerForPushNotificationsAsync();
      await updatePushNotificationsEnabled(true);

      setNotificationsEnabled(true);
      setModalVisible(false);
      setSuccessMessage(getNotificationSuccessMessage(buddy, true));
      setModalConfig({ type: 'success', title: 'done' });
      setPendingNotificationState(null);
      setModalVisible(true);
    } catch (error) {
      console.log('Notification toggle failed:', error);
      setModalVisible(false);
      setSuccessMessage(
        'something went wrong while turning notifications on. try again.'
      );
      setModalConfig({ type: 'success', title: 'error' });
      setPendingNotificationState(null);
      setModalVisible(true);
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  const handleToggleEmail = () => {
    const nextState = !emailEnabled;
    setPendingEmailState(nextState);

    const config = getEmailConfirmMessage(buddy ?? 'hype', nextState);
    openModal('emailNotifications', config.title);
  };

  const confirmToggleEmail = async () => {
    if (pendingEmailState === null) return;

    try {
      await updateEmailNotificationsEnabled(pendingEmailState);
      setEmailEnabled(pendingEmailState);

      setSuccessMessage(
        pendingEmailState
          ? 'email reminders are now on 💌'
          : 'email reminders are now off 😭'
      );

      setModalVisible(false);
      setModalConfig({ type: 'success', title: 'done' });
      setPendingEmailState(null);
      setModalVisible(true);
    } catch (error) {
      console.log('Email toggle failed:', error);
      setModalVisible(false);
      setSuccessMessage('something went wrong. try again.');
      setModalConfig({ type: 'success', title: 'error' });
      setPendingEmailState(null);
      setModalVisible(true);
    }
  };

  const handleTabPress = (tab: NavTab) => {
    if (tab === 'home') router.push('/dashboard');
    if (tab === 'goals') router.push('/goals');
    if (tab === 'progress') router.push('/progress');
    if (tab === 'profile') return;
  };

  if (loading || !buddy) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>loading profile...</Text>
      </View>
    );
  }

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
              <View style={styles.profileHeader}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.onlineBadge} />
                </View>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>

              <View style={styles.heroCard}>
                <View style={styles.buddyInfo}>
                  <View>
                    <Text style={styles.cardLabel}>ACTIVE GUIDANCE</Text>
                    <Text style={styles.cardTitle}>{currentBuddy.label} mode</Text>
                  </View>
                  <Ionicons name="flash" size={32} color="#D7FF64" />
                </View>

                <Pressable
                  style={styles.secondaryAction}
                  onPress={() => openModal('buddy', 'switch buddy')}
                >
                  <Text style={styles.secondaryActionText}>switch buddy</Text>
                  <Ionicons name="swap-horizontal" size={16} color="#211A3A" />
                </Pressable>
              </View>

              <View style={styles.settingsGroup}>
                <Text style={styles.sectionLabel}>preferences</Text>

                <SettingItem
                  icon="notifications"
                  label="Push Notifications"
                  value={notificationsEnabled ? 'on' : 'off'}
                  onPress={handleToggleNotifications}
                />

                <SettingItem
                  icon="mail"
                  label="Email Notifications"
                  value={emailEnabled ? 'on' : 'off'}
                  onPress={handleToggleEmail}
                />

                <SettingItem
                  icon="color-palette"
                  label="Theme"
                  value="olive"
                  onPress={() => openModal('theme', 'themes')}
                />

                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>support</Text>

                <SettingItem
                  icon="help-circle"
                  label="Support Hub"
                  onPress={() => openModal('support', 'support hub')}
                />

                <Pressable
                  style={styles.signOutButton}
                  onPress={() => openModal('signout', 'sign out')}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                  <Text style={styles.signOutText}>sign out</Text>
                </Pressable>
              </View>

              <Text style={styles.versionText}>v1.0.4 • built with ❤️</Text>
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

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setPendingNotificationState(null);
          setPendingEmailState(null);
        }}
      >
        <View style={[styles.modalOverlay, isDesktop && { paddingLeft: 280 }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIndicator} />
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>

            {modalConfig.type === 'buddy' && (
              <View style={{ gap: 12, width: '100%' }}>
                {(['hype', 'soft', 'savage'] as BuddyType[]).map((type) => (
                  <Pressable
                    key={type}
                    disabled={isUpdating !== null}
                    style={[
                      styles.modalOption,
                      buddy === type && styles.modalOptionActive,
                      isUpdating === type && {
                        borderColor: '#4CAF50',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => updateBuddy(type)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        buddy === type && styles.modalOptionTextActive,
                      ]}
                    >
                      {buddyConfig[type].label} mode
                    </Text>

                    {isUpdating === type ? (
                      <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                    ) : (
                      <Ionicons
                        name={buddy === type ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={buddy === type ? '#211A3A' : 'rgba(90,61,36,0.2)'}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {modalConfig.type === 'support' && (
              <View style={{ width: '100%', gap: 12 }}>
                <Text style={styles.modalSubText}>how can we help today?</Text>

                <View style={styles.faqContainer}>
                  <Text style={styles.faqItem}>
                    • how do i edit a goal?
                    {'\n'}
                    <Text style={styles.faqAnswer}>
                      open a goal and use the edit goal button.
                    </Text>
                  </Text>

                  <Text style={styles.faqItem}>
                    • can i change my email?
                    {'\n'}
                    <Text style={styles.faqAnswer}>
                      this feature is coming in a later version.
                    </Text>
                  </Text>
                </View>

                <Pressable
                  style={styles.modalConfirmButton}
                  onPress={() => Linking.openURL('mailto:support@glowgoal.com')}
                >
                  <Text style={styles.modalConfirmText}>message team</Text>
                </Pressable>
              </View>
            )}

            {modalConfig.type === 'signout' && (
              <View style={{ width: '100%', gap: 16, alignItems: 'center' }}>
                <Text style={styles.modalSubText}>
                  ready to sign out of your session?
                </Text>

                <Pressable
                  style={styles.modalConfirmButton}
                  onPress={async () => {
                    await auth.signOut();
                    setModalVisible(false);
                    router.replace('/login');
                  }}
                >
                  <Text style={styles.modalConfirmText}>sign out</Text>
                </Pressable>
              </View>
            )}

            {modalConfig.type === 'theme' && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Ionicons
                  name="color-palette"
                  size={40}
                  color="#848F73"
                  style={{ marginBottom: 10 }}
                />
                <Text style={styles.modalSubText}>
                  custom themes coming in v1.1!
                </Text>
              </View>
            )}

            {modalConfig.type === 'notifications' &&
              pendingNotificationState !== null && (
                <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
                  <Text style={styles.modalSubText}>
                    {getNotificationConfirmMessage(buddy!, pendingNotificationState).body}
                  </Text>

                  <Pressable
                    style={[
                      styles.modalConfirmButton,
                      isTogglingNotifications && { opacity: 0.6 },
                    ]}
                    disabled={isTogglingNotifications}
                    onPress={confirmToggleNotifications}
                  >
                    <Text style={styles.modalConfirmText}>
                      {isTogglingNotifications
                        ? 'working...'
                        : getNotificationConfirmMessage(
                            buddy!,
                            pendingNotificationState
                          ).cta}
                    </Text>
                  </Pressable>
                </View>
              )}

            {modalConfig.type === 'emailNotifications' &&
              pendingEmailState !== null && (
                <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
                  <Text style={styles.modalSubText}>
                    {getEmailConfirmMessage(
                      buddy ?? 'hype',
                      pendingEmailState
                    ).body}
                  </Text>

                  <Pressable
                    style={styles.modalConfirmButton}
                    onPress={confirmToggleEmail}
                  >
                    <Text style={styles.modalConfirmText}>
                      {getEmailConfirmMessage(
                        buddy ?? 'hype',
                        pendingEmailState
                      ).cta}
                    </Text>
                  </Pressable>
                </View>
              )}

            {modalConfig.type === 'success' && (
              <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
                <Text style={styles.modalSubText}>{successMessage}</Text>

                <Pressable
                  style={styles.modalConfirmButton}
                  onPress={() => {
                    setModalVisible(false);
                    setSuccessMessage('');
                  }}
                >
                  <Text style={styles.modalConfirmText}>okay</Text>
                </Pressable>
              </View>
            )}

            {modalConfig.type !== 'success' && (
              <Pressable
                style={styles.modalClose}
                onPress={() => {
                  setModalVisible(false);
                  setPendingNotificationState(null);
                  setPendingEmailState(null);
                }}
              >
                <Text style={styles.modalCloseText}>cancel</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingItem({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIconBox}>
          <Ionicons name={icon} size={20} color="#211A3A" />
        </View>
        <Text style={styles.settingLabel}>{label.toLowerCase()}</Text>
      </View>

      <View style={styles.settingRight}>
        {!!value && <Text style={styles.settingValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color="rgba(90,61,36,0.2)" />
      </View>
    </Pressable>
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
              ? '#D7FF64'
              : '#211A3A'
            : isVertical
              ? 'rgba(255,255,255,0.4)'
              : '#89839D'
        }
      />
      <Text
        style={[
          styles.navLabel,
          isVertical ? styles.navLabelVertical : styles.navLabelMobile,
          active && (isVertical ? { color: '#FFF' } : { color: '#211A3A' }),
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

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF7EF',
    fontSize: 16,
    fontWeight: '700',
  },

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
    color: '#FFF',
    marginBottom: 50,
    letterSpacing: -1,
  },
  sidebarNav: { gap: 15 },

  contentContainer: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 150,
  },

  profileHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF7EF',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#F5F3FF',
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF7EF',
    letterSpacing: -1,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,247,239,0.65)',
    marginTop: 4,
  },

  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  buddyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D7FF64',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF7EF',
    marginTop: 4,
    textTransform: 'lowercase',
  },
  secondaryAction: {
    backgroundColor: '#D7FF64',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  secondaryActionText: {
    color: '#211A3A',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'lowercase',
  },

  settingsGroup: { gap: 10 },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF7EF',
    marginBottom: 12,
    textTransform: 'lowercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 24,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(90,61,36,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    color: '#473C34',
    fontWeight: '800',
    fontSize: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    color: '#848F73',
    fontWeight: '800',
    fontSize: 14,
  },

  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  signOutText: {
    color: '#FF6B6B',
    fontWeight: '900',
    fontSize: 16,
    textTransform: 'lowercase',
  },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 12,
    marginTop: 40,
    fontWeight: '600',
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navItemVertical: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    width: '100%',
  },
  navItemVerticalActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navLabel: { fontWeight: '700' },
  navLabelMobile: {
    fontSize: 10,
    color: '#171329',
    marginTop: 4,
  },
  navLabelVertical: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },

  mobileNavWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 9999,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 25, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#F7F1E8',
    borderRadius: 32,
    padding: 30,
    width: '90%',
    maxWidth: 420,
    alignItems: 'center',
  },
  modalHeaderIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(90,61,36,0.1)',
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#211A3A',
    marginBottom: 24,
    textTransform: 'lowercase',
  },
  modalSubText: {
    fontSize: 16,
    color: '#8D8176',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  faqContainer: {
    width: '100%',
    backgroundColor: 'rgba(90,61,36,0.03)',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
  },
  faqItem: {
    fontSize: 14,
    color: '#211A3A',
    fontWeight: '700',
    marginBottom: 10,
  },
  faqAnswer: {
    fontWeight: '400',
    fontSize: 13,
  },
  modalOption: {
    width: '100%',
    backgroundColor: 'rgba(90,61,36,0.03)',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalOptionActive: {
    backgroundColor: '#FFF7EF',
    borderColor: '#D7FF64',
    borderWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(90,61,36,0.5)',
    textTransform: 'lowercase',
  },
  modalOptionTextActive: {
    color: '#211A3A',
    fontWeight: '900',
  },
  modalConfirmButton: {
    width: '100%',
    backgroundColor: '#D7FF64',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 5,
  },
  modalConfirmText: {
    color: '#211A3A',
    fontWeight: '900',
    fontSize: 16,
    textTransform: 'lowercase',
  },
  modalClose: {
    marginTop: 20,
    padding: 10,
  },
  modalCloseText: {
    color: '#8D8176',
    fontWeight: '800',
    textTransform: 'lowercase',
    opacity: 0.6,
  },
});