import { BuddyType } from './buddy';

export type AccountabilityContext =
  | 'lock_in'
  | 'inactive'
  | 'streak_at_risk'
  | 'deadline_close'
  | 'deadline_today'
  | 'overdue'
  | 'comeback'
  | 'on_fire'
  | 'first_goal'
  | 'daily_nudge';

export type AccountabilityDecision = {
  shouldSend: boolean;
  context: AccountabilityContext | null;
  buddy: BuddyType;
  title: string;
  body: string;
  goalId?: string;
};