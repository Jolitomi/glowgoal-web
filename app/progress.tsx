import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
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
import { calculateStreak, getGoals, GoalItem } from '../lib/goals';
import { getUserPreferences } from '../lib/preferences';

type NavTab = 'home' | 'goals' | 'progress' | 'profile';
type GlowLevel = 'none' | 'soft' | 'medium' | 'strong';

type CalendarDay = {
  key: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  completedCount: number;
  hasGlow: boolean;
  glowLevel: GlowLevel;
  fullDate?: Date;
};

function toDateKey(dateValue: string | Date) {
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function getReadableDate(date: Date) {
  return date.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function buildCompletionMap(goals: GoalItem[]) {
  const completionMap = new Map<string, number>();
  goals.forEach((goal) => {
    goal.tasks?.forEach((task) => {
      if (task.completed && task.completedAt) {
        const key = toDateKey(task.completedAt);
        completionMap.set(key, (completionMap.get(key) ?? 0) + 1);
      }
    });
  });
  return completionMap;
}

function getGlowLevel(completedCount: number): GlowLevel {
  if (completedCount >= 4) return 'strong';
  if (completedCount >= 2) return 'medium';
  if (completedCount >= 1) return 'soft';
  return 'none';
}

function buildCalendarDays(goals: GoalItem[], activeMonth: Date): CalendarDay[] {
  const completionMap = buildCompletionMap(goals);
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startWeekDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const today = new Date();
  const days: CalendarDay[] = [];

  for (let i = 0; i < startWeekDay; i++) {
    days.push({ key: `blank-start-${i}`, dayNumber: 0, isCurrentMonth: false, isToday: false, completedCount: 0, hasGlow: false, glowLevel: 'none' });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateKey = toDateKey(currentDate);
    const completedCount = completionMap.get(dateKey) ?? 0;
    const isToday = currentDate.toDateString() === today.toDateString();
    days.push({
      key: dateKey,
      dayNumber: day,
      isCurrentMonth: true,
      isToday,
      completedCount,
      hasGlow: completedCount > 0,
      glowLevel: getGlowLevel(completedCount),
      fullDate: currentDate,
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ key: `blank-end-${days.length}`, dayNumber: 0, isCurrentMonth: false, isToday: false, completedCount: 0, hasGlow: false, glowLevel: 'none' });
  }
  return days;
}

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isPhone = width < 768;
  const isSmallPhone = width < 380;

  const [activeTab] = useState<NavTab>('progress');
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [buddy, setBuddy] = useState<BuddyType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const horizontalPadding = isSmallPhone ? 14 : isPhone ? 20 : 30;
  const sidebarWidth = isDesktop ? 280 : 0;
  const contentMaxWidth = 900;
  const availableWidth = width - sidebarWidth - (horizontalPadding * 2);
  const contentWidth = Math.min(availableWidth, contentMaxWidth);

  const calendarCardInternalPadding = 32; 
  const calendarGap = isSmallPhone ? 6 : 8;
  const calendarCellSize = Math.floor((contentWidth - calendarCardInternalPadding - (calendarGap * 6) - 2) / 7);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allGoals, prefs] = await Promise.all([getGoals(), getUserPreferences()]);
      setGoals(allGoals);
      setBuddy(prefs?.buddy ?? 'hype');
    } catch (error) {
      console.log('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const stats = useMemo(() => {
    const totalTasks = goals.reduce((acc, goal) => acc + (goal.tasks?.length || 0), 0);
    const completedTasks = goals.reduce((acc, goal) => acc + (goal.tasks?.filter(t => t.completed).length || 0), 0);
    const globalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const streak = calculateStreak(goals);
    const completedGoalsCount = goals.filter(g => g.progress === 100).length;
    return { globalProgress, streak, completedGoalsCount };
  }, [goals]);

  const calendarDays = useMemo(() => buildCalendarDays(goals, activeMonth), [goals, activeMonth]);
  const currentBuddy = buddy ? buddyConfig[buddy] : null;

  const selectedDay = useMemo(() => {
    if (!selectedDayKey) return null;
    return calendarDays.find((day) => day.key === selectedDayKey) ?? null;
  }, [calendarDays, selectedDayKey]);

  const handleTabPress = (tab: NavTab) => {
    if (tab === 'home') router.push('/dashboard');
    if (tab === 'goals') router.push('/goals');
    if (tab === 'profile') router.push('/profile');
  };

  if (loading || !currentBuddy) return <View style={styles.loadingContainer}><Text style={styles.loadingText}>loading insights...</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* NEW SIDEBAR STYLE */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarBrand}>GlowGoal⭐</Text>
          <View style={styles.sidebarNav}>
            <NavItem label="Home" icon="home" active={activeTab === 'home'} onPress={() => handleTabPress('home')} isVertical />
            <NavItem label="Goals" icon="flag" active={activeTab === 'goals'} onPress={() => handleTabPress('goals')} isVertical />
            <NavItem label="Stats" icon="analytics" active={activeTab === 'progress'} onPress={() => {}} isVertical />
            <NavItem label="Profile" icon="person" active={activeTab === 'profile'} onPress={() => handleTabPress('profile')} isVertical />
          </View>
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.mainWrapper, isDesktop && { marginLeft: 280 }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: 40, paddingBottom: 150 }}>
            <View style={[styles.contentContainer, { width: contentWidth }]}>
              
              <View style={styles.header}>
                <View>
                  <Text style={styles.greeting}>glow insights</Text>
                  <Text style={styles.subtitle}>visualizing your consistency.</Text>
                </View>
              </View>

              <View style={[styles.statsHeroRow, isPhone && styles.statsHeroColumn]}>
                <View style={[styles.ringCard, isPhone && styles.fullWidthCard]}>
                  <View style={[styles.glowRing, { borderColor: currentBuddy.accent }]}>
                    <Text style={styles.ringValue}>{stats.globalProgress}%</Text>
                    <Text style={styles.ringLabel}>TOTAL GLOW</Text>
                  </View>
                </View>

                {/* BUDDY CARD: KEEPING THE LARGE GLOWING IMAGE */}
                <View style={[styles.verdictCard, isPhone && styles.fullWidthCard]}>
                  <View style={[styles.mascotBadge, { backgroundColor: currentBuddy.accent }, styles.buddyGlowEffect]}>
                    <Image source={currentBuddy.image} style={styles.mascotImg} resizeMode="contain" />
                  </View>
                  
                  <View style={styles.verdictTextContainer}>
                    <Text style={styles.verdictSub}>{buddy}'s feedback</Text>
                    <Text style={styles.verdictMain}>
                      {stats.streak >= 5 ? "You're in a beautiful rhythm." : "Let's keep the momentum building."}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <MetricCard label="streak" value={String(stats.streak)} sub="days in a row" icon="flame" style={styles.metricCardHalf} />
                <MetricCard label="completed" value={String(stats.completedGoalsCount)} sub="finished goals" icon="trophy" style={styles.metricCardHalf} />
              </View>

              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>glow calendar</Text>
                  <View style={styles.calendarActions}>
                    <Pressable onPress={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={20} color="#211A3A" /></Pressable>
                    <Text style={styles.monthLabel}>{getMonthLabel(activeMonth)}</Text>
                    <Pressable onPress={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={20} color="#211A3A" /></Pressable>
                  </View>
                </View>

                <View style={styles.weekHeader}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.weekHeaderText}>{d}</Text>)}
                </View>

                <View style={[styles.calendarGrid, { gap: calendarGap }]}>
                  {calendarDays.map((day) => (
                    <Pressable
                      key={day.key}
                      disabled={!day.isCurrentMonth}
                      onPress={() => day.isCurrentMonth && setSelectedDayKey(day.key)}
                      style={[
                        styles.calendarCell,
                        { width: calendarCellSize, height: calendarCellSize },
                        !day.isCurrentMonth && styles.calendarCellEmpty,
                        day.glowLevel === 'soft' && styles.calendarCellGlowSoft,
                        day.glowLevel === 'medium' && styles.calendarCellGlowMedium,
                        day.glowLevel === 'strong' && styles.calendarCellGlowStrong,
                        day.isToday && styles.calendarCellToday,
                        selectedDayKey === day.key && styles.calendarCellSelected,
                      ]}
                    >
                      {day.isCurrentMonth && <Text style={styles.calendarDayText}>{day.dayNumber}</Text>}
                    </Pressable>
                  ))}
                </View>

                <View style={styles.dayDetailCard}>
                  <Text style={styles.dayDetailTitle}>
                    {selectedDay?.fullDate ? getReadableDate(selectedDay.fullDate) : 'tap a date to see activity'}
                  </Text>
                  <Text style={styles.dayDetailBody}>
                    {selectedDay ? `${selectedDay.completedCount} tasks completed on this day.` : 'Your daily glow history appears here.'}
                  </Text>
                </View>
              </View>

            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* NEW FLOATING PILL MOBILE NAV */}
      {!isDesktop && (
        <View style={styles.mobileNavWrapper}>
          <View style={styles.mobileNav}>
            <NavItem label="Home" icon="home" active={activeTab === 'home'} onPress={() => handleTabPress('home')} />
            <NavItem label="Goals" icon="flag" active={activeTab === 'goals'} onPress={() => handleTabPress('goals')} />
            <NavItem label="Stats" icon="analytics" active={activeTab === 'progress'} onPress={() => {}} />
            <NavItem label="You" icon="person" active={activeTab === 'profile'} onPress={() => handleTabPress('profile')} />
          </View>
        </View>
      )}
    </View>
  );
}

