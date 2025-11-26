const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  // Check for required env vars
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('❌ Error: Missing Firebase credentials in .env.local');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

/**
 * Calculate age from birthdate string (YYYY-MM-DD)
 */
function calculateAge(birthdate) {
  if (!birthdate) return null;
  
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Fetch user profile data from Polar API
 */
async function fetchPolarUserProfile(accessToken, polarUserId) {
  try {
    const response = await axios.get(`${POLAR_BASE_URL}/users/${polarUserId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`    ❌ Polar API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`    ❌ Network Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Get all users who have connected their Polar accounts
 */
async function getUsersWithPolarTokens() {
  try {
    const usersRef = db.collection('users');
    // We need users that have both token and polarUserId
    const snapshot = await usersRef
      .where('polarAccessToken', '!=', null)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.polarAccessToken && data.polarUserId) {
        users.push({
          id: doc.id, // Firebase Document ID
          ...data
        });
      }
    });

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting user profile update from Polar...');

  const users = await getUsersWithPolarTokens();
  console.log(`Found ${users.length} connected users.`);

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    console.log(`\n👤 Processing user: ${user.displayName || user.id} (Polar ID: ${user.polarUserId})`);

    // 1. Fetch data from Polar
    const polarData = await fetchPolarUserProfile(user.polarAccessToken, user.polarUserId);

    if (!polarData) {
      console.log('    ⚠️  Skipping update due to API error.');
      failCount++;
      continue;
    }

    // 2. Process Data
    const firstName = polarData['first-name'] || '';
    const lastName = polarData['last-name'] || '';
    const displayName = `${firstName} ${lastName}`.trim();
    
    const updates = {
      updatedAt: new Date(), // Timestamp for when we last synced profile
    };

    // Only update fields if they exist in Polar response
    if (displayName) updates.displayName = displayName;
    if (polarData.weight) updates.weight = polarData.weight;
    if (polarData.height) updates.height = polarData.height;
    if (polarData.gender) updates.gender = polarData.gender;
    if (polarData.birthdate) {
      updates.birthdate = polarData.birthdate;
      updates.age = calculateAge(polarData.birthdate);
    }

    // Log what we found
    console.log('    📄 Fetched data:');
    if (displayName) console.log(`       - Name: ${displayName}`);
    if (polarData.weight) console.log(`       - Weight: ${polarData.weight}kg`);
    if (polarData.height) console.log(`       - Height: ${polarData.height}cm`);
    if (polarData.birthdate) console.log(`       - Age: ${updates.age} (${polarData.birthdate})`);

    // 3. Update Firebase
    try {
      await db.collection('users').doc(user.id).update(updates);
      console.log('    ✅ Firebase updated successfully.');
      successCount++;
    } catch (error) {
      console.error('    ❌ Failed to update Firebase:', error.message);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🏁 Update Complete`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

main().catch(console.error);
