import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const EXPO_PUSH_TOKEN_KEY = 'glowgoal_expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions() {
  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  return finalStatus === 'granted';
}

export async function registerForPushNotificationsAsync() {
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

  if (!Device.isDevice) {
    return null;
  }

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

export async function getStoredPushToken() {
  return AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
}

export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  secondsFromNow: number;
  data?: Record<string, unknown>;
}) {
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

export async function scheduleDailyRepeatingNotification(params: {
  title: string;
  body: string;
  hour: number;
  minute?: number;
  data?: Record<string, unknown>;
}) {
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

export async function cancelNotificationsByGoal(goalId: string) {
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

export async function cancelNotificationsByType(type: string) {
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

export async function cancelDailyReminderNotifications() {
  await Promise.all([
    cancelNotificationsByType('morning_check'),
    cancelNotificationsByType('afternoon_nudge'),
    cancelNotificationsByType('evening_nudge'),
  ]);
}

export async function cancelGlowGoalNotifications() {
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

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getNotificationPermissionStatus() {
  const settings = await Notifications.getPermissionsAsync();
  return settings.status;
}