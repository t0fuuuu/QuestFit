import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as admin from 'firebase-admin';

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get first user with Polar token
    const usersSnapshot = await db.collection('users')
      .where('polarAccessToken', '!=', null)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      return res.status(200).json({ message: 'No users found' });
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const accessToken = userData.polarAccessToken;
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    };

    // Fetch activities for today
    const activitiesResponse = await axios.get(
      `${POLAR_BASE_URL}/users/activities/${today}`,
      { headers }
    );
    
    return res.status(200).json({
      userId: userDoc.id,
      date: today,
      activitiesData: activitiesResponse.data,
      structure: {
        hasExercises: !!activitiesResponse.data?.exercises,
        exercisesType: typeof activitiesResponse.data?.exercises,
        exercisesIsArray: Array.isArray(activitiesResponse.data?.exercises),
        exercisesLength: activitiesResponse.data?.exercises?.length,
      }
    });
    
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
  }
}
