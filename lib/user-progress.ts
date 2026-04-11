import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_TASK_COMPLETED_KEY = 'last_task_completed';

export async function setLastTaskCompleted() {
  await AsyncStorage.setItem(
    LAST_TASK_COMPLETED_KEY,
    new Date().toISOString()
  );
}

export async function getLastTaskCompleted() {
  const value = await AsyncStorage.getItem(LAST_TASK_COMPLETED_KEY);
  return value ? new Date(value) : null;
}

export function isToday(date: Date | null) {
  if (!date) return false;

  const now = new Date();

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}