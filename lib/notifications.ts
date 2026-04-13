import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const EXPO_PUSH_TOKEN_KEY = 'glowgoal_expo_push_token';

/**
 * ✅ Only set handler on native (prevents web crash)
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * ✅ Permissions (safe for web)
 */
export async function ensureNotificationPermissions() {
  if (Platform.OS === 'web') return false;

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  return finalStatus === 'granted';
}

/**
 * ✅ Register for push (native only)
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  if (!Device.isDevice) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('Missing EAS projectId for push notifications');
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const token = tokenResponse.data;
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);

  return token;
}

/**
 * ✅ Get stored token
 */
export async function getStoredPushToken() {
  return AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
}

/**
 * ✅ Schedule local notification (safe)
 */
export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  secondsFromNow: number;
  data?: Record<string, unknown>;
}) {
  if (Platform.OS === 'web') return;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, params.secondsFromNow),
    },
  });
}

/**
 * ✅ Daily repeating notification
 */
export async function scheduleDailyRepeatingNotification(params: {
  title: string;
  body: string;
  hour: number;
  minute?: number;
  data?: Record<string, unknown>;
}) {
  if (Platform.OS === 'web') return;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: params.hour,
      minute: params.minute ?? 0,
    },
  });
}

/**
 * ✅ Cancel by goal
 */
export async function cancelNotificationsByGoal(goalId: string) {
  if (Platform.OS === 'web') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter(
    (item) => item.content.data?.goalId === goalId
  );

  await Promise.all(
    matching.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)
    )
  );
}

/**
 * ✅ Cancel by type
 */
export async function cancelNotificationsByType(type: string) {
  if (Platform.OS === 'web') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter(
    (item) => item.content.data?.type === type
  );

  await Promise.all(
    matching.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)
    )
  );
}

/**
 * ✅ Cancel daily reminders
 */
export async function cancelDailyReminderNotifications() {
  if (Platform.OS === 'web') return;

  await Promise.all([
    cancelNotificationsByType('morning_check'),
    cancelNotificationsByType('afternoon_nudge'),
    cancelNotificationsByType('evening_nudge'),
  ]);
}

/**
 * ✅ Cancel all GlowGoal notifications
 */
export async function cancelGlowGoalNotifications() {
  if (Platform.OS === 'web') return;

  const glowGoalTypes = [
    'morning_check',
    'afternoon_nudge',
    'evening_nudge',
    'goal_updated',
    'lock_in',
    'deadline_close',
    'deadline_today',
    'overdue',
  ];

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter((item) => {
    const type = item.content.data?.type;
    return typeof type === 'string' && glowGoalTypes.includes(type);
  });

  await Promise.all(
    matching.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)
    )
  );
}

/**
 * ✅ Cancel everything
 */
export async function cancelAllScheduledNotifications() {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * ✅ Permission status (safe)
 */
export async function getNotificationPermissionStatus() {
  if (Platform.OS === 'web') return 'unsupported';

  const settings = await Notifications.getPermissionsAsync();
  return settings.status;
}