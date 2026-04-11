import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_OPEN_KEY = 'glowgoal_last_open';

export async function updateLastAppOpened() {
  const now = new Date().toISOString();
  await AsyncStorage.setItem(LAST_OPEN_KEY, now);
}

export async function getLastAppOpened() {
  return AsyncStorage.getItem(LAST_OPEN_KEY);
}

export function isToday(dateString?: string | null) {
  if (!dateString) return false;

  const date = new Date(dateString);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}