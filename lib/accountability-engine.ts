import { AccountabilityContext, AccountabilityDecision } from './accountability-types';
import { BuddyType } from './buddy';
import { getBuddyNotificationMessage } from './buddy-notification-messages';
import { buildGoalAwareLine } from './goal-message-personalizer';
import { GoalItem } from './goals';
import { getLastAppOpened, isToday } from './user-activity';
import { getMissedDays } from './user-behavior';

type GoalAwareMoment = 'lock_in' | 'deadline_close' | 'deadline_today' | 'overdue';

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntil(dateString?: string | null) {
  if (!dateString) return null;

  const due = new Date(dateString);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getCompletedCount(goal: GoalItem) {
  return goal.tasks?.filter((task) => task.completed).length ?? 0;
}

function getProgress(goal: GoalItem) {
  const total = goal.tasks?.length ?? 0;
  if (!total) return 0;
  return getCompletedCount(goal) / total;
}

function completedSomethingToday(goal: GoalItem) {
  return (
    goal.tasks?.some((task) => {
      if (!task.completed || !task.completedAt) return false;
      return isToday(task.completedAt);
    }) ?? false
  );
}

function createdToday(goal: GoalItem) {
  return isToday(goal.createdAt);
}

function hasUntouchedGoalToday(goal: GoalItem) {
  return createdToday(goal) && getCompletedCount(goal) === 0;
}

function pickMostUrgentGoal(goals: GoalItem[]) {
  const valid = goals
    .map((goal) => ({
      goal,
      dueIn: daysUntil(goal.deadline),
      progress: getProgress(goal),
    }))
    .filter((item) => item.progress < 1);

  if (!valid.length) return null;

  valid.sort((a, b) => {
    const aDue = a.dueIn ?? 999999;
    const bDue = b.dueIn ?? 999999;
    return aDue - bDue;
  });

  return valid[0].goal;
}

function pickGoalClosestToFinish(goals: GoalItem[]) {
  const candidates = goals
    .map((goal) => ({
      goal,
      progress: getProgress(goal),
    }))
    .filter((item) => item.progress > 0 && item.progress < 1)
    .sort((a, b) => b.progress - a.progress);

  return candidates[0]?.goal ?? null;
}

function pickFreshGoal(goals: GoalItem[]) {
  return goals.find((goal) => hasUntouchedGoalToday(goal)) ?? null;
}

function pickBestDailyNudgeGoal(goals: GoalItem[]) {
  return (
    pickMostUrgentGoal(goals) ??
    pickGoalClosestToFinish(goals) ??
    goals.find((goal) => getProgress(goal) < 1) ??
    null
  );
}

function isGoalDueToday(goal: GoalItem) {
  const due = daysUntil(goal.deadline);
  return due === 0;
}

function isGoalOverdue(goal: GoalItem) {
  const due = daysUntil(goal.deadline);
  return typeof due === 'number' && due < 0;
}

function isGoalDeadlineClose(goal: GoalItem) {
  const due = daysUntil(goal.deadline);
  return typeof due === 'number' && due > 0 && due <= 3;
}

function isStreakAtRisk(goals: GoalItem[]) {
  const anyProgressToday = goals.some(completedSomethingToday);
  return !anyProgressToday;
}

function isOnFire(goals: GoalItem[]) {
  return goals.some((goal) => {
    const total = goal.tasks?.length ?? 0;
    const doneToday =
      goal.tasks?.filter((task) => task.completed && isToday(task.completedAt)).length ?? 0;

    return total > 0 && doneToday >= 2;
  });
}

function isGoalAwareMoment(context: AccountabilityContext): context is GoalAwareMoment {
  return (
    context === 'lock_in' ||
    context === 'deadline_close' ||
    context === 'deadline_today' ||
    context === 'overdue' 
  );
}

function buildDecision(
  buddy: BuddyType,
  context: AccountabilityContext,
  goal?: GoalItem | null
): AccountabilityDecision {
  const base = getBuddyNotificationMessage(buddy, context);

  const body =
    goal && isGoalAwareMoment(context)
      ? buildGoalAwareLine(goal, context) || base.body
      : base.body;

  return {
    shouldSend: true,
    context,
    buddy,
    title: base.title,
    body,
    goalId: goal?.id,
  };
}

export async function getAccountabilityDecision(params: {
  buddy: BuddyType;
  goals: GoalItem[];
}): Promise<AccountabilityDecision> {
  const { buddy } = params;
  const activeGoals = params.goals.filter((goal) => getProgress(goal) < 1);

  if (!activeGoals.length) {
    return {
      shouldSend: false,
      context: null,
      buddy,
      title: '',
      body: '',
    };
  }

  const [lastOpened, missedDays] = await Promise.all([
    getLastAppOpened(),
    getMissedDays(),
  ]);

  const openedToday = isToday(lastOpened);
  const inactiveDays = missedDays;
  const comeback = inactiveDays >= 3 && openedToday;

  const overdueGoal = activeGoals.find(isGoalOverdue);
  if (overdueGoal) {
    return buildDecision(buddy, 'overdue', overdueGoal);
  }

  const todayGoal = activeGoals.find(isGoalDueToday);
  if (todayGoal) {
    return buildDecision(buddy, 'deadline_today', todayGoal);
  }

  const closeGoal = activeGoals.find(isGoalDeadlineClose);
  if (closeGoal) {
    return buildDecision(buddy, 'deadline_close', closeGoal);
  }

  if (comeback) {
    const comebackGoal = pickBestDailyNudgeGoal(activeGoals);
    return buildDecision(buddy, 'comeback', comebackGoal);
  }

  if (inactiveDays >= 2 && !openedToday) {
    const inactiveGoal = pickBestDailyNudgeGoal(activeGoals);
    return buildDecision(buddy, 'inactive', inactiveGoal);
  }

  const freshGoal = pickFreshGoal(activeGoals);
  if (freshGoal && !completedSomethingToday(freshGoal)) {
    return buildDecision(
      buddy,
      activeGoals.length === 1 ? 'first_goal' : 'lock_in',
      freshGoal
    );
  }

  if (isOnFire(activeGoals)) {
    const fireGoal = pickGoalClosestToFinish(activeGoals) ?? activeGoals[0];
    return buildDecision(buddy, 'on_fire', fireGoal);
  }

  if (isStreakAtRisk(activeGoals) && openedToday) {
    const riskGoal = pickBestDailyNudgeGoal(activeGoals);
    return buildDecision(buddy, 'streak_at_risk', riskGoal);
  }

  const nudgeGoal = pickBestDailyNudgeGoal(activeGoals);
  return buildDecision(buddy, 'daily_nudge', nudgeGoal);
}