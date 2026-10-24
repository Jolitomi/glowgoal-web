import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { getGuestGoals, saveGuestGoals } from './guest-storage';
import { syncGuestDataToAccount } from './sync-manager';

export type GoalSyncStatus = 'synced' | 'pending' | 'attention';

export type ConflictResolution = {
  resolvedAt: string;
  description: string;
  conflictedTaskTitles: string[];
};

export type GoalTask = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
  source: 'ai' | 'user';
  conflictNote?: string | null;
  isConflictCopy?: boolean;
};

export type GoalItem = {
  id: string;
  title: string;
  category: string;
  deadline: string;
  reason: string;
  createdAt: string;
  progress: number;
  tasks: GoalTask[];
  syncStatus?: GoalSyncStatus;
  syncError?: string | null;
  conflictResolution?: ConflictResolution | null;
};

export type DeadlineUrgency = 'none' | 'low' | 'medium' | 'high' | 'overdue';

export function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentUserId() {
  const auth = getAuth();
  return auth.currentUser?.uid ?? null;
}

export function calculateProgress(tasks: GoalTask[]) {
  const completedCount = tasks.filter((task) => task.completed).length;
  return tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
}

export function determineGoalSyncStatus(goal: Partial<GoalItem>, isGuestOrigin: boolean): GoalSyncStatus {
  if (isGuestOrigin) {
    return goal.syncError ? 'attention' : 'pending';
  }
  if (goal.conflictResolution || goal.syncError || goal.syncStatus === 'attention') {
    return 'attention';
  }
  return goal.syncStatus || 'synced';
}

export async function getGoals(): Promise<GoalItem[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    const guestGoals = await getGuestGoals();
    return guestGoals.map((g) => ({
      ...g,
      syncStatus: determineGoalSyncStatus(g, true),
    }));
  }

  try {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(goalsQuery);
    const firestoreGoals = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as GoalItem;
      return {
        ...data,
        id: docSnap.id,
        syncStatus: determineGoalSyncStatus(data, false),
      };
    });

    // If there are pending guest goals, merge them seamlessly to prevent disappearing goals
    const pendingGuest = await getGuestGoals();
    if (pendingGuest.length > 0) {
      const existingIds = new Set(firestoreGoals.map((g) => g.id));
      const existingTitles = new Set(firestoreGoals.map((g) => g.title.trim().toLowerCase()));
      const unmerged = pendingGuest
        .filter(
          (g) => !existingIds.has(g.id) && !existingTitles.has(g.title.trim().toLowerCase())
        )
        .map((g) => ({
          ...g,
          syncStatus: determineGoalSyncStatus(g, true),
        }));
      return [...unmerged, ...firestoreGoals];
    }

    return firestoreGoals;
  } catch (error) {
    console.warn('Failed to fetch from Firestore, falling back to guest goals:', error);
    const fallback = await getGuestGoals();
    return fallback.map((g) => ({
      ...g,
      syncStatus: determineGoalSyncStatus(g, true),
    }));
  }
}

export async function getGoalById(goalId: string): Promise<GoalItem | null> {
  const userId = getCurrentUserId();
  if (!userId) {
    const goals = await getGuestGoals();
    const match = goals.find((g) => g.id === goalId);
    return match ? { ...match, syncStatus: determineGoalSyncStatus(match, true) } : null;
  }

  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  const snapshot = await getDoc(goalRef);

  if (!snapshot.exists()) {
    // Check if it's currently an un-synced guest goal
    const guestGoals = await getGuestGoals();
    const guestMatch = guestGoals.find((g) => g.id === goalId);
    return guestMatch ? { ...guestMatch, syncStatus: determineGoalSyncStatus(guestMatch, true) } : null;
  }

  const data = snapshot.data() as GoalItem;
  return {
    ...data,
    id: snapshot.id,
    syncStatus: determineGoalSyncStatus(data, false),
  };
}

export function subscribeToGoals(
  onGoalsChange: (goals: GoalItem[]) => void,
  onError?: (error: unknown) => void
) {
  const userId = getCurrentUserId();

  if (!userId) {
    getGuestGoals()
      .then((gList) =>
        onGoalsChange(
          gList.map((g) => ({ ...g, syncStatus: determineGoalSyncStatus(g, true) }))
        )
      )
      .catch(() => onGoalsChange([]));
    return () => {};
  }

  const goalsRef = collection(db, 'users', userId, 'goals');
  const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    goalsQuery,
    async (snapshot) => {
      const cloudGoals = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as GoalItem;
        return {
          ...data,
          id: docSnap.id,
          syncStatus: determineGoalSyncStatus(data, false),
        };
      });

      // Seamlessly combine with any pending guest goals
      const pendingGuest = await getGuestGoals();
      if (pendingGuest.length > 0) {
        const existingIds = new Set(cloudGoals.map((g) => g.id));
        const existingTitles = new Set(cloudGoals.map((g) => g.title.trim().toLowerCase()));
        const unmerged = pendingGuest
          .filter(
            (g) => !existingIds.has(g.id) && !existingTitles.has(g.title.trim().toLowerCase())
          )
          .map((g) => ({
            ...g,
            syncStatus: determineGoalSyncStatus(g, true),
          }));
        onGoalsChange([...unmerged, ...cloudGoals]);
      } else {
        onGoalsChange(cloudGoals);
      }
    },
    (error) => {
      console.log('Realtime goals listener failed:', error);
      onError?.(error);
    }
  );
}

