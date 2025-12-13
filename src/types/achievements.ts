export type AchievementCategory = 'workout' | 'consistency' | 'sleep' | 'steps' | 'rewards';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string; // Ionicons name
  color: string;
  points: number;

  // How to evaluate progress (simple built-ins for now)
  metric:
    | 'totalWorkouts'
    | 'totalCalories'
    | 'totalDistanceKm'
    | 'totalDurationMinutes'
    | 'xp'
    | 'streakDays';

  threshold: number;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UserAchievementsDoc {
  userId: string;
  updatedAt: string;
  achievements: Record<string, AchievementProgress>;
}
