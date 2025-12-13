import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/src/services/firebase';
import type {
  AchievementDefinition,
  AchievementProgress,
  UserAchievementsDoc,
} from '@/src/types/achievements';
import { ACHIEVEMENTS } from '@/src/services/achievements/definitions';

type UserProfileLike = {
  xp?: number;
  totalWorkouts?: number;
  totalCalories?: number;
  totalDistance?: number; // km in existing app
  totalDuration?: number; // seconds in existing app
  streakDays?: number;
};

function nowIso() {
  return new Date().toISOString();
}

function getMetricValue(profile: UserProfileLike, def: AchievementDefinition): number {
  switch (def.metric) {
    case 'totalWorkouts':
      return profile.totalWorkouts ?? 0;
    case 'totalCalories':
      return profile.totalCalories ?? 0;
    case 'totalDistanceKm':
      return profile.totalDistance ?? 0;
    case 'totalDurationMinutes':
      return Math.round((profile.totalDuration ?? 0) / 60);
    case 'xp':
      return profile.xp ?? 0;
    case 'streakDays':
      return profile.streakDays ?? 0;
    default:
      return 0;
  }
}

export async function getUserAchievements(userId: string): Promise<UserAchievementsDoc | null> {
  const ref = doc(db, `users/${userId}/meta/achievements`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserAchievementsDoc;
}

export function computeAchievementsProgress(
  profile: UserProfileLike,
  existing?: UserAchievementsDoc | null
): { definitions: AchievementDefinition[]; progress: Record<string, AchievementProgress> } {
  const progress: Record<string, AchievementProgress> = { ...(existing?.achievements ?? {}) };

  for (const def of ACHIEVEMENTS) {
    const currentValue = getMetricValue(profile, def);
    const prev = progress[def.id];

    const alreadyUnlocked = prev?.unlocked === true;
    const shouldUnlock = currentValue >= def.threshold;

    const unlockedAt = alreadyUnlocked
      ? prev?.unlockedAt
      : shouldUnlock
        ? nowIso()
        : undefined;

    const next: AchievementProgress = {
      achievementId: def.id,
      progress: Math.min(currentValue, def.threshold),
      unlocked: alreadyUnlocked || shouldUnlock,
      ...(unlockedAt ? { unlockedAt } : {}),
    };

    progress[def.id] = next;
  }

  return { definitions: ACHIEVEMENTS, progress };
}

export async function syncUserAchievements(params: {
  userId: string;
  profile: UserProfileLike;
}): Promise<UserAchievementsDoc> {
  const { userId, profile } = params;
  const existing = await getUserAchievements(userId);
  const computed = computeAchievementsProgress(profile, existing);

  const docData: UserAchievementsDoc = {
    userId,
    updatedAt: nowIso(),
    achievements: computed.progress,
  };

  // Avoid excessive writes: only write when achievements actually change.
  // (updatedAt is always new, so compare without it.)
  const existingStr = JSON.stringify(existing?.achievements ?? {});
  const computedStr = JSON.stringify(docData.achievements);
  if (existing && existingStr === computedStr) {
    return { ...existing, updatedAt: existing.updatedAt };
  }

  const ref = doc(db, `users/${userId}/meta/achievements`);
  await setDoc(ref, docData, { merge: true });

  return docData;
}
