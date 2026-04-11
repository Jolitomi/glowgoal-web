import { GoalItem } from './goals';

export type UserTrait =
  | 'procrastinates_but_returns'
  | 'consistent_finisher'
  | 'builds_tiny_goals_often'
  | 'creates_goals_in_bursts'
  | 'edits_a_lot_before_acting'
  | 'works_better_in_short_bursts';

export type UserProfile = {
  traits: UserTrait[];
  completionRate: number;
  averageTasksPerGoal: number;
};

function toDateKey(dateValue: string | Date) {
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function buildUserProfile(goals: GoalItem[]): UserProfile {
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.progress === 100).length;
  const totalTasks = goals.reduce((sum, g) => sum + g.tasks.length, 0);

  const allCompletedTasks = goals.flatMap((goal) =>
    goal.tasks.filter((task) => task.completed && task.completedAt)
  );

  const activeDays = new Set(
    allCompletedTasks.map((task) => toDateKey(task.completedAt as string))
  ).size;

  const completionRate = totalGoals > 0 ? completedGoals / totalGoals : 0;
  const averageTasksPerGoal = totalGoals > 0 ? totalTasks / totalGoals : 0;

  const traits = new Set<UserTrait>();

  if (completionRate < 0.4 && totalGoals >= 3 && activeDays >= 2) {
    traits.add('procrastinates_but_returns');
  }

  if (completionRate >= 0.7 && totalGoals >= 3) {
    traits.add('consistent_finisher');
  }

  if (averageTasksPerGoal > 0 && averageTasksPerGoal <= 4) {
    traits.add('builds_tiny_goals_often');
  }

  if (averageTasksPerGoal >= 8) {
    traits.add('creates_goals_in_bursts');
  }

  if (totalGoals >= 2 && allCompletedTasks.length === 0) {
    traits.add('edits_a_lot_before_acting');
  }

  if (activeDays > 0 && allCompletedTasks.length / activeDays >= 2) {
    traits.add('works_better_in_short_bursts');
  }

  return {
    traits: Array.from(traits),
    completionRate,
    averageTasksPerGoal,
  };
}