import { NotificationMoment } from './buddy-notification-messages';
import { GoalItem } from './goals';

function clean(text?: string | null) {
  return (text ?? '').trim();
}

function shorten(text: string, max = 60) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

export function buildGoalAwareLine(
  goal: GoalItem,
  moment: NotificationMoment
) {
  const title = clean(goal.title);
  const reason = clean(goal.reason);
  const deadline = clean(goal.deadline);

  switch (moment) {
    case 'lock_in':
      if (title) return `You set "${title}". Now lock in.`;
      return 'You set the goal. Now lock in.';

    case 'deadline_close':
      if (title && deadline) {
        return `"${title}" is getting close to its deadline (${deadline}).`;
      }
      if (title) return `"${title}" is getting close.`;
      return 'Your deadline is getting close.';

    case 'deadline_today':
      if (title) return `"${title}" is due today.`;
      return 'This goal is due today.';

    case 'overdue':
      if (title) return `"${title}" is overdue now.`;
      return 'This goal is overdue now.';

    case 'evening_nudge':
      if (title && reason) {
        return `"${title}" is still waiting. ${shorten(reason, 50)}`;
      }
      if (title) return `"${title}" is still waiting for you.`;
      return 'Your goal is still waiting for you.';

    case 'morning_check':
      if (title) return `Start by checking "${title}" today.`;
      return 'Check your goals today.';

    default:
      return '';
  }
}