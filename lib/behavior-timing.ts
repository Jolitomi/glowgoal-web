export type BehaviorProfile = {
  inactiveDays: number;
  usuallyOpensLate: boolean;
  justCreatedGoal: boolean;
};

export function getEveningReminderTime(profile: BehaviorProfile) {
  if (profile.inactiveDays >= 2) return { hour: 19, minute: 30 };
  return { hour: 20, minute: 0 };
}

export function getMorningReminderTime(profile: BehaviorProfile) {
  if (profile.usuallyOpensLate) return { hour: 9, minute: 0 };
  return { hour: 8, minute: 0 };
}

export function shouldSendLockInReminder(profile: BehaviorProfile) {
  return profile.justCreatedGoal;
}