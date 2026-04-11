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

  await cancelDailyReminderNotifications();

  if (unfinishedGoals.length === 0) {
    return;
  }

  const primaryGoal = unfinishedGoals[0];

  const morning = getBuddyNotificationMomentMessage(
    buddy,
    'morning_check',
    'gentle'
  );

  await scheduleDailyRepeatingNotification({
    title: morning.title,
    body: primaryGoal
      ? `${morning.body} Start by checking "${primaryGoal.title}" today.`
      : morning.body,
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

    await scheduleDailyRepeatingNotification({
      title: afternoon.title,
      body: primaryGoal
        ? `${afternoon.body} "${primaryGoal.title}" is waiting for you.`
        : afternoon.body,
      hour: 16,
      minute: 0,
      data: { type: 'afternoon_nudge' },
    });
  }

  const missedDays = await getMissedDays();
  const level = getEscalationLevel(missedDays);

  const evening = getBuddyNotificationMomentMessage(
    buddy,
    'evening_nudge',
    level
  );

  await scheduleDailyRepeatingNotification({
    title: evening.title,
    body: primaryGoal
      ? `${evening.body} "${primaryGoal.title}" is still waiting for you.`
      : evening.body,
    hour: 20,
    minute: 0,
    data: { type: 'evening_nudge', level },
  });
}