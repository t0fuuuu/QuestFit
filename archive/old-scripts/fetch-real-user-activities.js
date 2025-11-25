/**
 * Script to fetch activities from Polar API for all users in Firebase
 * and save them to local files in /sampleJson/realData/{userID}/
 * 
 * Note: This script uses Firebase Admin SDK. You need to either:
 * 1. Set environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * 2. Create a firebase-service-account.json file in the project root
 * 3. Provide a userId and access token directly via command line arguments
 * 
 * Usage:
 *   node scripts/fetch-real-user-activities.js [date] [userId] [accessToken]
 * 
 * Examples:
 *   node scripts/fetch-real-user-activities.js
 *   node scripts/fetch-real-user-activities.js 2025-11-20
 *   node scripts/fetch-real-user-activities.js 2025-11-20 user123 abc123token
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

let adminDb = null;
let useFirebase = false;

// Try to initialize Firebase Admin
try {
  const admin = require('firebase-admin');
  
  if (admin.apps.length === 0) {
    // Try to load from environment variables first
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      useFirebase = true;
    } else {
      // Try to load from service account file
      try {
        const serviceAccount = require('../firebase-service-account.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        useFirebase = true;
      } catch (error) {
        console.log('⚠️  Firebase Admin not configured - will use manual user input');
      }
    }
  } else {
    useFirebase = true;
  }
  
  if (useFirebase) {
    adminDb = admin.firestore();
  }
} catch (error) {
  console.log('⚠️  Firebase Admin not available - will use manual user input');
}

/**
 * Get all users who have connected their Polar accounts
 */
async function getUsersWithPolarTokens() {
  try {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef
      .where('polarAccessToken', '!=', null)
      .get();

    if (snapshot.empty) {
      console.log('No users with Polar tokens found');
      return [];
    }

    const users = [];
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
  } catch (error) {
    console.error('Error fetching users with Polar tokens:', error.message);
    return [];
  }
}

/**
 * Fetch activities data from Polar API
 */
async function fetchActivitiesForDate(accessToken, date) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  try {
    const activitiesResponse = await axios.get(
      `${POLAR_BASE_URL}/users/activities/${date}`,
      { headers }
    );
    return activitiesResponse.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  - No activities for ${date}`);
      return null;
    }
    throw error;
  }
}

/**
 * Fetch sleep data from Polar API
 */
async function fetchSleepForDate(accessToken, date) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  try {
    const sleepResponse = await axios.get(
      `${POLAR_BASE_URL}/users/sleep/${date}`,
      { headers }
    );
    return sleepResponse.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  - No sleep data for ${date}`);
      return null;
    }
    throw error;
  }
}

/**
 * Fetch nightly recharge from Polar API
 */
async function fetchNightlyRechargeForDate(accessToken, date) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  try {
    const rechargeResponse = await axios.get(
      `${POLAR_BASE_URL}/users/nightly-recharge/${date}`,
      { headers }
    );
    return rechargeResponse.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  - No nightly recharge for ${date}`);
      return null;
    }
    throw error;
  }
}

/**
 * Fetch continuous heart rate from Polar API
 */
async function fetchContinuousHeartRateForDate(accessToken, date) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  try {
    const heartRateResponse = await axios.get(
      `${POLAR_BASE_URL}/users/continuous-heart-rate/${date}`,
      { headers }
    );
    return heartRateResponse.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  - No continuous heart rate for ${date}`);
      return null;
    }
    throw error;
  }
}

/**
 * Fetch cardio load from Polar API
 */
