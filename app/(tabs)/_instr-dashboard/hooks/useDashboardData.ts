import { useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/src/services/firebase';
import { User, UserOverview } from '../types';

export function useDashboardData(selectedUserIds: string[]) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userOverviews, setUserOverviews] = useState<Map<string, UserOverview>>(new Map());
  const [loadingOverviews, setLoadingOverviews] = useState(false);
  const [sleepScoreData, setSleepScoreData] = useState<Map<string, Array<{date: string, score: number | null}>>>(new Map());
  const [sleepDates, setSleepDates] = useState<string[]>([]);
  const [loadingSleepData, setLoadingSleepData] = useState(false);

  const loadAllUsers = useCallback(async (): Promise<User[]> => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName || doc.id,
        lastSync: doc.data().lastSync,
        email: doc.data().email,
        photoURL: doc.data().photoURL
      }));
      setAllUsers(users);
      return users;
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }, []);

  const loadUserOverviews = useCallback(async (usersList?: User[]) => {
    setLoadingOverviews(true);
    const today = new Date().toISOString().split('T')[0];
    const overviews = new Map<string, UserOverview>();
    const sourceUsers = usersList || allUsers;

    for (const userId of selectedUserIds) {
      try {
        const overview: UserOverview = { userId };
        
        // Get lastSync from sourceUsers if available
        const user = sourceUsers.find(u => u.id === userId);
        if (user?.lastSync) {
          overview.lastSync = user.lastSync;
        } else {
          // Fallback: Query the most recent sync summary
          try {
            const summaryQuery = query(
              collection(db, `users/${userId}/polarData/syncSummary/all`),
              orderBy('syncedAt', 'desc'),
              limit(1)
            );
            const summarySnapshot = await getDocs(summaryQuery);
            if (!summarySnapshot.empty) {
              overview.lastSync = summarySnapshot.docs[0].data().syncedAt;
            }
          } catch (e) {
            console.log(`Error fetching last sync fallback for ${userId}:`, e);
          }
        }

        // Get activity
        const activityDoc = await getDoc(
          doc(db, `users/${userId}/polarData/activities/all/${today}`)
        );
        if (activityDoc.exists()) {
          const data = activityDoc.data();
          overview.todayActivity = {
            steps: data?.steps,
            calories: data?.calories,
            distance: data?.distance_from_steps,
          };
        }

        // Get cardio load
        const cardioDoc = await getDoc(
          doc(db, `users/${userId}/polarData/cardioLoad/all/${today}`)
        );
        if (cardioDoc.exists()) {
          overview.todayCardioLoad = cardioDoc.data()?.data?.cardio_load_ratio;
        }

        // Get sleep
        const sleepDoc = await getDoc(
          doc(db, `users/${userId}/polarData/sleep/all/${today}`)
        );
        if (sleepDoc.exists()) {
          const data = sleepDoc.data();
          
          // Calculate sleep duration from start and end times
          let calculatedDuration = 'N/A';
          let goalDiff = '';
          
          if (data?.sleep_start_time && data?.sleep_end_time) {
            const startTime = new Date(data.sleep_start_time);
            const endTime = new Date(data.sleep_end_time);
            const durationMs = endTime.getTime() - startTime.getTime();
            const durationSeconds = Math.floor(durationMs / 1000);
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            calculatedDuration = `${hours}h ${minutes}m`;
            
            // Calculate difference from sleep goal
            if (data?.sleep_goal) {
              const diffSeconds = durationSeconds - data.sleep_goal;
              const absDiffSeconds = Math.abs(diffSeconds);
              const diffHours = Math.floor(absDiffSeconds / 3600);
              const diffMinutes = Math.floor((absDiffSeconds % 3600) / 60);
              
              if (diffSeconds > 0) {
                // Exceeded goal
                if (diffHours > 0) {
                  goalDiff = `Exceeded by ${diffHours}h ${diffMinutes}m`;
                } else if (diffMinutes > 0) {
                  goalDiff = `Exceeded by ${diffMinutes}m`;
                } else {
                  goalDiff = 'Goal achieved';
                }
              } else if (diffSeconds < 0) {
                // Below goal
                if (diffHours > 0) {
                  goalDiff = `${diffHours}h ${diffMinutes}m to goal`;
                } else if (diffMinutes > 0) {
                  goalDiff = `${diffMinutes}m to goal`;
                } else {
                  goalDiff = 'Goal achieved';
                }
              } else {
                goalDiff = 'Goal achieved';
              }
            }
          }
          
          overview.todaySleep = {
            duration: calculatedDuration,
            quality: data?.sleep_score,
            goalDiff: goalDiff,
          };
        }

        // Get exercises
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed

        const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
        const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const exercisesRef = collection(db, `users/${userId}/polarData/exercises/all`);

        const monthQuery = query(
          exercisesRef,
          where("__name__", ">=", monthStart),
          where("__name__", "<=", monthEnd),
          orderBy("__name__")
        );

        const exercisesSnapshot = await getDocs(monthQuery);

        let totalMonthExercises = 0;
        exercisesSnapshot.forEach(doc => {
          totalMonthExercises += doc.data()?.count || 0;
        });

        overview.totalMonthExercises = totalMonthExercises;

        overviews.set(userId, overview);
      } catch (error) {
        console.error(`Error loading overview for ${userId}:`, error);
      }
    }

    setUserOverviews(overviews);
    setLoadingOverviews(false);
  }, [selectedUserIds, allUsers]);

  const loadSleepScoreData = useCallback(async () => {
    setLoadingSleepData(true);
    const sleepData: Map<string, Array<{date: string, score: number | null}>> = new Map();
    const dates: string[] = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    for (const userId of selectedUserIds) {
      const userScores: Array<{date: string, score: number | null}> = [];
      
      for (const date of dates) {
        try {
          const sleepDoc = await getDoc(
            doc(db, `users/${userId}/polarData/sleep/all/${date}`)
          );
          
          if (sleepDoc.exists()) {
            const score = sleepDoc.data()?.sleep_score;
            userScores.push({ date, score: score || null });
          } else {
            userScores.push({ date, score: null });
          }
        } catch (error) {
          console.error(`Error loading sleep score for ${userId} on ${date}:`, error);
          userScores.push({ date, score: null });
        }
      }
      sleepData.set(userId, userScores);
    }

    setSleepScoreData(sleepData);
    setSleepDates(dates);
    setLoadingSleepData(false);
    
    return { sleepData, dates };
  }, [selectedUserIds]);

  return {
    allUsers,
    userOverviews,
    loadingOverviews,
    sleepScoreData,
    sleepDates,
    loadingSleepData,
    loadAllUsers,
    loadUserOverviews,
    loadSleepScoreData,
  };
}
