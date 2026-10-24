import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  calculateProgress,
  ConflictResolution,
  GoalItem,
  GoalTask,
  makeId,
} from './goals';
import {
  clearGuestData,
  clearGuestPreferences,
  getGuestGoals,
  getGuestPreferences,
  getSyncState,
  removeGuestGoal,
  saveSyncState,
  SyncReport,
  SyncState,
  SyncStatus,
  updateGuestGoal,
} from './guest-storage';
import { UserPreferences } from './preferences';

export type { SyncReport, SyncState, SyncStatus };

// Global lock to prevent overlapping concurrent sync runs
let activeSyncPromise: Promise<SyncReport> | null = null;

function normalize(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  action: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 200,
        3000
      );
      console.warn(`Sync attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, err);
      await sleep(delay);
    }
  }
  throw lastError;
}

export async function syncGuestDataToAccount(): Promise<SyncReport> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = performSync().finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}

async function performSync(): Promise<SyncReport> {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  if (!userId) {
    return {
      status: 'idle',
      syncedGoalsCount: 0,
      mergedGoalsCount: 0,
      failedGoalsCount: 0,
      preferencesSynced: false,
      error: 'User not authenticated',
    };
  }

  const initialGuestGoals = await getGuestGoals();
  const guestPrefs = await getGuestPreferences();

  if (initialGuestGoals.length === 0 && !guestPrefs) {
    await saveSyncState({
      status: 'synced',
      pendingGoalsCount: 0,
      errorMessage: null,
      lastSuccessAt: new Date().toISOString(),
    });

    return {
      status: 'synced',
      syncedGoalsCount: 0,
      mergedGoalsCount: 0,
      failedGoalsCount: 0,
      preferencesSynced: false,
      lastAttemptAt: new Date().toISOString(),
    };
  }

  await saveSyncState({
    status: 'syncing',
    pendingGoalsCount: initialGuestGoals.length,
    errorMessage: null,
    lastAttemptAt: new Date().toISOString(),
  });

  let syncedCount = 0;
  let mergedCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;
  let prefsSuccess = false;

  // 1. Sync & Merge Goals with Conflict Detection & Preservation
  if (initialGuestGoals.length > 0) {
    let existingGoals: GoalItem[] = [];
    try {
      existingGoals = await withRetry(async () => {
        const goalsRef = collection(db, 'users', userId, 'goals');
        const snapshot = await getDocs(goalsRef);
        return snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        })) as GoalItem[];
      });
    } catch (fetchErr) {
      console.warn('Could not read existing cloud goals for duplicate checks:', fetchErr);
    }

    for (const guestGoal of initialGuestGoals) {
      try {
        await withRetry(async () => {
          const guestTitleNorm = normalize(guestGoal.title);
          const guestCategoryNorm = normalize(guestGoal.category);

          // Check for exact ID match or semantic match (title + category)
          const exactIdMatch = existingGoals.find((g) => g.id === guestGoal.id);
          const semanticMatch = existingGoals.find(
            (g) =>
              normalize(g.title) === guestTitleNorm &&
              (!guestCategoryNorm || normalize(g.category) === guestCategoryNorm)
          );

          const match = exactIdMatch || semanticMatch;

          if (match) {
            // Merge tasks non-destructively: detect conflicts, preserve both versions, and record resolution
            const mergedTasks: GoalTask[] = [...(match.tasks || [])];
            const conflictedTitles: string[] = [];

            for (const guestTask of guestGoal.tasks || []) {
              const existingByIdIdx = mergedTasks.findIndex((t) => t.id === guestTask.id);
              const existingByTitleIdx = mergedTasks.findIndex(
                (t) => normalize(t.title) === normalize(guestTask.title)
              );
              const matchIdx = existingByIdIdx >= 0 ? existingByIdIdx : existingByTitleIdx;

              if (matchIdx >= 0) {
                const existingTask = mergedTasks[matchIdx];
                const titlesDiffer = normalize(existingTask.title) !== normalize(guestTask.title);

                // Detect true conflicting edits:
                // 1) Titles differ on the same task ID
                // 2) Disagreeing completion status where both had edits (e.g. cloud completed, guest uncompleted)
                // 3) Both marked completed with different timestamps
                const hasConflict =
                  (titlesDiffer && existingByIdIdx >= 0) ||
                  (existingTask.completed !== guestTask.completed && existingTask.completed && !guestTask.completed) ||
                  (existingTask.completed &&
                    guestTask.completed &&
                    Boolean(existingTask.completedAt) &&
                    Boolean(guestTask.completedAt) &&
                    existingTask.completedAt !== guestTask.completedAt);

                if (hasConflict) {
                  conflictedTitles.push(guestTask.title);

                  // 1. Preserve cloud version with an annotation
                  mergedTasks[matchIdx] = {
                    ...existingTask,
                    conflictNote: existingTask.conflictNote || 'Account version (preserved)',
                  };

                  // 2. Preserve guest version alongside it
                  mergedTasks.push({
                    id: makeId('task_guest_conflict'),
                    title: titlesDiffer
                      ? `${guestTask.title} (Guest edit)`
                      : `${guestTask.title} (Guest version)`,
                    completed: guestTask.completed,
                    completedAt: guestTask.completedAt || null,
                    source: guestTask.source || 'user',
                    isConflictCopy: true,
                    conflictNote: 'Preserved from guest session conflict',
                  });
                } else {
                  // Clean forward: guest completed an uncompleted cloud task
                  if (guestTask.completed && !existingTask.completed) {
                    mergedTasks[matchIdx] = {
                      ...existingTask,
                      completed: true,
                      completedAt: guestTask.completedAt || new Date().toISOString(),
                    };
                  }
                }
              } else {
                // New task introduced in guest session, append safely
                mergedTasks.push(guestTask);
              }
            }

            const mergedProgress = calculateProgress(mergedTasks);
            const targetDocRef = doc(db, 'users', userId, 'goals', match.id);

            const hasNewConflict = conflictedTitles.length > 0;
            const conflictResolution: ConflictResolution | null = hasNewConflict
              ? {
                  resolvedAt: new Date().toISOString(),
                  description: `Preserved both versions for conflicting tasks (${conflictedTitles.join(
                    ', '
                  )}). Both your account and guest versions remain in your checklist so no edits were lost.`,
                  conflictedTaskTitles: conflictedTitles,
                }
              : match.conflictResolution || null;

            await setDoc(
              targetDocRef,
              {
                ...match,
                tasks: mergedTasks,
                progress: mergedProgress,
                reason: match.reason || guestGoal.reason || '',
                deadline: match.deadline || guestGoal.deadline || '',
                syncStatus: hasNewConflict ? 'attention' : match.syncStatus || 'synced',
                conflictResolution,
              },
              { merge: true }
            );

            mergedCount++;
          } else {
            // Upload new goal document with synced status
            const goalDocRef = doc(db, 'users', userId, 'goals', guestGoal.id);
            await setDoc(
              goalDocRef,
              {
                ...guestGoal,
                syncStatus: 'synced',
                syncError: null,
                conflictResolution: null,
              },
              { merge: true }
            );
            syncedCount++;
          }

          // Atomically remove synced goal from local storage so it cannot be re-synced
          await removeGuestGoal(guestGoal.id);
        });
      } catch (goalErr: any) {
        console.error(`Failed to sync guest goal "${guestGoal.title}":`, goalErr);
        failedCount++;
        lastError = goalErr?.message || 'Goal sync failed';
        // Tag this local goal with syncError so it displays as 'attention' in UI
        await updateGuestGoal(guestGoal.id, {
          syncStatus: 'attention',
          syncError: lastError,
        });
      }
    }
  }

  // 2. Sync Preferences Safely
  if (guestPrefs) {
    try {
      await withRetry(async () => {
        const prefRef = doc(db, 'users', userId, 'profile', 'preferences');
        const existingSnap = await getDoc(prefRef);

        if (existingSnap.exists()) {
          const existingData = existingSnap.data() as Partial<UserPreferences>;
          const mergedPrefs: Partial<UserPreferences> = {
            ...guestPrefs,
            expoPushToken: existingData.expoPushToken ?? guestPrefs.expoPushToken ?? null,
            reminderEmail: existingData.reminderEmail ?? guestPrefs.reminderEmail ?? null,
            pushNotificationsEnabled:
              guestPrefs.pushNotificationsEnabled ?? existingData.pushNotificationsEnabled ?? true,
            updatedAt: new Date().toISOString(),
          };

          await setDoc(prefRef, mergedPrefs, { merge: true });
        } else {
          await setDoc(
            prefRef,
            {
              ...guestPrefs,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }

        await clearGuestPreferences();
        prefsSuccess = true;
      });
    } catch (prefErr: any) {
      console.error('Failed to sync guest preferences:', prefErr);
      if (!lastError) lastError = prefErr?.message || 'Preferences sync failed';
    }
  }

  const remainingGuestGoals = await getGuestGoals();
  const currentSyncState = await getSyncState();

  if (remainingGuestGoals.length > 0 || lastError) {
    const errorMsg =
      lastError ||
      `${remainingGuestGoals.length} goal(s) could not be synced to your account.`;

    await saveSyncState({
      status: 'failed',
      pendingGoalsCount: remainingGuestGoals.length,
      errorMessage: errorMsg,
      failedAttempts: (currentSyncState.failedAttempts || 0) + 1,
      lastAttemptAt: new Date().toISOString(),
    });

    return {
      status: 'failed',
      syncedGoalsCount: syncedCount,
      mergedGoalsCount: mergedCount,
      failedGoalsCount: remainingGuestGoals.length,
      preferencesSynced: prefsSuccess,
      error: errorMsg,
      lastAttemptAt: new Date().toISOString(),
    };
  }

  // Complete success
  await saveSyncState({
    status: 'synced',
    pendingGoalsCount: 0,
    errorMessage: null,
    lastSuccessAt: new Date().toISOString(),
    failedAttempts: 0,
    lastAttemptAt: new Date().toISOString(),
  });

  return {
    status: 'synced',
    syncedGoalsCount: syncedCount,
    mergedGoalsCount: mergedCount,
    failedGoalsCount: 0,
    preferencesSynced: true,
    lastAttemptAt: new Date().toISOString(),
  };
}

export async function retrySync(): Promise<SyncReport> {
  await saveSyncState({
    status: 'syncing',
    errorMessage: null,
  });
  return syncGuestDataToAccount();
}

export async function dismissSyncFailure(): Promise<void> {
  await saveSyncState({
    status: 'idle',
    errorMessage: null,
  });
}

export async function discardPendingGuestData(): Promise<void> {
  await clearGuestData();
  await saveSyncState({
    status: 'idle',
    pendingGoalsCount: 0,
    errorMessage: null,
    failedAttempts: 0,
  });
}
