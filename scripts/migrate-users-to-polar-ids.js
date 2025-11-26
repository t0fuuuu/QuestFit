const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log('⚠️  Could not load .env.local file.');
}

// Validate required environment variables
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error('❌ Error: Missing required environment variables:');
  missingEnvVars.forEach(key => console.error(`   - ${key}`));
  console.error('\nPlease create a .env.local file in the root directory with these variables.');
  console.error('You can get these from your Firebase Console -> Project Settings -> Service Accounts.');
  process.exit(1);
}

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

/**
 * Recursively copy a document and its subcollections
 */
async function copyDocument(srcRef, destRef) {
  console.log(`    Copying doc ${srcRef.path} -> ${destRef.path}`);
  const doc = await srcRef.get();
  if (!doc.exists) return;

  // Copy document data
  await destRef.set(doc.data());

  // Copy subcollections
  const collections = await srcRef.listCollections();
  for (const collection of collections) {
    const destCollection = destRef.collection(collection.id);
    const documents = await collection.get();
    
    for (const doc of documents.docs) {
      await copyDocument(doc.ref, destCollection.doc(doc.id));
    }
  }
}

/**
 * Recursively delete a document and its subcollections
 */
async function deleteDocument(ref) {
  console.log(`    Deleting doc ${ref.path}`);
  
  // Delete subcollections first
  const collections = await ref.listCollections();
  for (const collection of collections) {
    const documents = await collection.get();
    for (const doc of documents.docs) {
      await deleteDocument(doc.ref);
    }
  }

  // Delete the document itself
  await ref.delete();
}

async function migrateUsers() {
  console.log('🚀 Starting user migration to Polar IDs...');

  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  const migrationMap = new Map(); // oldId -> newId

  // 1. Identify migrations needed
  console.log('\n🔍 Scanning for users to migrate...');
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const oldId = doc.id;
    const newId = data.polarUserId;

    if (!newId) {
      console.log(`  ⚠️  Skipping user ${oldId}: No polarUserId found.`);
      continue;
    }

    if (oldId !== newId.toString()) {
      console.log(`  Found candidate: ${oldId} -> ${newId}`);
      migrationMap.set(oldId, newId.toString());
    }
  }

  if (migrationMap.size === 0) {
    console.log('✅ No users need migration.');
    return;
  }

  console.log(`\n📦 Migrating ${migrationMap.size} users...`);

  // 2. Perform migration
  for (const [oldId, newId] of migrationMap) {
    console.log(`\n🔄 Migrating User: ${oldId} -> ${newId}`);
    
    try {
      const oldUserRef = usersRef.doc(oldId);
      const newUserRef = usersRef.doc(newId);

      // Check if target already exists to avoid accidental overwrite (unless it's a partial migration)
      const newDoc = await newUserRef.get();
      if (newDoc.exists) {
        console.warn(`  ⚠️ Target document ${newId} already exists. Merging/Overwriting...`);
      }

      // Copy User Data & Subcollections
      await copyDocument(oldUserRef, newUserRef);
      console.log('  ✅ Copy complete');

      // Delete Old User Data
      await deleteDocument(oldUserRef);
      console.log('  🗑️  Old data deleted');

      // 3. Check if user is an instructor
      const instructorRef = db.collection('instructors').doc(oldId);
      const instructorDoc = await instructorRef.get();
      
      if (instructorDoc.exists) {
        console.log(`  🎓 Migrating Instructor profile...`);
        const newInstructorRef = db.collection('instructors').doc(newId);
        await copyDocument(instructorRef, newInstructorRef);
        await deleteDocument(instructorRef);
        console.log('  ✅ Instructor profile migrated');
      }
    } catch (error) {
      console.error(`  ❌ Failed to migrate user ${oldId}:`, error);
      // Continue to next user
    }
  }

  // 4. Update references in 'instructors' collections (selectedUsers array)
  console.log('\n🔗 Updating references in instructor lists...');
  const instructorsSnapshot = await db.collection('instructors').get();
  
  for (const doc of instructorsSnapshot.docs) {
    const data = doc.data();
    if (data.selectedUsers && Array.isArray(data.selectedUsers)) {
      let changed = false;
      const newSelectedUsers = data.selectedUsers.map(uid => {
        if (migrationMap.has(uid)) {
          changed = true;
          return migrationMap.get(uid);
        }
        return uid;
      });

      if (changed) {
        console.log(`  Updating instructor ${doc.id}'s student list`);
        await doc.ref.update({ selectedUsers: newSelectedUsers });
      }
    }
  }

  // 5. Update 'workoutSessions' collection
  console.log('\n🏋️  Updating workout sessions...');
  const sessionsRef = db.collection('workoutSessions');
  
  for (const [oldId, newId] of migrationMap) {
    const sessionsSnapshot = await sessionsRef.where('userId', '==', oldId).get();
    
    if (!sessionsSnapshot.empty) {
      console.log(`  Updating ${sessionsSnapshot.size} sessions for user ${oldId} -> ${newId}`);
      const batch = db.batch();
      let count = 0;
      
      for (const doc of sessionsSnapshot.docs) {
        batch.update(doc.ref, { userId: newId });
        count++;
        
        // Commit batch every 500 writes
        if (count >= 400) {
          await batch.commit();
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
    }
  }

  console.log('\n✨ Migration complete!');
}

migrateUsers().catch(console.error);
