import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalItem } from './goals';
import { UserPreferences } from './preferences';

export const GUEST_GOALS_KEY = 'glowgoal_guest_goals';
export const GUEST_PREFS_KEY = 'glowgoal_guest_preferences';
export const GUEST_FRICTION_KEY = 'glowgoal_guest_friction';
export const GUEST_SYNC_STATE_KEY = 'glowgoal_guest_sync_state';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'failed';

export type SyncReport = {
  status: SyncStatus;
  syncedGoalsCount: number;
  mergedGoalsCount: number;
  failedGoalsCount: number;
  preferencesSynced: boolean;
  error?: string | null;
  lastAttemptAt?: string;
};

export type SyncState = {
  status: SyncStatus;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  errorMessage?: string | null;
  pendingGoalsCount: number;
  failedAttempts: number;
};

const DEFAULT_SYNC_STATE: SyncState = {
  status: 'idle',
  lastAttemptAt: null,
  lastSuccessAt: null,
  errorMessage: null,
  pendingGoalsCount: 0,
  failedAttempts: 0,
};

const syncStateListeners = new Set<(state: SyncState) => void>();

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

export async function removeGuestGoal(goalId: string): Promise<GoalItem[]> {
  try {
    const goals = await getGuestGoals();
    const remaining = goals.filter((g) => g.id !== goalId);
    await saveGuestGoals(remaining);
    return remaining;
  } catch (error) {
    console.error('Failed to remove guest goal:', error);
    return [];
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

export async function clearGuestPreferences(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_PREFS_KEY);
  } catch (error) {
    console.error('Failed to clear guest preferences:', error);
  }
}

export async function clearGuestData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      GUEST_GOALS_KEY,
      GUEST_PREFS_KEY,
      GUEST_FRICTION_KEY,
      GUEST_SYNC_STATE_KEY,
    ]);
    notifySyncListeners({ ...DEFAULT_SYNC_STATE });
  } catch (error) {
    console.error('Failed to clear guest data:', error);
  }
}

export async function getSyncState(): Promise<SyncState> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_SYNC_STATE_KEY);
    const guestGoals = await getGuestGoals();
    const count = guestGoals.length;

    if (!raw) {
      return {
        ...DEFAULT_SYNC_STATE,
        pendingGoalsCount: count,
      };
    }

    const parsed = JSON.parse(raw) as Partial<SyncState>;
    return {
      ...DEFAULT_SYNC_STATE,
      ...parsed,
      pendingGoalsCount: count,
    };
  } catch (error) {
    console.error('Failed to read sync state:', error);
    return { ...DEFAULT_SYNC_STATE };
  }
}

function notifySyncListeners(state: SyncState) {
  syncStateListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.warn('Sync listener error:', err);
    }
  });
}

export async function saveSyncState(patch: Partial<SyncState>): Promise<SyncState> {
  try {
    const current = await getSyncState();
    const guestGoals = await getGuestGoals();
    const next: SyncState = {
      ...current,
      ...patch,
      pendingGoalsCount: patch.pendingGoalsCount ?? guestGoals.length,
    };

    await AsyncStorage.setItem(GUEST_SYNC_STATE_KEY, JSON.stringify(next));
    notifySyncListeners(next);
    return next;
  } catch (error) {
    console.error('Failed to save sync state:', error);
    return { ...DEFAULT_SYNC_STATE, ...patch };
  }
}

export function subscribeToSyncState(listener: (state: SyncState) => void): () => void {
  syncStateListeners.add(listener);
  getSyncState().then(listener).catch(() => {});
  return () => {
    syncStateListeners.delete(listener);
  };
}
