# Firebase Storage Setup for Daily Polar Sync

## Firebase Structure

All Polar data is stored under:
```
users/{userId}/polarData/
```

### Collections:

#### 1. Activities (Daily steps, calories, duration)
```
users/{userId}/polarData/activities/daily/{YYYY-MM-DD}
```

#### 2. Sleep
```
users/{userId}/polarData/sleep/daily/{YYYY-MM-DD}
```

#### 3. Nightly Recharge
```
users/{userId}/polarData/nightlyRecharge/daily/{YYYY-MM-DD}
```

#### 4. Continuous Heart Rate
```
users/{userId}/polarData/continuousHeartRate/daily/{YYYY-MM-DD}
```

#### 5. Cardio Load
```
users/{userId}/polarData/cardioLoad/daily/{YYYY-MM-DD}
```

#### 6. Exercises
```
users/{userId}/polarData/exercises/all/{exerciseId}
```

## Required Environment Variables (Vercel)

Add these to your Vercel project settings:

1. **CRON_SECRET** - Secret token to authenticate cron requests
   ```
   Value: questfit-cron-secret-2024 (or your own secret)
   ```

2. **FIREBASE_PROJECT_ID**
   ```
   Value: questfit-67
   ```

3. **FIREBASE_CLIENT_EMAIL**
   ```
   Value: Get from Firebase Console → Project Settings → Service Accounts
   Example: firebase-adminsdk-xxxxx@questfit-67.iam.gserviceaccount.com
   ```

4. **FIREBASE_PRIVATE_KEY**
   ```
   Value: Get from Firebase Console → Generate new private key
   Note: Keep the quotes and \n characters as-is
   ```

## How to Get Firebase Service Account Credentials

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project (questfit-67)
3. Click gear icon → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate new private key"
6. Download the JSON file
7. Extract the values:
   - `project_id` → FIREBASE_PROJECT_ID
   - `client_email` → FIREBASE_CLIENT_EMAIL
   - `private_key` → FIREBASE_PRIVATE_KEY

## Querying Data in Your App

### Get today's activities:
```typescript
const today = new Date().toISOString().split('T')[0];
const activitiesDoc = await getDoc(
  doc(db, `users/${userId}/polarData/activities/daily/${today}`)
);
```

### Get all exercises:
```typescript
const exercisesSnapshot = await getDocs(
  collection(db, `users/${userId}/polarData/exercises/all`)
);
```

### Get last 7 days of sleep:
```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const sleepSnapshot = await getDocs(
  query(
    collection(db, `users/${userId}/polarData/sleep/daily`),
    orderBy('sleep_start_time', 'desc'),
    limit(7)
  )
);
```

## Data Fields Stored

See `api/cron/polar-data-config.json` for the complete list of fields stored for each data type.
