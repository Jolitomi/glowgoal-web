import { BuddyType } from './buddy';
import {
  getBuddyNotificationMomentMessage,
  NotificationMoment,
} from './buddy-notification-messages';
import { buildGoalAwareLine } from './goal-message-personalizer';
import { GoalItem } from './goals';
import {
  cancelNotificationsByGoal,
  scheduleLocalNotification,
} from './notifications';

type RebuildNotificationArgs = {
  goal: GoalItem;
  goals: GoalItem[];
  buddy: BuddyType;
  suppressImmediate?: boolean;
};

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function isToday(dateString?: string | null) {
  if (!dateString) return false;

  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return false;

  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return value >= today && value < tomorrow;
}

function diffInDaysFromNow(dateString?: string | null) {
  if (!dateString) return null;

  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function hasAnyCompletedTaskToday(goal: GoalItem) {
  return goal.tasks.some((task) => isToday(task.completedAt));
}

export async function rebuildGoalNotifications({
  goal,
  goals,
  buddy,
  suppressImmediate = false,
}: RebuildNotificationArgs) {
  await cancelNotificationsByGoal(goal.id);

  if (goal.progress >= 100) {
    return;
  }

  if (suppressImmediate) {
    return;
  }

  const didWorkToday = hasAnyCompletedTaskToday(goal);
  const daysToDeadline = diffInDaysFromNow(goal.deadline);

  let branch:
    | 'overdue'
    | 'deadline_today'
    | 'deadline_close'
    | 'no_work_today'
    | null = null;

  if (daysToDeadline !== null && daysToDeadline < 0) {
    branch = 'overdue';
  } else if (daysToDeadline === 0) {
    branch = 'deadline_today';
  } else if (daysToDeadline !== null && daysToDeadline <= 3) {
    branch = 'deadline_close';
  } else if (!didWorkToday) {
    branch = 'no_work_today';
  }

  if (!branch) return;

  const moment: NotificationMoment =
    branch === 'no_work_today' ? 'evening_nudge' : branch;

  const base = getBuddyNotificationMomentMessage(buddy, moment, 'gentle');
  const customLine = buildGoalAwareLine(goal, moment);
  const fullBody = customLine ? `${base.body} ${customLine}` : base.body;

  await scheduleLocalNotification({
    title: base.title,
    body: fullBody,
    secondsFromNow: 10,
    data: {
      type: 'goal_updated',
      goalId: goal.id,
      branch,
      goalsCount: goals.length,
    },
  });
}
