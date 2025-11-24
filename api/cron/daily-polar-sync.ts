import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dataConfig from './polar-data-config.json';

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

// Initialize Firebase Admin (for server-side)
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminDb = getFirestore();

/**
 * Filter object to only include specified fields from config
 */
function filterFields(data: any, fields: string[]): any {
  if (!data || typeof data !== 'object') return data;
  
  const filtered: any = {};
  for (const field of fields) {
    if (field in data) {
      filtered[field] = data[field];
    }
  }
  return filtered;
}

// In a production environment, you'd fetch this from a database
// For now, we'll use environment variables or a simple storage mechanism
interface UserToken {
  userId: string;
  accessToken: string;
  polarUserId?: string;
}

/**
 * Daily cron job to poll Polar API for new user data
 * Runs at 23:00 UTC daily
 * 
 * This endpoint fetches for each user:
 * - Daily activities (steps, calories, active duration, distance)
 * - Sleep data (sleep stages, duration, quality scores)
 * - Nightly recharge (ANS charge, sleep charge)
 * - Continuous heart rate throughout the day
 * - Cardio load (4-day trend data)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron job request from Vercel
  const authHeader = req.headers.authorization;
  
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕐 Daily Polar sync started at', new Date().toISOString());

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Get all users with Polar tokens
    const users = await getUsersWithPolarTokens();
    
    if (users.length === 0) {
      console.log('No users with Polar tokens found');
      return res.status(200).json({ 
        message: 'No users to sync',
        date: today,
      });
    }

    const results = {
      total: users.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      synced: [] as any[],
    };

    // Process each user
    for (const user of users) {
      try {
        console.log(`📊 Syncing data for user ${user.userId}`);
        
        const userData = await fetchUserDailyData(user.accessToken, today);
        
        // Process and store the data (you'll implement this based on your needs)
        await processUserData(user.userId, today, userData);
        
        results.successful++;
        results.synced.push({
          userId: user.userId,
          date: today,
          hasActivities: !!userData.activities,
          hasSleep: !!userData.sleep,
          hasNightlyRecharge: !!userData.nightlyRecharge,
          hasContinuousHeartRate: !!userData.continuousHeartRate,
          hasCardioLoad: !!userData.cardioLoad,
          exerciseCount: userData.exercises?.length || 0,
        });
        
        console.log(`✅ Successfully synced user ${user.userId}`);
      } catch (error: any) {
        console.error(`❌ Error syncing user ${user.userId}:`, error.message);
        results.failed++;
        results.errors.push({
          userId: user.userId,
          error: error.message,
          status: error.response?.status,
        });
      }
    }

    console.log('🎉 Daily Polar sync completed:', results);
    
    return res.status(200).json({
      message: 'Sync completed',
      date: today,
      results,
    });

  } catch (error: any) {
    console.error('💥 Fatal error in daily sync:', error);
    return res.status(500).json({ 
      error: 'Sync failed',
      message: error.message,
    });
  }
}

/**
 * Fetch daily data from Polar API for a specific user
 */
async function fetchUserDailyData(accessToken: string, date: string) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const result: any = { date, exercises: [] };

  // Fetch daily activities (steps, calories, etc.)
  try {
    const activitiesResponse = await axios.get(
      `${POLAR_BASE_URL}/users/activities/${date}`,
      { headers }
    );
    result.activities = filterFields(activitiesResponse.data, dataConfig.activities);
    console.log(`  ✓ Activities fetched`);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Activities error:`, error.message);
      result.activitiesError = error.message;
    } else {
      console.log(`  - No activities for ${date}`);
    }
  }

  // Fetch sleep data for the specific date
  try {
    const sleepResponse = await axios.get(
      `${POLAR_BASE_URL}/users/sleep/${date}`,
      { headers }
    );
    result.sleep = filterFields(sleepResponse.data, dataConfig.sleep);
    console.log(`  ✓ Sleep data fetched`);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Sleep error:`, error.message);
      result.sleepError = error.message;
    } else {
      console.log(`  - No sleep data for ${date}`);
    }
  }

  // Fetch nightly recharge for the specific date
  try {
    const rechargeResponse = await axios.get(
      `${POLAR_BASE_URL}/users/nightly-recharge/${date}`,
      { headers }
    );
    result.nightlyRecharge = filterFields(rechargeResponse.data, dataConfig.nightlyRecharge);
    console.log(`  ✓ Nightly recharge fetched`);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Nightly recharge error:`, error.message);
      result.nightlyRechargeError = error.message;
    } else {
      console.log(`  - No nightly recharge for ${date}`);
    }
  }

  // Fetch continuous heart rate for the specific date
  try {
    const heartRateResponse = await axios.get(
      `${POLAR_BASE_URL}/users/continuous-heart-rate/${date}`,
      { headers }
    );
    result.continuousHeartRate = filterFields(heartRateResponse.data, dataConfig.continuousHeartRate);
    console.log(`  ✓ Continuous heart rate fetched`);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Continuous heart rate error:`, error.message);
      result.continuousHeartRateError = error.message;
    } else {
      console.log(`  - No continuous heart rate for ${date}`);
    }
  }

  // Fetch cardio load (last 1 day only)
  try {
    const cardioLoadResponse = await axios.get(
      `${POLAR_BASE_URL}/users/cardio-load/period/days/1`,
      { headers }
    );
    // Filter fields for each item in the array
    result.cardioLoad = cardioLoadResponse.data.map((item: any) => 
      filterFields(item, dataConfig.cardioLoad)
    );
    console.log(`  ✓ Cardio load fetched`);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Cardio load error:`, error.message);
      result.cardioLoadError = error.message;
    } else {
      console.log(`  - No cardio load data`);
    }
  }

  // Fetch exercises/workouts uploaded today (within past 24h)
  try {
    // Step 1: List all available exercises
    const exercisesListResponse = await axios.get(
      `${POLAR_BASE_URL}/exercises`,
      { headers }
    );
    
    const exercises = exercisesListResponse.data || [];
    console.log(`  ℹ️  Found ${exercises.length} total exercises`);
    
    // Step 2: Filter exercises uploaded today (upload_time matches today's date)
    const todayExercises = exercises.filter((ex: any) => {
      // Check if exercise upload_time is today
      const uploadDate = ex.upload_time?.split('T')[0];
      return uploadDate === date;
    });
    
    console.log(`  ℹ️  Found ${todayExercises.length} exercises uploaded on ${date}`);
    
    // Step 3: Fetch detailed data for each exercise (with samples)
    for (const exercise of todayExercises) {
      try {
        const exerciseId = exercise.id;
        
        // Fetch exercise with samples (heart rate, speed, etc.)
        const exerciseDetailsResponse = await axios.get(
          `${POLAR_BASE_URL}/exercises/${exerciseId}?samples=true`,
          { headers }
        );
        
        // Filter to only include configured fields
        const filteredExercise = filterFields(exerciseDetailsResponse.data, dataConfig.exercises);
        result.exercises.push(filteredExercise);
        console.log(`  ✓ Exercise ${exerciseId} fetched with samples`);
      } catch (error: any) {
        console.error(`  ✗ Error fetching exercise ${exercise.id}:`, error.message);
        result.exerciseErrors = result.exerciseErrors || [];
        result.exerciseErrors.push({
          exerciseId: exercise.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Exercises error:`, error.message);
      result.exercisesError = error.message;
    } else {
      console.log(`  - No exercises available`);
    }
  }

  return result;
}

