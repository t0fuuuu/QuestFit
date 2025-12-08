export interface User {
  id: string;
  displayName: string;
  lastSync?: string;
  email?: string;
  photoURL?: string;
}

export interface ActivityMetrics {
  steps?: number;
  calories?: number;
  distance?: number;
}

export interface SleepMetrics {
  duration?: string;
  quality?: number;
  goalDiff?: string;
}

export interface UserOverview {
  userId: string;
  lastSync?: string;
  todayActivity?: ActivityMetrics;
  todayCardioLoad?: number;
  todaySleep?: SleepMetrics;
  totalMonthExercises?: number;
}

export interface SleepDataPoint {
  date: string;
  score: number | null;
}
