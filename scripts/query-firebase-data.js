/**
 * Query Firebase to see what data was synced
 * Shows the actual data stored in Firebase for all users
 */

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function main() {
  const userId = process.argv[2];
  const date = process.argv[3] || new Date().toISOString().split('T')[0];
  
  if (userId) {
    // Show data for specific user
    await showUserData(userId, date);
  } else {
    // Show summaries for all users
    await showAllUserSummaries(date);
  }
}

async function showAllUserSummaries(date) {
  console.log(`\n📊 Sync Summaries for ${date}`);
  console.log('='.repeat(60));
  
  const usersSnapshot = await db.collection('users').get();
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const summaryDoc = await db
      .collection('users')
      .doc(userId)
      .collection('polarData')
      .doc('syncSummary')
      .collection('all')
      .doc(date)
      .get();
    
    if (summaryDoc.exists) {
      const summary = summaryDoc.data();
      console.log(`\n✅ ${userId}`);
      console.log(`   Synced at: ${summary.syncedAt}`);
      console.log(`   Data types:`);
      for (const [key, value] of Object.entries(summary.dataTypes)) {
        if (value) {
          console.log(`     ✓ ${key}: ${typeof value === 'boolean' ? 'Yes' : value}`);
        }
      }
      if (summary.errors && summary.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${summary.errors.length}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

async function showUserData(userId, date) {
  console.log(`\n📊 Data for ${userId} on ${date}`);
  console.log('='.repeat(60));
  
  const polarDataRef = db.collection('users').doc(userId).collection('polarData');
  
  // Check summary first
  const summaryDoc = await polarDataRef
    .doc('syncSummary')
    .collection('all')
    .doc(date)
    .get();
  
  if (summaryDoc.exists) {
    console.log('\n📋 Summary:');
    console.log(JSON.stringify(summaryDoc.data(), null, 2));
  }
  
  // Check activities
  const activitiesDoc = await polarDataRef
    .doc('activities')
    .collection('all')
    .doc(date)
    .get();
  
  if (activitiesDoc.exists) {
    console.log('\n📊 Activities:');
    const data = activitiesDoc.data();
    console.log(`   Steps: ${data.steps}`);
    console.log(`   Calories: ${data.calories}`);
    console.log(`   Active duration: ${data.active_duration}`);
  }
  
  // Check exercises
  const exercisesDoc = await polarDataRef
    .doc('exercises')
    .collection('all')
    .doc(date)
    .get();
  
  if (exercisesDoc.exists) {
    const data = exercisesDoc.data();
    console.log(`\n🏃 Exercises (${data.count || data.exercises?.length || 0}):`);
    if (data.exercises) {
      data.exercises.forEach(ex => {
        console.log(`   ${ex.id}: ${ex.sport || 'Unknown'} - ${ex.duration}`);
      });
    }
  }
  
  // Check sleep
  const sleepDoc = await polarDataRef
    .doc('sleep')
    .collection('all')
    .doc(date)
    .get();
  
  if (sleepDoc.exists) {
    console.log('\n😴 Sleep:');
    const data = sleepDoc.data();
    console.log(`   Sleep time: ${data.sleep_time || data.date}`);
  }
  
  console.log('\n' + '='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
