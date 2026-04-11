import { BuddyEvent } from './buddy-context';
import { UserTrait, buildUserProfile } from './buddy-profile';
import {
    DeadlineUrgency,
    GoalItem,
    calculateDeadlineUrgency,
    calculateStreak,
    hasCompletedTaskToday,
} from './goals';

export type BuddyInsight = {
  traits: UserTrait[];
  primaryTrait?: UserTrait;
  streak: number;
  deadlineUrgency: DeadlineUrgency;
  completedToday: boolean;
  completionRate: number;
  averageTasksPerGoal: number;

  inactiveFor2Days: boolean;
  streakAboutToBreak: boolean;
  rushingBeforeDeadline: boolean;
};

function toDateKey(dateValue: string | Date) {
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function getLatestCompletedAt(goals: GoalItem[]): string | null {
  const completedAtValues = goals
    .flatMap((goal) => goal.tasks)
    .filter((task) => task.completed && task.completedAt)
    .map((task) => task.completedAt as string)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return completedAtValues[0] ?? null;
}

function isInactiveFor2Days(goals: GoalItem[]) {
  const latestCompletedAt = getLatestCompletedAt(goals);

  if (!latestCompletedAt) return false;

  const latestDate = startOfDay(new Date(latestCompletedAt));
  const today = startOfDay(new Date());

  const diffMs = today.getTime() - latestDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 2;
}

function isStreakAboutToBreak(goals: GoalItem[]) {
  const streak = calculateStreak(goals);
  if (streak <= 0) return false;

  const completedToday = hasCompletedTaskToday(goals);
  if (completedToday) return false;

  const yesterday = subtractDays(new Date(), 1);
  const yesterdayKey = toDateKey(yesterday);

  const completedDates = new Set<string>();

  goals.forEach((goal) => {
    goal.tasks.forEach((task) => {
      if (task.completed && task.completedAt) {
        completedDates.add(toDateKey(task.completedAt));
      }
    });
  });

  return completedDates.has(yesterdayKey);
}

function isRushingBeforeDeadline(
  goal: GoalItem | undefined,
  urgency: DeadlineUrgency
) {
  if (!goal) return false;
  if (!goal.deadline?.trim()) return false;
  if (!(urgency === 'high' || urgency === 'medium')) return false;

  const totalTasks = goal.tasks.length;
  if (totalTasks === 0) return false;

  const completedTasks = goal.tasks.filter((task) => task.completed).length;
  const remainingTasks = totalTasks - completedTasks;

  if (remainingTasks <= 0) return false;

  const progress = goal.progress;

  if (urgency === 'high' && progress < 80) return true;
  if (urgency === 'medium' && progress < 50) return true;

  return false;
}

export function buildBuddyInsight({
  event,
  goal,
  goals,
}: {
  event: BuddyEvent;
  goal?: GoalItem;
  goals: GoalItem[];
}): BuddyInsight {
  const profile = buildUserProfile(goals);
  const streak = calculateStreak(goals);
  const deadlineUrgency = calculateDeadlineUrgency(goal?.deadline);
  const completedToday = hasCompletedTaskToday(goals);

  const inactiveFor2Days = isInactiveFor2Days(goals);
  const streakAboutToBreak = isStreakAboutToBreak(goals);
  const rushingBeforeDeadline = isRushingBeforeDeadline(goal, deadlineUrgency);

  return {
    traits: profile.traits,
    primaryTrait: profile.traits[0],
    streak,
    deadlineUrgency,
    completedToday,
    completionRate: profile.completionRate,
    averageTasksPerGoal: profile.averageTasksPerGoal,
    inactiveFor2Days,
    streakAboutToBreak,
    rushingBeforeDeadline,
  };
}