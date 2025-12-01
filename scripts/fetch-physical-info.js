const axios = require('axios');
const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

async function getPolarCredentials(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error(`User ${userId} not found`);
  }
  const data = userDoc.data();
  if (!data.polarAccessToken || !data.polarUserId) {
    throw new Error(`User ${userId} does not have Polar credentials linked`);
  }
  return {
    accessToken: data.polarAccessToken,
    polarUserId: data.polarUserId
  };
}

async function fetchPhysicalInfo(userId) {
  try {
    console.log(`Fetching physical info for user: ${userId}`);
    const { accessToken, polarUserId } = await getPolarCredentials(userId);

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Step 1: Create Transaction
    console.log('Step 1: Creating transaction...');
    let transactionId;
    let resourceUri;
    
    try {
      const createTransactionResponse = await axios.post(
        `${POLAR_BASE_URL}/users/${polarUserId}/physical-information-transactions`,
        {},
        { headers }
      );
      transactionId = createTransactionResponse.data['transaction-id'];
      resourceUri = createTransactionResponse.data['resource-uri'];
      console.log(`Transaction created. ID: ${transactionId}`);
    } catch (error) {
      if (error.response && error.response.status === 204) {
        console.log('No new physical information available.');
        return;
      }
      throw error;
    }

    // Step 2: List Physical Infos
    console.log('Step 2: Listing physical info resources...');
    const listResponse = await axios.get(resourceUri, { headers });
    const physicalInfos = listResponse.data['physical-informations'];
    console.log(`Found ${physicalInfos.length} physical info entries.`);

    // Step 3: Get Physical Info Data
    console.log('Step 3: Fetching and saving physical info data...');
    for (const infoUrl of physicalInfos) {
      const infoResponse = await axios.get(infoUrl, { headers });
      const infoData = infoResponse.data;
      
      console.log('Physical Info Data:', JSON.stringify(infoData, null, 2));

      // Save to Firebase
      const date = infoData.created; // or another date field if available/preferred
      // Using created date as ID or just pushing to a collection
      // Let's use the transaction ID + index or just auto-id
      // Or maybe store by date?
      // Let's store in a subcollection 'physicalInfo'
      
      await db.collection(`users/${userId}/polarData/physicalInfo/items`).add({
        ...infoData,
        fetchedAt: new Date().toISOString(),
        transactionId: transactionId
      });
      console.log('Saved to Firebase.');
    }

    // Step 4: Commit Transaction
    console.log('Step 4: Committing transaction...');
    await axios.put(
      `${POLAR_BASE_URL}/users/${polarUserId}/physical-information-transactions/${transactionId}`,
      {},
      { headers }
    );
    console.log('Transaction committed successfully.');

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  } finally {
    // Close firebase connection if needed, but usually script ends
    // process.exit(); 
  }
}

// Get userId from command line args
const userId = process.argv[2];
if (!userId) {
  console.error('Please provide a userId. Usage: node scripts/fetch-physical-info.js <userId>');
  process.exit(1);
}

fetchPhysicalInfo(userId).then(() => {
  console.log('Done.');
  process.exit(0);
});
