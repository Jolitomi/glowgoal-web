import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
// New Imports for the Buddy System
import { buddyConfig, BuddyType } from '../lib/buddy';
import { deleteGoal, GoalItem, subscribeToGoals } from '../lib/goals';
import { getUserPreferences } from '../lib/preferences';

type NavTab = 'home' | 'goals' | 'progress' | 'profile';

export default function GoalsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [activeTab, setActiveTab] = useState<NavTab>('goals');
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [buddy, setBuddy] = useState<BuddyType | null>(null); // Dynamic Buddy State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<GoalItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Goals and Buddy Preferences
  useFocusEffect(
    useCallback(() => {
      // Load Buddy Prefs
      const loadPrefs = async () => {
        const prefs = await getUserPreferences();
        setBuddy(prefs?.buddy ?? 'hype');
      };
      loadPrefs();

      // Subscribe to Goals
      const unsubscribe = subscribeToGoals((liveGoals) => {
        setGoals(liveGoals);
      });
      return () => unsubscribe?.();
    }, [])
  );

  const sortedGoals = useMemo(() => [...goals], [goals]);
  const currentBuddy = buddy ? buddyConfig[buddy] : null;

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
      console.log('Error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTabPress = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'home') router.push('/dashboard');
    if (tab === 'progress') router.push('/progress');
    if (tab === 'profile') router.push('/profile');
  };

  if (!currentBuddy) return null; // Wait for buddy config to load

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Sidebar - Desktop */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarBrand}>GlowGoal⭐</Text>
          <View style={styles.sidebarNav}>
            <NavItem label="Home" icon="home" active={activeTab === 'home'} onPress={() => handleTabPress('home')} isVertical />
            <NavItem label="Goals" icon="flag" active={activeTab === 'goals'} onPress={() => {}} isVertical />
            <NavItem label="Stats" icon="analytics" active={activeTab === 'progress'} onPress={() => handleTabPress('progress')} isVertical />
            <NavItem label="Profile" icon="person" active={activeTab === 'profile'} onPress={() => handleTabPress('profile')} isVertical />
          </View>
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.mainWrapper, isDesktop && { marginLeft: 280 }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.contentContainer}>
              
              {/* Dynamic Buddy Header */}
              <View style={styles.header}>
                <View style={[styles.buddyCircle, { backgroundColor: currentBuddy.accent }]}>
                  <Image source={currentBuddy.image} style={styles.headerBuddy} resizeMode="contain" />
                </View>
                <View style={styles.greetingWrapper}>
                  <Text style={styles.greeting}>current goals</Text>
                  <Text style={styles.subtitle}>making magic happen today.</Text>
                </View>
                <Pressable style={styles.newGoalBtn} onPress={() => router.push('/create-goal')}>
                  <Ionicons name="add" size={24} color="#5A3D24" />
                </Pressable>
              </View>

              {sortedGoals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Image source={currentBuddy.image} style={styles.emptyStateBuddy} resizeMode="contain" />
                  <Text style={styles.emptyStateTitle}>ready to glow?</Text>
                  <Text style={styles.emptyStateText}>no goals yet. let's change that.</Text>
                  <Pressable 
                    style={[styles.emptyStateBtn, { borderColor: currentBuddy.accent }]} 
                    onPress={() => router.push('/create-goal')}
                  >
                    <Text style={[styles.emptyStateBtnText, { color: currentBuddy.accent }]}>+ create a goal</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.goalsList}>
                  {sortedGoals.map((goal) => {
                    const completed = goal.tasks.filter(t => t.completed).length;
                    return (
                      <Pressable
                        key={goal.id}
                        style={styles.goalCard}
                        onPress={() => router.push({ pathname: '/goal-details', params: { goalId: goal.id } })}
                      >
                        <View style={styles.cardHeader}>
                          <Text style={styles.categoryLabel}>{goal.category}</Text>
                          <Pressable onPress={(e) => { e.stopPropagation(); handleDeleteGoal(goal); }} style={styles.deleteCircle}>
                            <Ionicons name="close" size={14} color="#7A4B32" />
                          </Pressable>
                        </View>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        <View style={styles.cardFooter}>
                          <Text style={styles.taskCount}>{completed} / {goal.tasks.length} tasks</Text>
                          <Text style={[styles.percentageText, { color: currentBuddy.accent }]}>{Math.round(goal.progress)}%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${goal.progress}%`, backgroundColor: currentBuddy.accent }]} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Floating Pill Mobile Nav */}
      {!isDesktop && (
        <View style={styles.mobileNavWrapper}>
          <View style={styles.mobileNav}>
            <NavItem label="Home" icon="home" active={activeTab === 'home'} onPress={() => handleTabPress('home')} />
            <NavItem label="Goals" icon="flag" active={activeTab === 'goals'} onPress={() => {}} />
            <NavItem label="Stats" icon="analytics" active={activeTab === 'progress'} onPress={() => handleTabPress('progress')} />
            <NavItem label="You" icon="person" active={activeTab === 'profile'} onPress={() => handleTabPress('profile')} />
          </View>
        </View>
      )}

      {/* Delete Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>remove goal?</Text>
            <Text style={styles.modalText}>this will permanently delete "{goalToDelete?.title}".</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={closeDeleteModal}><Text style={styles.cancelText}>keep it</Text></Pressable>
              <Pressable style={[styles.modalConfirm, { backgroundColor: '#7A4B32' }]} onPress={confirmDeleteGoal}>
                <Text style={styles.confirmText}>{isDeleting ? '...' : 'remove'}</Text>
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
    <Pressable onPress={onPress} style={[styles.navItem, isVertical && styles.navItemVertical, active && isVertical && styles.navItemVerticalActive]}>
      <Ionicons name={active ? icon : (`${icon}-outline` as any)} size={isVertical ? 22 : 24} color={active ? (isVertical ? '#FFD580' : '#5A3D24') : (isVertical ? 'rgba(255,255,255,0.4)' : '#A4988D')} />
      <Text style={[styles.navLabel, isVertical ? styles.navLabelVertical : styles.navLabelMobile, active && (isVertical ? { color: '#FFF' } : { color: '#5A3D24' })]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#828C6A' },
  safeArea: { flex: 1 },
  mainWrapper: { flex: 1 },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, backgroundColor: '#6D7856', padding: 40, zIndex: 100 },
  sidebarBrand: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 50, letterSpacing: -1 },
  sidebarNav: { gap: 15 },
  mobileNavWrapper: { position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 9999 },
  mobileNav: { height: 70, backgroundColor: '#FFFFFF', borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowOpacity: 0.1, elevation: 10 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navItemVertical: { flexDirection: 'row', padding: 12, borderRadius: 12, gap: 12, width: '100%' },
  navItemVerticalActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  navLabel: { fontWeight: '700' },
  navLabelMobile: { fontSize: 10, color: '#6D7856', marginTop: 4 },
  navLabelVertical: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  contentContainer: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 150 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  buddyCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  headerBuddy: { width: 45, height: 45 },
  greetingWrapper: { flex: 1 },
  greeting: { fontSize: 28, fontWeight: '900', color: '#FFF', textTransform: 'lowercase' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  newGoalBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  goalsList: { gap: 16 },
  goalCard: { backgroundColor: '#F9F6F1', borderRadius: 24, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryLabel: { fontSize: 10, fontWeight: '800', color: '#B6AB9F', textTransform: 'uppercase', letterSpacing: 1 },
  deleteCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(122, 75, 50, 0.1)', alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 20, fontWeight: '800', color: '#463A31', marginBottom: 16, textTransform: 'lowercase' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  taskCount: { fontSize: 12, color: '#918476', fontWeight: '600' },
  percentageText: { fontSize: 14, fontWeight: '900' },
  progressBarBg: { height: 4, backgroundColor: '#E9DECF', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyStateBuddy: { width: 140, height: 140, marginBottom: 20 },
  emptyStateTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', textTransform: 'lowercase' },
  emptyStateText: { color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 30 },
  emptyStateBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, borderWidth: 2 },
  emptyStateBtnText: { fontWeight: '800', textTransform: 'lowercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#F9F6F1', padding: 25, borderRadius: 20, width: '85%', maxWidth: 320 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#463A31', marginBottom: 8, textTransform: 'lowercase' },
  modalText: { fontSize: 14, color: '#7B6B5D', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 14, alignItems: 'center' },
  modalConfirm: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#7B6B5D' },
  confirmText: { fontWeight: '800', color: '#FFF' },
});