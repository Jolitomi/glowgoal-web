import AsyncStorage from '@react-native-async-storage/async-storage';

const MISSED_DAYS_KEY = 'glowgoal_missed_days';

export async function getMissedDays() {
  const value = await AsyncStorage.getItem(MISSED_DAYS_KEY);
  return value ? Number(value) : 0;
}

export async function incrementMissedDays() {
  const current = await getMissedDays();
  await AsyncStorage.setItem(MISSED_DAYS_KEY, String(current + 1));
}

export async function resetMissedDays() {
  await AsyncStorage.setItem(MISSED_DAYS_KEY, '0');
}