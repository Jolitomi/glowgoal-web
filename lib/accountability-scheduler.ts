import { getAccountabilityDecision } from './accountability-engine';
import { getGoals } from './goals';
import { scheduleLocalNotification } from './notifications';

export async function runAccountabilityCheck(buddy: 'soft' | 'hype' | 'savage') {
  const goals = await getGoals();
  const decision = await getAccountabilityDecision({ buddy, goals });

  if (!decision.shouldSend || !decision.context) {
    return null;
  }

  await scheduleLocalNotification({
    title: decision.title,
    body: decision.body,
    secondsFromNow: 10,
    data: {
      type: decision.context,
      goalId: decision.goalId,
    },
  });

  return decision;
}