export type EscalationLevel = 'gentle' | 'firm' | 'intense';

export function getEscalationLevel(missedDays: number): EscalationLevel {
  if (missedDays >= 4) return 'intense';
  if (missedDays >= 2) return 'firm';
  return 'gentle';
}