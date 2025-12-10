import rewardsData from '../../data/rewards.json';

export interface Reward {
  id: string;
  name: string;
  xpThreshold: number;
}

export const MAX_XP = 20000;

export const REWARDS: Reward[] = rewardsData.map(r => ({
  id: r.id,
  name: r.name,
  xpThreshold: r.xp
}));

export function getNextReward(currentXP: number): Reward | null {
  return REWARDS.find(r => r.xpThreshold > currentXP) || null;
}

export function getPreviousRewardXP(currentXP: number): number {
  const reversed = [...REWARDS].reverse();
  const prev = reversed.find(r => r.xpThreshold <= currentXP);
  return prev ? prev.xpThreshold : 0;
}

export function getRewardProgress(currentXP: number): number {
  return Math.min(1, Math.max(0, currentXP / MAX_XP));
}
