import { BuddyType } from './buddy';
import { getEscalationLevel } from './buddy-escalation';
import { getBuddyNotificationMomentMessage } from './buddy-notification-messages';
import { GoalItem } from './goals';
import {
  cancelDailyReminderNotifications,
  scheduleDailyRepeatingNotification,
} from './notifications';
import { getMissedDays } from './user-behavior';
import { getLastTaskCompleted, isToday } from './user-progress';

export async function scheduleDailyReminders(
  goals: GoalItem[],
  buddy: BuddyType
) {
  const unfinishedGoals = goals.filter((g) => g.progress < 100);

  // Clear existing local schedules to avoid duplicates
  await cancelDailyReminderNotifications();

  if (unfinishedGoals.length === 0) {
    return;
  }

  const primaryGoal = unfinishedGoals[0];

  // --- MORNING LOGIC ---
  const morning = getBuddyNotificationMomentMessage(
    buddy,
    'morning_check',
    'gentle'
  );

  // Keep local notification at 8:00 AM
  await scheduleDailyRepeatingNotification({
    title: morning.title,
    body: `${morning.body} Start by checking "${primaryGoal.title}" today.`,
    hour: 8,
    minute: 0,
    data: { type: 'morning_check' },
  });

  const lastCompleted = await getLastTaskCompleted();
  const hasProgressToday = isToday(lastCompleted);

  if (!hasProgressToday) {
    const afternoon = getBuddyNotificationMomentMessage(
      buddy,
      'afternoon_nudge',
      'firm'
    );

    // Keep local notification at 4:00 PM (16:00)
    await scheduleDailyRepeatingNotification({
      title: afternoon.title,
      body: `${afternoon.body} "${primaryGoal.title}" is waiting for you.`,
      hour: 16,
      minute: 0,
      data: { type: 'afternoon_nudge' },
    });
  }

  // --- EVENING LOGIC ---
  const missedDays = await getMissedDays();
  const level = getEscalationLevel(missedDays);

  const evening = getBuddyNotificationMomentMessage(
    buddy,
    'evening_nudge',
    level
  );

  // Keep local notification at 8:00 PM (20:00)
  await scheduleDailyRepeatingNotification({
    title: evening.title,
    body: `${evening.body} "${primaryGoal.title}" is still waiting for you.`,
    hour: 20,
    minute: 0,
    data: { type: 'evening_nudge', level },
  });

}