/**
 * Get all users who have connected their Polar accounts
 */
async function getUsersWithPolarTokens(): Promise<UserToken[]> {
  try {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef
      .where('polarAccessToken', '!=', null)
      .get();

    if (snapshot.empty) {
      console.log('No users with Polar tokens found');
      return [];
    }

    const users: UserToken[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.polarAccessToken) {
        users.push({
          userId: doc.id,
          accessToken: data.polarAccessToken,
          polarUserId: data.polarUserId,
        });
      }
    });

    console.log(`Found ${users.length} user(s) with Polar tokens`);
    return users;
  } catch (error: any) {
    console.error('Error fetching users with Polar tokens:', error.message);
    return [];
  }
}

/**
 * Process and store the fetched user data in Firebase
 * 
 * Structure:
 * users/{userId}/polarData/
 *   - activities/{date}
 *   - sleep/{date}
 *   - nightlyRecharge/{date}
 *   - continuousHeartRate/{date}
 *   - cardioLoad/{date}
 *   - exercises/{exerciseId}
 */
async function processUserData(userId: string, date: string, data: any) {
  try {
    const batch = adminDb.batch();
    const userPolarRef = adminDb.collection('users').doc(userId).collection('polarData');

    // Store daily activities
    if (data.activities) {
      const activitiesRef = userPolarRef.doc('activities').collection('daily').doc(date);
      batch.set(activitiesRef, {
        ...data.activities,
        syncedAt: new Date().toISOString(),
      });
      console.log(`  📊 Activities queued for storage`);
    }

    // Store sleep data
    if (data.sleep) {
      const sleepRef = userPolarRef.doc('sleep').collection('daily').doc(date);
      batch.set(sleepRef, {
        ...data.sleep,
        syncedAt: new Date().toISOString(),
      });
      console.log(`  😴 Sleep data queued for storage`);
    }

    // Store nightly recharge
    if (data.nightlyRecharge) {
      const rechargeRef = userPolarRef.doc('nightlyRecharge').collection('daily').doc(date);
      batch.set(rechargeRef, {
        ...data.nightlyRecharge,
        syncedAt: new Date().toISOString(),
      });
      console.log(`  ⚡ Nightly recharge queued for storage`);
    }

    // Store continuous heart rate
    if (data.continuousHeartRate) {
      const heartRateRef = userPolarRef.doc('continuousHeartRate').collection('daily').doc(date);
      batch.set(heartRateRef, {
        ...data.continuousHeartRate,
        syncedAt: new Date().toISOString(),
      });
      console.log(`  ❤️  Continuous heart rate queued for storage`);
    }

    // Store cardio load
    if (data.cardioLoad && data.cardioLoad.length > 0) {
      const cardioLoadRef = userPolarRef.doc('cardioLoad').collection('daily').doc(date);
      batch.set(cardioLoadRef, {
        data: data.cardioLoad[0], // First item is today's data
        syncedAt: new Date().toISOString(),
      });
      console.log(`  💪 Cardio load queued for storage`);
    }

    // Store exercises
    if (data.exercises && data.exercises.length > 0) {
      for (const exercise of data.exercises) {
        // Extract exercise ID from the exercise data or generate one
        const exerciseId = exercise.id || `${userId}_${date}_${Date.now()}`;
        const exerciseRef = userPolarRef.doc('exercises').collection('all').doc(exerciseId);
        batch.set(exerciseRef, {
          ...exercise,
          date,
          syncedAt: new Date().toISOString(),
        });
      }
      console.log(`  🏃 ${data.exercises.length} exercise(s) queued for storage`);
    }

    // Commit all writes at once
    await batch.commit();
    console.log(`  ✅ All data successfully stored for user ${userId}`);

  } catch (error: any) {
    console.error(`  ❌ Error storing data for user ${userId}:`, error.message);
    throw error;
  }
}
