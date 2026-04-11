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

export type GoalTask = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
  source: 'ai' | 'user';
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
};

export type DeadlineUrgency = 'none' | 'low' | 'medium' | 'high' | 'overdue';

export function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentUserId() {
  const auth = getAuth();
  return auth.currentUser?.uid ?? null;
}

async function requireUserId() {
  const userId = getCurrentUserId();

  if (!userId) {
    throw new Error('No signed-in user found.');
  }

  return userId;
}

export function calculateProgress(tasks: GoalTask[]) {
  const completedCount = tasks.filter((task) => task.completed).length;
  return tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
}

export async function getGoals(): Promise<GoalItem[]> {
  const userId = await requireUserId();
  const goalsRef = collection(db, 'users', userId, 'goals');
  const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(goalsQuery);

  return snapshot.docs.map((docSnap) => docSnap.data() as GoalItem);
}

export async function getGoalById(goalId: string) {
  const userId = await requireUserId();
  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  const snapshot = await getDoc(goalRef);

  if (!snapshot.exists()) return null;
  return snapshot.data() as GoalItem;
}

export function subscribeToGoals(
  onGoalsChange: (goals: GoalItem[]) => void,
  onError?: (error: unknown) => void
) {
  const userId = getCurrentUserId();

  if (!userId) {
    onGoalsChange([]);
    return () => {};
  }

  const goalsRef = collection(db, 'users', userId, 'goals');
  const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    goalsQuery,
    (snapshot) => {
      const goals = snapshot.docs.map((docSnap) => docSnap.data() as GoalItem);
      onGoalsChange(goals);
    },
    (error) => {
      console.log('Realtime goals listener failed:', error);
      onError?.(error);
    }
  );
}

export async function saveGoal(goal: GoalItem) {
  const userId = await requireUserId();
  const goalRef = doc(db, 'users', userId, 'goals', goal.id);

  await setDoc(goalRef, goal);
  return goal;
}

export async function addGoal(goal: GoalItem) {
  await saveGoal(goal);
  return goal;
}

export async function deleteGoal(goalId: string) {
  const userId = await requireUserId();
  const goalRef = doc(db, 'users', userId, 'goals', goalId);

  await deleteDoc(goalRef);
}

export async function updateGoal(goalId: string, updates: Partial<GoalItem>) {
  const userId = await requireUserId();
  const goalRef = doc(db, 'users', userId, 'goals', goalId);

  await updateDoc(goalRef, updates);
  return getGoalById(goalId);
}

export async function toggleTask(goalId: string, taskId: string) {
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

  const userId = await requireUserId();
  const goalRef = doc(db, 'users', userId, 'goals', goalId);

  await updateDoc(goalRef, {
    tasks: updatedGoal.tasks,
    progress: updatedGoal.progress,
  });

  return updatedGoal;
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