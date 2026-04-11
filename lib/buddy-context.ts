import { BuddyInsight } from './buddy-insights';
import { DeadlineUrgency, GoalItem } from './goals';

export type BuddyEvent =
  | 'goal_locked_in'
  | 'task_completed'
  | 'goal_completed'
  | 'goal_updated';

export type BuddyContext =
  | 'first_goal_ever'
  | 'new_goal'
  | 'first_task'
  | 'early_progress'
  | 'mid_progress'
  | 'halfway'
  | 'almost_done'
  | 'goal_completed'
  | 'comeback'
  | 'streak_started'
  | 'on_fire'
  | 'deadline_close'
  | 'deadline_today'
  | 'inactive'
  | 'streak_at_risk'
  | 'rushing'
  | 'overdue';

export function detectContext({
  event,
  goal,
  goals,
  urgency,
  insight,
}: {
  event: BuddyEvent;
  goal?: GoalItem;
  goals: GoalItem[];
  urgency: DeadlineUrgency;
  insight: BuddyInsight;
}): BuddyContext {
  // 🔥 PRIORITY 1: DEADLINE (MOST IMPORTANT)
if (urgency === 'overdue') return 'overdue';
if (urgency === 'high') return 'deadline_today';
if (urgency === 'medium') return 'deadline_close';

// 🔥 PRIORITY 2: BEHAVIOR
if (insight.inactiveFor2Days) {
  return 'inactive';
}

if (insight.rushingBeforeDeadline) {
  return 'rushing';
}

  // PRIORITY 4: GOAL EVENTS
  if (event === 'goal_locked_in') {
    if (goals.length <= 1) return 'first_goal_ever';
    return 'new_goal';
  }

  if (!goal) return 'mid_progress';

  const totalTasks = goal.tasks.length;
  const completedTasks = goal.tasks.filter((t) => t.completed).length;
  const progress = goal.progress;

  if (event === 'goal_completed' || progress === 100) {
    return 'goal_completed';
  }

  if (event === 'task_completed') {
    if (completedTasks === 1) return 'first_task';

    if (progress >= 90) return 'almost_done';
    if (progress >= 50) return 'halfway';

    if (totalTasks > 0) {
      const ratio = completedTasks / totalTasks;
      if (ratio <= 0.34) return 'early_progress';
      return 'mid_progress';
    }
  }

  return 'mid_progress';
}