function MetricCard({ label, value, sub, icon, style }: any) {
  return (
    <View style={[styles.metricCard, style]}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Ionicons name={icon} size={18} color="#77718C" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function NavItem({ label, icon, active, onPress, isVertical }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.navItem, isVertical && styles.navItemVertical, active && isVertical && styles.navItemVerticalActive]}>
      <Ionicons 
        name={active ? icon : (`${icon}-outline` as any)} 
        size={isVertical ? 22 : 24} 
        color={active ? (isVertical ? '#D7FF64' : '#211A3A') : (isVertical ? 'rgba(255,255,255,0.4)' : '#89839D')} 
      />
      <Text style={[styles.navLabel, isVertical ? styles.navLabelVertical : styles.navLabelMobile, active && (isVertical ? { color: '#FFF' } : { color: '#211A3A' })]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  safeArea: { flex: 1 },
  mainWrapper: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#211A3A', fontWeight: '700' },

  // UPDATED SIDEBAR
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, backgroundColor: '#171329', padding: 40, zIndex: 100 },
  sidebarBrand: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 50, letterSpacing: -1 },
  sidebarNav: { gap: 15 },

  contentContainer: { width: '100%', maxWidth: 1040, alignSelf: 'center' },
  header: { marginBottom: 24 },
  greeting: { fontSize: 32, fontWeight: '900', color: '#211A3A', letterSpacing: -1 },
  subtitle: { color: '#77718C', fontWeight: '500' },
  statsHeroRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statsHeroColumn: { flexDirection: 'column' },
  fullWidthCard: { width: '100%' },
  ringCard: { flex: 1, backgroundColor: '#211A3A', borderRadius: 28, padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  glowRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  ringValue: { fontSize: 38, fontWeight: '900', color: '#FFFFFF' },
  ringLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.72)', marginTop: 4 },
  
  verdictCard: { flex: 1.5, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24, minHeight: 200, position: 'relative', overflow: 'visible', justifyContent: 'center' },
  mascotBadge: { position: 'absolute', top: -30, right: 15, width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', elevation: 12 },
  buddyGlowEffect: {
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1.0,
    shadowRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mascotImg: { width: 95, height: 95 },
  verdictTextContainer: { maxWidth: '65%' },
  verdictSub: { fontSize: 11, fontWeight: '800', color: '#77718C', textTransform: 'uppercase', marginBottom: 8 },
  verdictMain: { fontSize: 22, fontWeight: '900', color: '#211A3A' },
  
  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metricCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#E5E0F2' },
  metricCardHalf: { flex: 1 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 11, fontWeight: '800', color: '#77718C', textTransform: 'uppercase' },
  metricValue: { fontSize: 24, fontWeight: '900', color: '#211A3A', marginTop: 8 },
  metricSub: { fontSize: 13, color: '#77718C', marginTop: 6 },
  calendarCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarTitle: { fontSize: 18, fontWeight: '900', color: '#211A3A' },
  calendarActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthLabel: { fontWeight: '800', color: '#211A3A', minWidth: 110, textAlign: 'center' },
  weekHeader: { flexDirection: 'row', marginBottom: 12 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontWeight: '800', color: '#77718C', fontSize: 11 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  calendarCell: { backgroundColor: '#F0ECFF', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calendarCellEmpty: { opacity: 0 },
  calendarCellGlowSoft: { backgroundColor: 'rgba(109,74,255,0.12)' },
  calendarCellGlowMedium: { backgroundColor: 'rgba(109,74,255,0.24)' },
  calendarCellGlowStrong: { backgroundColor: '#D7FF64' },
  calendarCellToday: { borderColor: '#211A3A', borderWidth: 2 },
  calendarCellSelected: { borderColor: '#211A3A', borderWidth: 1 },
  calendarDayText: { fontWeight: '800', color: '#77718C', fontSize: 13 },
  dayDetailCard: { marginTop: 18, backgroundColor: '#F0ECFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E5E0F2' },
  dayDetailTitle: { fontSize: 15, fontWeight: '900', color: '#211A3A', marginBottom: 4 },
  dayDetailBody: { color: '#77718C', fontSize: 13, fontWeight: '600' },

  // UPDATED PILL NAV BAR STYLES
  mobileNavWrapper: { position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 9999 },
  mobileNav: { height: 70, backgroundColor: '#FFFFFF', borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navItemVertical: { flexDirection: 'row', justifyContent: 'flex-start', padding: 12, borderRadius: 12, gap: 12, width: '100%' },
  navItemVerticalActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  navLabel: { fontWeight: '700' },
  navLabelMobile: { fontSize: 10, color: '#171329', marginTop: 4 },
  navLabelVertical: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
});