async function fetchCardioLoad(accessToken, days = 1) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  try {
    const cardioLoadResponse = await axios.get(
      `${POLAR_BASE_URL}/users/cardio-load/period/days/${days}`,
      { headers }
    );
    return cardioLoadResponse.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  - No cardio load data`);
      return null;
    }
    throw error;
  }
}

/**
 * Fetch exercises from Polar API
 */
async function fetchExercises(accessToken, date) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  try {
    // Step 1: List all available exercises
    const exercisesListResponse = await axios.get(
      `${POLAR_BASE_URL}/exercises`,
      { headers }
    );
    
    const exercises = exercisesListResponse.data || [];
    console.log(`  ℹ️  Found ${exercises.length} total exercises`);
    
    // Step 2: Filter exercises uploaded on the specified date
    const todayExercises = exercises.filter((ex) => {
      const uploadDate = ex.upload_time?.split('T')[0];
      return uploadDate === date;
    });
    
    console.log(`  ℹ️  Found ${todayExercises.length} exercises uploaded on ${date}`);
    
    // Step 3: Fetch detailed data for each exercise (with samples)
    const detailedExercises = [];
    for (const exercise of todayExercises) {
      try {
        const exerciseId = exercise.id;
        
        const exerciseDetailsResponse = await axios.get(
          `${POLAR_BASE_URL}/exercises/${exerciseId}?samples=true`,
          { headers }
        );
        
        detailedExercises.push(exerciseDetailsResponse.data);
        console.log(`  ✓ Exercise ${exerciseId} fetched with samples`);
      } catch (error) {
        console.error(`  ✗ Error fetching exercise ${exercise.id}:`, error.message);
      }
    }
    
    return detailedExercises;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  - No exercises available`);
      return [];
    }
    throw error;
  }
}

/**
 * Save data to local file
 */
function saveToFile(userDir, filename, data) {
  const filePath = path.join(userDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  💾 Saved to ${filename}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting to fetch real user activities from Polar API...\n');
  
  // Get today's date or use provided date
  const date = process.argv[2] || new Date().toISOString().split('T')[0];
  console.log(`📅 Fetching data for date: ${date}\n`);
  
  // Get all users with Polar tokens
  const users = await getUsersWithPolarTokens();
  
  if (users.length === 0) {
    console.log('❌ No users with Polar tokens found');
    process.exit(1);
  }
  
  const baseDir = path.join(__dirname, '..', 'sampleJson', 'realData');
  
  // Ensure base directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  // Process each user
  for (const user of users) {
    console.log(`\n📊 Processing user: ${user.userId}`);
    console.log(`${'='.repeat(60)}`);
    
    // Create user directory
    const userDir = path.join(baseDir, user.userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    try {
      // Fetch all data types
      console.log('\n🔄 Fetching activities...');
      const activities = await fetchActivitiesForDate(user.accessToken, date);
      if (activities) {
        saveToFile(userDir, `activities_${date}.json`, activities);
      }
      
      console.log('\n🔄 Fetching sleep data...');
      const sleep = await fetchSleepForDate(user.accessToken, date);
      if (sleep) {
        saveToFile(userDir, `sleep_${date}.json`, sleep);
      }
      
      console.log('\n🔄 Fetching nightly recharge...');
      const nightlyRecharge = await fetchNightlyRechargeForDate(user.accessToken, date);
      if (nightlyRecharge) {
        saveToFile(userDir, `nightlyRecharge_${date}.json`, nightlyRecharge);
      }
      
      console.log('\n🔄 Fetching continuous heart rate...');
      const continuousHeartRate = await fetchContinuousHeartRateForDate(user.accessToken, date);
      if (continuousHeartRate) {
        saveToFile(userDir, `continuousHeartRate_${date}.json`, continuousHeartRate);
      }
      
      console.log('\n🔄 Fetching cardio load...');
      const cardioLoad = await fetchCardioLoad(user.accessToken, 1);
      if (cardioLoad) {
        saveToFile(userDir, `cardioLoad_${date}.json`, cardioLoad);
      }
      
      console.log('\n🔄 Fetching exercises...');
      const exercises = await fetchExercises(user.accessToken, date);
      if (exercises.length > 0) {
        saveToFile(userDir, `exercises_${date}.json`, exercises);
      }
      
      // Save a summary file
      const summary = {
        userId: user.userId,
        date: date,
        fetchedAt: new Date().toISOString(),
        dataTypes: {
          activities: !!activities,
          sleep: !!sleep,
          nightlyRecharge: !!nightlyRecharge,
          continuousHeartRate: !!continuousHeartRate,
          cardioLoad: !!cardioLoad,
          exercises: exercises.length,
        }
      };
      saveToFile(userDir, `summary_${date}.json`, summary);
      
      console.log(`\n✅ Successfully processed user ${user.userId}`);
      
    } catch (error) {
      console.error(`\n❌ Error processing user ${user.userId}:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 All users processed!');
  console.log(`📁 Data saved to: ${baseDir}`);
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
