export interface Reward {
  id: string;
  name: string;
  xpThreshold: number;
}

export const REWARDS: Reward[] = [
  { id: '1', name: 'Reward 1', xpThreshold: 1000 },
  { id: '2', name: 'Reward 2', xpThreshold: 2500 },
  { id: '3', name: 'Reward 3', xpThreshold: 5000 },
  { id: '4', name: 'Reward 4', xpThreshold: 10000 },
  { id: '5', name: 'Reward 5', xpThreshold: 20000 },
];

export function getNextReward(currentXP: number): Reward | null {
  return REWARDS.find(r => r.xpThreshold > currentXP) || null;
}

export function getPreviousRewardXP(currentXP: number): number {
  const reversed = [...REWARDS].reverse();
  const prev = reversed.find(r => r.xpThreshold <= currentXP);
  return prev ? prev.xpThreshold : 0;
}

export function getRewardProgress(currentXP: number): number {
  const nextReward = getNextReward(currentXP);
  if (!nextReward) return 1; // Maxed out

  const prevXP = getPreviousRewardXP(currentXP);
  const totalNeeded = nextReward.xpThreshold - prevXP;
  const currentProgress = currentXP - prevXP;

  return Math.min(1, Math.max(0, currentProgress / totalNeeded));
}
