import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalItem } from './goals';
import { UserPreferences } from './preferences';

export const GUEST_GOALS_KEY = 'glowgoal_guest_goals';
export const GUEST_PREFS_KEY = 'glowgoal_guest_preferences';
export const GUEST_FRICTION_KEY = 'glowgoal_guest_friction';

export async function getGuestGoals(): Promise<GoalItem[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_GOALS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read guest goals:', error);
    return [];
  }
}

export async function saveGuestGoals(goals: GoalItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GUEST_GOALS_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Failed to save guest goals:', error);
  }
}

export async function getGuestPreferences(): Promise<Partial<UserPreferences> | null> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read guest preferences:', error);
    return null;
  }
}

export async function saveGuestPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  try {
    const current = (await getGuestPreferences()) || {};
    const next = { ...current, ...prefs };
    await AsyncStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Failed to save guest preferences:', error);
  }
}

export async function clearGuestData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([GUEST_GOALS_KEY, GUEST_PREFS_KEY, GUEST_FRICTION_KEY]);
  } catch (error) {
    console.error('Failed to clear guest data:', error);
  }
}
