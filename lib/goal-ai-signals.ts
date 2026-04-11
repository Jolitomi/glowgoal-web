import { getGoals } from './goals';
import { getLastAppOpened } from './user-activity';
import { getMissedDays } from './user-behavior';

export type GoalAiSignals = {
  isFirstGoal: boolean;
  isInactive: boolean;
  inactiveDays: number;
  comeback: boolean;
  deadlineState: 'none' | 'far' | 'close' | 'today' | 'overdue';
};

export async function buildGoalAiSignals(
  deadline?: string
): Promise<GoalAiSignals> {
  const goals = await getGoals();
  const lastOpened = await getLastAppOpened();
  const missedDays = await getMissedDays();

  const now = new Date();

  const isFirstGoal = goals.length === 0;

  let inactiveDays = missedDays;

  if (lastOpened) {
    const openedAt = new Date(lastOpened);
    if (!Number.isNaN(openedAt.getTime())) {
      const diff = Math.floor(
        (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      inactiveDays = Math.max(inactiveDays, diff);
    }
  }

  const isInactive = inactiveDays >= 2;
  const comeback = inactiveDays >= 3;

  let deadlineState: GoalAiSignals['deadlineState'] = 'none';

  if (deadline) {
    const due = new Date(deadline);
    if (!Number.isNaN(due.getTime())) {
      const diffDays = Math.ceil(
        (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) deadlineState = 'overdue';
      else if (diffDays === 0) deadlineState = 'today';
      else if (diffDays <= 7) deadlineState = 'close';
      else deadlineState = 'far';
    }
  }

  return {
    isFirstGoal,
    isInactive,
    inactiveDays,
    comeback,
    deadlineState,
  };
}