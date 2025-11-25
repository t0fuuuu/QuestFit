/**
 * Script to set a user as an instructor in Firebase
 * 
 * Usage: node scripts/set-instructor.js <userId>
 * Example: node scripts/set-instructor.js admin_user
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function setInstructor(userId) {
  if (!userId) {
    console.error('❌ Error: User ID is required');
    console.log('Usage: node scripts/set-instructor.js <userId>');
    process.exit(1);
  }

  try {
    console.log(`\n🔧 Setting ${userId} as instructor...`);

    // Update the user document with isInstructor flag
    await db.collection('users').doc(userId).set(
      {
        isInstructor: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Successfully set ${userId} as instructor!`);
    
    // Verify the change
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      console.log('\n📄 User document:', userDoc.data());
    }

    // Initialize the instructor's selectedUsers collection if needed
    const instructorDoc = await db.collection('instructors').doc(userId).get();
    if (!instructorDoc.exists) {
      await db.collection('instructors').doc(userId).set({
        selectedUsers: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Initialized instructor collection for ${userId}`);
    }

    console.log('\n✅ Setup complete! User can now access the instructor dashboard.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting instructor:', error);
    process.exit(1);
  }
}

// Get userId from command line arguments
const userId = process.argv[2];
setInstructor(userId);