export async function saveGoal(goal: GoalItem): Promise<GoalItem> {
  const userId = getCurrentUserId();
  if (!userId) {
    const goals = await getGuestGoals();
    const goalToSave: GoalItem = {
      ...goal,
      syncStatus: 'pending',
    };
    const existingIndex = goals.findIndex((g) => g.id === goal.id);
    if (existingIndex >= 0) {
      goals[existingIndex] = goalToSave;
    } else {
      goals.unshift(goalToSave);
    }
    await saveGuestGoals(goals);
    return goalToSave;
  }

  const goalRef = doc(db, 'users', userId, 'goals', goal.id);
  const goalToSave: GoalItem = {
    ...goal,
    syncStatus: goal.syncStatus || 'synced',
  };
  await setDoc(goalRef, goalToSave, { merge: true });
  return goalToSave;
}

export async function addGoal(goal: GoalItem) {
  await saveGoal(goal);
  return goal;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    const goals = await getGuestGoals();
    const filtered = goals.filter((g) => g.id !== goalId);
    await saveGuestGoals(filtered);
    return;
  }

  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  await deleteDoc(goalRef);
  // Also clean up if it was lingering in guest goals
  const guestGoals = await getGuestGoals();
  if (guestGoals.some((g) => g.id === goalId)) {
    await saveGuestGoals(guestGoals.filter((g) => g.id !== goalId));
  }
}

export async function updateGoal(goalId: string, updates: Partial<GoalItem>): Promise<GoalItem | null> {
  const userId = getCurrentUserId();
  if (!userId) {
    const goals = await getGuestGoals();
    const nextGoals = goals.map((g) =>
      g.id === goalId
        ? { ...g, ...updates, syncStatus: 'pending' as GoalSyncStatus }
        : g
    );
    await saveGuestGoals(nextGoals);
    return nextGoals.find((g) => g.id === goalId) ?? null;
  }

  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(goalRef, updates);
  return getGoalById(goalId);
}

export async function dismissGoalConflict(goalId: string): Promise<GoalItem | null> {
  return updateGoal(goalId, {
    syncStatus: 'synced',
    conflictResolution: null,
    syncError: null,
  });
}

export async function toggleTask(goalId: string, taskId: string): Promise<GoalItem | null> {
  const goal = await getGoalById(goalId);

  if (!goal) return null;

  const updatedTasks = goal.tasks.map((task) => {
    if (task.id !== taskId) return task;

    const nextCompleted = !task.completed;

    return {
      ...task,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
    };
  });

  const updatedGoal: GoalItem = {
    ...goal,
    tasks: updatedTasks,
    progress: calculateProgress(updatedTasks),
  };

  const userId = getCurrentUserId();
  if (!userId) {
    const goals = await getGuestGoals();
    const nextGoals = goals.map((g) =>
      g.id === goalId
        ? { ...updatedGoal, syncStatus: 'pending' as GoalSyncStatus }
        : g
    );
    await saveGuestGoals(nextGoals);
    return updatedGoal;
  }

  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  await updateDoc(goalRef, {
    tasks: updatedGoal.tasks,
    progress: updatedGoal.progress,
  });

  return updatedGoal;
}

export async function syncGuestGoalsToFirebase(): Promise<number> {
  const report = await syncGuestDataToAccount();
  return report.syncedGoalsCount + report.mergedGoalsCount;
}

function toDateKey(dateValue: string | Date) {
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function subtractOneDay(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() - 1);
  return next;
}

export function getCompletedDateKeys(goals: GoalItem[]) {
  const completedDates = new Set<string>();

  goals.forEach((goal) => {
    goal.tasks.forEach((task) => {
      if (task.completed && task.completedAt) {
        completedDates.add(toDateKey(task.completedAt));
      }
    });
  });

  return completedDates;
}

export function calculateStreak(goals: GoalItem[]) {
  const completedDates = getCompletedDateKeys(goals);

  if (completedDates.size === 0) return 0;

  const today = new Date();
  const yesterday = subtractOneDay(today);

  let cursor: Date;

  if (completedDates.has(toDateKey(today))) {
    cursor = today;
  } else if (completedDates.has(toDateKey(yesterday))) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;

  while (completedDates.has(toDateKey(cursor))) {
    streak += 1;
    cursor = subtractOneDay(cursor);
  }

  return streak;
}

export function hasCompletedTaskToday(goals: GoalItem[]) {
  const todayKey = toDateKey(new Date());
  return getCompletedDateKeys(goals).has(todayKey);
}

export function calculateDeadlineUrgency(deadline?: string | null): DeadlineUrgency {
  if (!deadline?.trim()) return 'none';

  const parsed = new Date(deadline);

  if (Number.isNaN(parsed.getTime())) {
    return 'none';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadline = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );

  const diffMs = startOfDeadline.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 1) return 'high';
  if (diffDays <= 3) return 'medium';
  return 'low';
}
