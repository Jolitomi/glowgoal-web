import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { BuddyType } from './buddy';
import { db } from './firebase';

export type UserPreferences = {
  buddy: BuddyType;
  pushNotificationsEnabled: boolean;
  expoPushToken?: string | null;
  emailNotificationsEnabled?: boolean;
  reminderEmail?: string | null;
  afternoonEmailEnabled?: boolean;
  deadlineEmailEnabled?: boolean;
  updatedAt?: string;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  buddy: 'hype',
  pushNotificationsEnabled: true,
  expoPushToken: null,
  emailNotificationsEnabled: false,
  reminderEmail: null,
  afternoonEmailEnabled: true,
  deadlineEmailEnabled: true,
  updatedAt: new Date().toISOString(),
};

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

async function getPreferencesRef() {
  const userId = await requireUserId();
  return doc(db, 'users', userId, 'profile', 'preferences');
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const preferencesRef = await getPreferencesRef();
  const snapshot = await getDoc(preferencesRef);

  if (!snapshot.exists()) {
    await setDoc(preferencesRef, DEFAULT_PREFERENCES, { merge: true });
    return DEFAULT_PREFERENCES;
  }

  const data = snapshot.data() as Partial<UserPreferences>;

 return {
  buddy: data.buddy ?? 'hype',
  pushNotificationsEnabled: data.pushNotificationsEnabled ?? true,
  expoPushToken: data.expoPushToken ?? null,

  emailNotificationsEnabled: data.emailNotificationsEnabled ?? false,
  reminderEmail: data.reminderEmail ?? null,
  afternoonEmailEnabled: data.afternoonEmailEnabled ?? true,
  deadlineEmailEnabled: data.deadlineEmailEnabled ?? true,

  updatedAt: data.updatedAt ?? new Date().toISOString(),
};
}

export async function saveUserPreferences(
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  const preferencesRef = await getPreferencesRef();

  const nextPreferences: Partial<UserPreferences> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(preferencesRef, nextPreferences, { merge: true });

  return getUserPreferences();
}

export async function saveUserBuddy(buddy: BuddyType) {
  const preferences = await saveUserPreferences({ buddy });
  return preferences.buddy;
}

export async function updateUserBuddy(buddy: BuddyType) {
  const preferencesRef = await getPreferencesRef();

  try {
    await updateDoc(preferencesRef, {
      buddy,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    await setDoc(
      preferencesRef,
      {
        ...DEFAULT_PREFERENCES,
        buddy,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  return buddy;
}

export async function updatePushNotificationsEnabled(enabled: boolean) {
  const preferences = await saveUserPreferences({
    pushNotificationsEnabled: enabled,
  });

  return preferences.pushNotificationsEnabled;
}

export async function saveExpoPushToken(token: string | null) {
  const preferences = await saveUserPreferences({
    expoPushToken: token,
  });

  return preferences.expoPushToken;
}

export function subscribeToUserPreferences(
  onChange: (preferences: UserPreferences) => void,
  onError?: (error: unknown) => void
) {
  const userId = getCurrentUserId();

  if (!userId) {
    onChange(DEFAULT_PREFERENCES);
    return () => {};
  }

  const preferencesRef = doc(db, 'users', userId, 'profile', 'preferences');

  return onSnapshot(
    preferencesRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        onChange(DEFAULT_PREFERENCES);
        return;
      }

      const data = snapshot.data() as Partial<UserPreferences>;

      onChange({
        buddy: data.buddy ?? 'hype',
        pushNotificationsEnabled: data.pushNotificationsEnabled ?? true,
        expoPushToken: data.expoPushToken ?? null,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      });
    },
    (error) => {
      console.log('Preferences listener failed:', error);
      onError?.(error);
    }
  );
}
export async function updateEmailNotificationsEnabled(enabled: boolean) {
  const preferences = await saveUserPreferences({
    emailNotificationsEnabled: enabled,
  });

  return preferences.emailNotificationsEnabled;
}

export async function updateReminderEmail(email: string) {
  const preferences = await saveUserPreferences({
    reminderEmail: email,
  });

  return preferences.reminderEmail;
}

export async function updateAfternoonEmailEnabled(enabled: boolean) {
  const preferences = await saveUserPreferences({
    afternoonEmailEnabled: enabled,
  });

  return preferences.afternoonEmailEnabled;
}

export async function updateDeadlineEmailEnabled(enabled: boolean) {
  const preferences = await saveUserPreferences({
    deadlineEmailEnabled: enabled,
  });

  return preferences.deadlineEmailEnabled;
}