import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

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
 * Fetch daily data from Polar API for a specific user
 */
async function fetchUserDailyData(accessToken: string, date: string) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const result: any = { date };

  // Fetch activities
  try {
    const activitiesResponse = await axios.get(
      `${POLAR_BASE_URL}/users/activities/${date}`,
      { headers }
    );
    result.activities = activitiesResponse.data;
    console.log(`  ✓ Activities fetched`);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error(`  ✗ Activities error:`, error.message);
      result.activitiesError = error.message;
    } else {
      console.log(`  - No activities for ${date}`);
    }
  }

  // Fetch nightly recharge
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

  // Fetch detailed exercise data if activities contain exercise references
  if (result.activities?.exercises && Array.isArray(result.activities.exercises)) {
    result.exercises = [];
    for (const exerciseRef of result.activities.exercises) {
      try {
        const exerciseId = typeof exerciseRef === 'string' ? exerciseRef : exerciseRef.id;
        const exerciseResponse = await axios.get(
          `${POLAR_BASE_URL}/exercises/${exerciseId}`,
          { headers }
        );
        result.exercises.push(exerciseResponse.data);
        console.log(`  ✓ Exercise ${exerciseId} fetched`);
      } catch (error: any) {
        console.error(`  ✗ Exercise error:`, error.message);
        result.exerciseErrors = result.exerciseErrors || [];
        result.exerciseErrors.push({
          exerciseId: exerciseRef,
          error: error.message,
        });
      }
    }
  }

  return result;
}

/**
 * Get all users who have connected their Polar accounts
 * TODO: Replace this with your actual database query
 */
async function getUsersWithPolarTokens(): Promise<UserToken[]> {
  // IMPLEMENTATION NEEDED: Query your database (Firebase, etc.) for users with Polar tokens
  // For now, return empty array
  // 
  // Example implementation with Firebase:
  // const snapshot = await getDocs(
  //   query(collection(db, 'users'), where('polarAccessToken', '!=', null))
  // );
  // return snapshot.docs.map(doc => ({
  //   userId: doc.id,
  //   accessToken: doc.data().polarAccessToken,
  //   polarUserId: doc.data().polarUserId,
  // }));
  
  console.log('⚠️  getUsersWithPolarTokens not implemented - returning empty array');
  return [];
}

/**
 * Process and store the fetched user data
 * TODO: Implement based on your storage requirements
 */
async function processUserData(userId: string, date: string, data: any) {
  // IMPLEMENTATION NEEDED: Store the fetched data in your database
  // You might want to:
  // 1. Store activities in a 'dailyActivities' collection
  // 2. Store exercises in a 'workouts' collection
  // 3. Store nightly recharge in a 'sleepData' collection
  // 4. Update user stats/achievements
  // 5. Trigger any game logic (XP, creature unlocks, etc.)
  
  console.log('⚠️  processUserData not implemented - data not stored');
  console.log('  Data summary:', {
    userId,
    date,
    hasActivities: !!data.activities,
    hasNightlyRecharge: !!data.nightlyRecharge,
    exerciseCount: data.exercises?.length || 0,
  });
}
