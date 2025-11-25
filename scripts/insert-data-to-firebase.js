// Insert sample data from /sampleJson/insertdata into Firestore for a test user
require('dotenv').config({ path: '.env.local' });
console.log('PRIVATE_KEY loaded?', !!process.env.FIREBASE_PRIVATE_KEY);
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load credentials from environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const userId = 'testUser123'; // Change as needed
const date = '2025-11-24'; // Change as needed
const baseDir = path.join(__dirname, '../sampleJson/insertdata');

async function insert() {
  const batch = db.batch();
  const userPolarRef = db.collection('users').doc(userId).collection('polarData');

  // Activities
  const activitiesPath = path.join(baseDir, 'activities.json');
  if (fs.existsSync(activitiesPath)) {
    const activities = JSON.parse(fs.readFileSync(activitiesPath, 'utf8'));
    const ref = userPolarRef.doc('activities').collection('all').doc(date);
    batch.set(ref, { ...activities, syncedAt: new Date().toISOString() });
    console.log('Queued activities');
  }

  // Sleep
  const sleepPath = path.join(baseDir, 'sleep.json');
  if (fs.existsSync(sleepPath)) {
    const sleep = JSON.parse(fs.readFileSync(sleepPath, 'utf8'));
    const ref = userPolarRef.doc('sleep').collection('all').doc(date);
    batch.set(ref, { ...sleep, syncedAt: new Date().toISOString() });
    console.log('Queued sleep');
  }

  // Nightly Recharge
  const rechargePath = path.join(baseDir, 'nightlyRecharge.json');
  if (fs.existsSync(rechargePath)) {
    const recharge = JSON.parse(fs.readFileSync(rechargePath, 'utf8'));
    const ref = userPolarRef.doc('nightlyRecharge').collection('all').doc(date);
    batch.set(ref, { ...recharge, syncedAt: new Date().toISOString() });
    console.log('Queued nightly recharge');
  }

  // Continuous Heart Rate
  const hrPath = path.join(baseDir, 'continuousHeartRate.json');
  if (fs.existsSync(hrPath)) {
    const hr = JSON.parse(fs.readFileSync(hrPath, 'utf8'));
    const ref = userPolarRef.doc('continuousHeartRate').collection('all').doc(date);
    batch.set(ref, { ...hr, syncedAt: new Date().toISOString() });
    console.log('Queued continuous heart rate');
  }

  // Cardio Load
  const cardioPath = path.join(baseDir, 'cardioLoad.json');
  if (fs.existsSync(cardioPath)) {
    const cardio = JSON.parse(fs.readFileSync(cardioPath, 'utf8'));
    const ref = userPolarRef.doc('cardioLoad').collection('all').doc(date);
    batch.set(ref, { data: cardio[0], syncedAt: new Date().toISOString() });
    console.log('Queued cardio load');
  }

  // Exercises
  const exercisesPath = path.join(baseDir, 'exercises.json');
  if (fs.existsSync(exercisesPath)) {
    const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));
    const ref = userPolarRef.doc('exercises').collection('all').doc(date);
    batch.set(ref, { 
      date,
      exercises: exercises,
      count: exercises.length,
      syncedAt: new Date().toISOString() 
    });
    console.log('Queued', exercises.length, 'exercises');
  }

  await batch.commit();
  console.log('✅ All sample data inserted for user', userId);
}

insert().catch(e => {
  console.error('❌ Error inserting sample data:', e);
  process.exit(1);
});
