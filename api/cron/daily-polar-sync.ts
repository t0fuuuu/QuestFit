import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as admin from 'firebase-admin';

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  // Vercel will provide these via environment variables
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

interface UserToken {
  userId: string;
  accessToken: string;
  polarUserId?: string;
}

/**
 * Daily cron job to poll Polar API for new user data
 * Runs at 23:00 UTC daily
 * 
 * This endpoint fetches:
 * - Activities for the current date
 * - Exercise details for any activities found
 * - Nightly recharge data
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
          hasNightlyRecharge: !!userData.nightlyRecharge,
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
 * Fetch new activities from Polar API for a specific user
 */
async function fetchUserDailyData(accessToken: string, date: string) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const result: any = { date, exercises: [] };

  // Fetch activities using transaction-based pull API
  try {
    // Step 1: Create a transaction
    const transactionResponse = await axios.post(
      `${POLAR_BASE_URL}/users/exercise-transactions`,
      {},
      { headers }
    );
    
    const transactionId = transactionResponse.data?.['transaction-id'] || transactionResponse.data?.transaction_id;
    console.log(`  ✓ Created transaction: ${transactionId}`);
    
    if (!transactionId) {
      throw new Error('No transaction ID returned');
    }
    
    // Step 2: List available exercises in the transaction
    const exercisesListResponse = await axios.get(
      `${POLAR_BASE_URL}/users/exercise-transactions/${transactionId}`,
      { headers }
    );
    
    const exerciseUrls = exercisesListResponse.data?.exercises || [];
    console.log(`  ✓ Found ${exerciseUrls.length} exercises in transaction`);
    
    // Step 3: Fetch each exercise's detailed data
    for (const exerciseUrl of exerciseUrls) {
      try {
        const exerciseResponse = await axios.get(exerciseUrl, { headers });
        const exercise = exerciseResponse.data;
        
        // Check if this exercise is from today
        const exerciseDate = exercise['start-time']?.split('T')[0] || exercise.start_time?.split('T')[0];
        if (exerciseDate === date) {
          result.exercises.push(exercise);
          console.log(`  ✓ Exercise ${exercise.id} from ${exerciseDate} fetched`);
        } else {
          console.log(`  ⏭️  Skipping exercise from ${exerciseDate} (not today)`);
        }
      } catch (error: any) {
        console.error(`  ✗ Exercise fetch error:`, error.message);
      }
    }
    
    // Step 4: Commit the transaction
    await axios.delete(
      `${POLAR_BASE_URL}/users/exercise-transactions/${transactionId}`,
      { headers }
    );
    console.log(`  ✓ Transaction ${transactionId} committed`);
    
  } catch (error: any) {
    console.error(`  ✗ Transaction error:`, error.message);
    result.transactionError = error.message;
  }

  // Fetch nightly recharge for the specific date
  try {
    const rechargeResponse = await axios.get(
      `${POLAR_BASE_URL}/users/nightly-recharge/${date}`,
      { headers }
    );
    result.nightlyRecharge = rechargeResponse.data;
    console.log(`  ✓ Nightly recharge fetched`);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Nightly recharge error:`, error.message);
      result.nightlyRechargeError = error.message;
    } else {
      console.log(`  - No nightly recharge for ${date}`);
    }
  }

  return result;
}

/**
 * Get all users who have connected their Polar accounts
 */
async function getUsersWithPolarTokens(): Promise<UserToken[]> {
  try {
    const usersSnapshot = await db.collection('users')
      .where('polarAccessToken', '!=', null)
      .get();
    
    const users: UserToken[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.polarAccessToken) {
        users.push({
          userId: doc.id,
          accessToken: data.polarAccessToken,
          polarUserId: data.polarUserId,
        });
      }
    });
    
    console.log(`📋 Found ${users.length} users with Polar tokens`);
    return users;
  } catch (error: any) {
    console.error('❌ Error fetching users with Polar tokens:', error.message);
    return [];
  }
}

/**
 * Process and store the fetched user data
 */
async function processUserData(userId: string, date: string, data: any) {
  const batch = db.batch();
  let totalXpEarned = 0;
  const unlockedCreatures: string[] = [];
  
  try {
    // 1. Store daily activities if present
    if (data.activities) {
      const activityRef = db.collection('users').doc(userId).collection('dailyActivities').doc(date);
      batch.set(activityRef, {
        date,
        ...data.activities,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  💾 Storing daily activities for ${date}`);
    }
    
    // 2. Store nightly recharge/sleep data if present
    if (data.nightlyRecharge) {
      const sleepRef = db.collection('users').doc(userId).collection('sleepData').doc(date);
      batch.set(sleepRef, {
        date,
        ...data.nightlyRecharge,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  💤 Storing sleep data for ${date}`);
    }
    
    // 3. Process and store each exercise/workout with game logic
    if (data.exercises && Array.isArray(data.exercises)) {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data() || {};
      const currentXp = userData.xp || 0;
      const currentLevel = userData.level || 1;
      const capturedCreatures = userData.capturedCreatures || [];
      
      // Get existing workout IDs to avoid duplicates
      const existingWorkoutsSnapshot = await db.collection('users')
        .doc(userId)
        .collection('workouts')
        .where('date', '==', date)
        .get();
      
      const existingWorkoutIds = new Set(
        existingWorkoutsSnapshot.docs.map(doc => doc.data().id || doc.data().polarId)
      );
      
      console.log(`  📊 Found ${existingWorkoutsSnapshot.size} existing workouts for ${date}`);
      
      for (const exercise of data.exercises) {
        const exerciseId = exercise.id || exercise['polar-id'] || exercise.polarId;
        
        // Skip if we already have this workout
        if (exerciseId && existingWorkoutIds.has(exerciseId)) {
          console.log(`  ⏭️  Skipping duplicate workout ${exerciseId}`);
          continue;
        }
        
        // Store the workout
        const workoutRef = db.collection('users').doc(userId).collection('workouts').doc();
        const workoutData = {
          ...exercise,
          polarId: exerciseId,
          date,
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'polar-cron',
        };
        batch.set(workoutRef, workoutData);
        
        // Calculate XP for this workout
        const xp = calculateWorkoutXP(exercise);
        totalXpEarned += xp;
        
        // Check for creature unlocks
        const newCreatures = await checkCreatureUnlocks(exercise, capturedCreatures);
        unlockedCreatures.push(...newCreatures);
        
        console.log(`  🏋️ New workout ${exerciseId}: ${xp} XP earned`);
      }
      
      // 4. Update user profile with accumulated stats and XP
      const newTotalXp = currentXp + totalXpEarned;
      const newLevel = calculateLevel(newTotalXp);
      const leveledUp = newLevel > currentLevel;
      
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        xp: newTotalXp,
        level: newLevel,
        totalWorkouts: admin.firestore.FieldValue.increment(data.exercises?.length || 0),
        ...(unlockedCreatures.length > 0 && {
          capturedCreatures: admin.firestore.FieldValue.arrayUnion(...unlockedCreatures),
        }),
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`  🎮 User stats updated: ${totalXpEarned} XP earned${leveledUp ? ` (Level ${currentLevel} → ${newLevel}!)` : ''}`);
      if (unlockedCreatures.length > 0) {
        console.log(`  🎉 New creatures unlocked: ${unlockedCreatures.join(', ')}`);
      }
    }
    
    // Commit all changes in a batch
    await batch.commit();
    console.log(`  ✅ All data committed to Firestore`);
    
  } catch (error: any) {
    console.error(`  ❌ Error processing user data:`, error.message);
    throw error;
  }
}

/**
 * Calculate XP earned from a workout using the same formula as the app
 */
function calculateWorkoutXP(exercise: any): number {
  const calories = exercise.calories || 0;
  const durationMinutes = parseDuration(exercise.duration || 'PT0M');
  const avgHeartRate = exercise['heart-rate']?.average || exercise.heartRate?.average || 0;
  
  const caloriePoints = calories * 0.1;
  const durationPoints = durationMinutes * 0.5;
  const heartRateBonus = avgHeartRate > 140 ? 10 : 0;
  
  return Math.floor(caloriePoints + durationPoints + heartRateBonus);
}

/**
 * Calculate user level from total XP using power curve formula
 */
function calculateLevel(xp: number): number {
  if (xp < 100) return 1;
  
  let level = 1;
  while (true) {
    const nextLevelXP = getXPForLevel(level + 1);
    if (xp >= nextLevelXP) {
      level++;
    } else {
      break;
    }
  }
  
  return level;
}

function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let totalXP = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    totalXP += Math.round(80 * Math.pow(lvl, 1.3) + 150);
  }
  
  return totalXP;
}

/**
 * Check if workout unlocks any new creatures
 */
async function checkCreatureUnlocks(exercise: any, alreadyCaptured: string[]): Promise<string[]> {
  try {
    const calories = exercise.calories || 0;
    const durationMinutes = parseDuration(exercise.duration || 'PT0M');
    const distance = exercise.distance || 0;
    const avgHeartRate = exercise['heart-rate']?.average || exercise.heartRate?.average || 0;
    const sport = exercise.sport || 'OTHER';
    
    // Query creatures that aren't captured yet
    const creaturesSnapshot = await db.collection('creatures').get();
    const unlockedIds: string[] = [];
    
    creaturesSnapshot.forEach(doc => {
      const creature = doc.data();
      const creatureId = doc.id;
      
      // Skip if already captured
      if (alreadyCaptured.includes(creatureId)) return;
      
      const req = creature.requiredWorkout || {};
      
      // Check all requirements
      if (req.minCalories && calories < req.minCalories) return;
      if (req.minDistance && distance < req.minDistance) return;
      if (req.minHeartRate && avgHeartRate < req.minHeartRate) return;
      if (req.minDuration && durationMinutes < req.minDuration) return;
      if (req.sport && sport !== req.sport) return;
      
      // All requirements met!
      unlockedIds.push(creatureId);
    });
    
    return unlockedIds;
  } catch (error: any) {
    console.error('  ⚠️  Error checking creature unlocks:', error.message);
    return [];
  }
}

/**
 * Parse ISO 8601 duration to minutes
 */
function parseDuration(isoDuration: string): number {
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  
  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');
  
  return hours * 60 + minutes + Math.floor(seconds / 60);
}
