import { BuddyType } from './buddy';
import { BuddyContext } from './buddy-context';
import { BuddyPopup, messageBank } from './buddy-messages';
import { UserTrait } from './buddy-profile';
import { GoalItem } from './goals';

type BuddyEvent =
  | 'goal_locked_in'
  | 'task_completed'
  | 'goal_completed'
  | 'comeback'
  | 'deadline_warning';

type GetBuddyPopupParams = {
  event: BuddyEvent;
  buddy: BuddyType;
  goal?: GoalItem | null;
  goals?: GoalItem[];
  traits?: UserTrait[];
};

function pickRandom<T>(items: T[]): T | null {
  if (!items.length) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function getGoalProgress(goal?: GoalItem | null) {
  if (!goal?.tasks?.length) return 0;

  const done = goal.tasks.filter((task) => task.completed).length;
  return done / goal.tasks.length;
}

function getDeadlineContext(goal?: GoalItem | null): BuddyContext | null {
  if (!goal?.deadline) return null;

  const due = new Date(goal.deadline);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'deadline_today';
  if (diffDays <= 3) return 'deadline_close';

  return null;
}

function resolveLockInContext(goal: GoalItem | null | undefined, goals: GoalItem[]): BuddyContext {
  const totalGoalsBeforeThisOne = Math.max(goals.length - 1, 0);

  if (totalGoalsBeforeThisOne === 0) {
    return 'first_goal_ever';
  }

  const deadlineContext = getDeadlineContext(goal);
  if (deadlineContext === 'overdue') return 'overdue';
  if (deadlineContext === 'deadline_today') return 'deadline_today';
  if (deadlineContext === 'deadline_close') return 'deadline_close';

  return 'new_goal';
}

function resolveTaskContext(goal: GoalItem | null | undefined): BuddyContext {
  const progress = getGoalProgress(goal);

  if (progress <= 0.2) return 'early_progress';
  if (progress < 0.5) return 'mid_progress';
  if (progress === 0.5) return 'halfway';
  if (progress < 1) return 'almost_done';

  return 'goal_completed';
}

function getMessagesForTraits(
  context: BuddyContext,
  buddy: BuddyType,
  traits: UserTrait[] = []
): BuddyPopup[] {
  const bucket = messageBank[context]?.[buddy];
  if (!bucket) return [];

  for (const trait of traits) {
    const traitMessages = bucket[trait];
    if (traitMessages?.length) {
      return traitMessages;
    }
  }

  return bucket.generic ?? [];
}

export function getBuddyPopup({
  event,
  buddy,
  goal,
  goals = [],
  traits = [],
}: GetBuddyPopupParams): BuddyPopup | null {
  let context: BuddyContext;

  switch (event) {
    case 'goal_locked_in':
      context = resolveLockInContext(goal, goals);
      break;

    case 'task_completed':
      if (!goal) return null;

      if (goal.tasks.filter((task) => task.completed).length === 1) {
        context = 'first_task';
      } else {
        context = resolveTaskContext(goal);
      }
      break;

    case 'goal_completed':
      context = 'goal_completed';
      break;

    case 'comeback':
      context = 'comeback';
      break;

    case 'deadline_warning':
      context = getDeadlineContext(goal) ?? 'deadline_close';
      break;

    default:
      context = 'new_goal';
      break;
  }

  const messages = getMessagesForTraits(context, buddy, traits);
  return pickRandom(messages);
}