const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Failed to initialize admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function listUsers() {
  try {
    console.log('Fetching users...');
    const snapshot = await db.collection('users').get();
    console.log(`Found ${snapshot.size} users.`);
    snapshot.forEach(doc => {
      console.log(doc.id, doc.data().displayName);
    });
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}

listUsers();
