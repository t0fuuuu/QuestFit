# QuestFit System Architecture

## Overview
QuestFit is a gamified fitness application built with React Native and Expo, combining real-time workout tracking with RPG-style progression mechanics. The system integrates with Polar devices for fitness tracking and uses Firebase for backend services.

## Technology Stack
- **Frontend**: React Native 0.81.5, Expo 54, Expo Router 6
- **Backend**: Firebase (Firestore, Authentication)
- **APIs**: Vercel Serverless Functions
- **Device Integration**: Polar Bluetooth API, react-native-ble-plx
- **State Management**: React Hooks, Firebase Real-time Listeners
- **Language**: TypeScript 5.9

---

# Core Architecture: Creature Unlock & XP Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER COMPLETES WORKOUT                       │
│              (Live Workout, Multi-Device, or Polar Sync)            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKOUT COMPLETION SERVICE                       │
│  src/services/workoutCompletionService.ts                           │
├─────────────────────────────────────────────────────────────────────┤
│  1. Parse workout metrics (calories, duration, HR, distance)        │
│  2. Calculate base XP using WorkoutProcessor                        │
│  3. Check for creature unlocks using CreatureService                │
│  4. Calculate bonus XP from unlocked creatures                      │
│  5. Calculate total XP and new level                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────┴───────────────────────┐
        │                                                │
        ▼                                                ▼
┌──────────────────────┐                    ┌───────────────────────┐
│  WORKOUT PROCESSOR   │                    │  CREATURE SERVICE     │
│  workoutProcessor.ts │                    │  creatureService.ts   │
├──────────────────────┤                    ├───────────────────────┤
│  Calculate XP:       │                    │  Load creatures.json  │
│  • Calories × 0.1    │                    │  Check requirements:  │
│  • Distance × 5      │                    │  • Min calories       │
│  • Duration × 0.5    │                    │  • Min duration       │
│  • HR bonus +10      │                    │  • Min distance       │
│                      │                    │  • Min heart rate     │
│  Returns: Base XP    │                    │  • Sport type         │
└──────────────────────┘                    │                       │
                                            │  Returns: Unlocked    │
                                            │  creatures + Bonus XP │
                                            └───────────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FIREBASE UPDATE                             │
│                     (Automatic & Real-time)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  users/{userId}                      workoutSessions/{sessionId}    │
│  ├─ xp += totalXP                    ├─ userId                      │
│  ├─ level (recalculated)             ├─ metrics                     │
│  ├─ totalWorkouts += 1               ├─ gameRewards                 │
│  ├─ totalCalories += calories        │   ├─ experienceGained        │
│  ├─ capturedCreatures.push(...)      │   └─ creaturesFound          │
│  └─ workoutHistory.push({...})       └─ timestamps                  │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────┴────────────────────────┐
        │                                                │
        ▼                                                ▼
┌──────────────────────┐                    ┌───────────────────────┐
│   CREATURE UNLOCK    │                    │     XP TAB UPDATE     │
│       MODAL          │                    │                       │
├──────────────────────┤                    ├───────────────────────┤
│  IF creatures > 0:   │                    │  • Show new XP total  │
│  • Show celebration  │                    │  • Update level       │
│  • Display creatures │                    │  • Add to history     │
│  • Show stats        │                    │  • Show stats         │
│  • Rarity colors     │                    │  • Progress to next   │
└──────────────────────┘                    └───────────────────────┘
```

---

## Data Flow Example

### Scenario: User completes a 30-minute run

```
INPUT:
┌─────────────────────────┐
│ Workout Metrics:        │
│ • Calories: 350         │
│ • Duration: 30 min      │
│ • Distance: 5.2 km      │
│ • Avg HR: 148 bpm       │
│ • Sport: RUNNING        │
└─────────────────────────┘
            │
            ▼
PROCESSING:
┌─────────────────────────┐
│ XP Calculation:         │
│ • 350 × 0.1 = 35 pts    │
│ • 5.2 × 5 = 26 pts      │
│ • 30 × 0.5 = 15 pts     │
│ • HR bonus = 10 pts     │
│ ───────────────────     │
│ Base XP = 86 XP         │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Creature Check:         │
│ Wind Falcon (300 cal,   │
│ 8km) - ❌ Distance too  │
│ short                   │
│                         │
│ Thunder Wolf (400 cal,  │
│ 5km) - ❌ Calories too  │
│ low                     │
│                         │
│ Shadow Panther (450 cal,│
│ 6km, 35min) - ❌ All    │
│ requirements not met    │
│                         │
│ No creatures unlocked   │
└─────────────────────────┘
            │
            ▼
OUTPUT:
┌─────────────────────────┐
│ Result:                 │
│ • Base XP: 86           │
│ • Bonus XP: 0           │
│ • Total XP: 86          │
│ • Creatures: 0          │
│ • Level: (updated)      │
└─────────────────────────┘
```

---

## Component Interaction

### Main App Screens

```
app/(tabs)/Home.tsx (Main Dashboard)
    │
    ├─► useAuth() - Authentication state
    ├─► useGameProfile() - User stats and progress
    └─► Display overview and quick actions

app/(tabs)/workout.tsx (Live Workout Tracking)
    │
    │ User clicks "End Workout"
    │
    ├─► useLiveWorkout()
    │       └─► Returns workout metrics
    │
    ├─► useMultiDeviceWorkout() [NEW]
    │       └─► Tracks multiple Polar devices simultaneously
    │
    ├─► workoutCompletionService.completeLiveWorkout()
    │       │
    │       ├─► WorkoutProcessor.calculateExperience()
    │       ├─► creatureService.checkWorkoutForUnlocks()
    │       ├─► gameService.saveWorkoutSession()
    │       └─► Firebase updates
    │
    ├─► IF creatures unlocked:
    │       └─► Show CreatureUnlockModal
    │
    └─► Display workout summary

app/(tabs)/creatures.tsx (Creature Collection)
    │
    ├─► useAuth() - Get current user
    │
    ├─► useGameProfile(userId)
    │       └─► Load captured creatures
    │
    ├─► creatureService.getAllCreatures()
    │       └─► Load all available creatures
    │
    └─► Display creatures with captured status
            ├─► Show unlock requirements
            └─► Highlight captured ones

app/(tabs)/me.tsx (Profile & Stats)
    │
    ├─► useAuth() - Get current user
    │
    ├─► Firebase getDoc('users/{userId}')
    │       └─► Load XP, level, workoutHistory
    │
    ├─► Display current stats
    │       ├─► Level & XP
    │       ├─► Progress to next level
    │       ├─► Total workouts/calories
    │       └─► Recent workout history
    │
    └─► Auto-refreshes when Firebase updates

app/(tabs)/instr-dashboard.tsx (Instructor Dashboard)
    │
    ├─► useAuth() - Check instructor role
    ├─► useMultiDeviceWorkout()
    │       └─► Monitor multiple participants
    └─► Display real-time group metrics
```

---

## State Management

```
┌────────────────────────────────────────────────┐
│              FIREBASE (Source of Truth)        │
├────────────────────────────────────────────────┤
│  • User XP & Level                             │
│  • Captured Creatures                          │
│  • Workout History                             │
│  • Total Stats                                 │
└──────────────────┬─────────────────────────────┘
                   │
                   │ Real-time sync
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│  useGameProfile│    │   XP Tab     │
│  Hook          │    │   Component  │
├───────────────┤    ├───────────────┤
│  • Loads data │    │  • Displays  │
│  • Caches     │    │    current   │
│  • Updates    │    │    state     │
│  • Refreshes  │    │  • Auto-     │
│               │    │    updates   │
└───────────────┘    └───────────────┘
```

---

## File Dependencies

```
data/creatures.json & data/creatures.csv
    ↓ loaded by
src/services/creatureService.ts
    ↓ used by
src/services/workoutCompletionService.ts
    ↓ used by
app/(tabs)/workout.tsx
    ↓ displays
components/game/CreatureUnlockModal.tsx


src/types/polar.ts
    ↓ defines types for
src/utils/workoutProcessor.ts & src/utils/polarIntegration.ts
    ↓ used by
src/services/workoutCompletionService.ts


src/services/bluetoothService.ts
    ↓ provides BLE connection to
src/hooks/useLiveWorkout.ts & src/hooks/useMultiDeviceWorkout.ts
    ↓ used by
app/(tabs)/workout.tsx & app/(tabs)/instr-dashboard.tsx


src/services/firebase.ts
    ↓ provides db connection to
src/services/gameService.ts & src/hooks/useAuth.ts
    ↓ used by
src/hooks/useGameProfile.ts
    ↓ used by
app/(tabs)/me.tsx
app/(tabs)/creatures.tsx
app/(tabs)/Home.tsx


api/polar/*.ts (Vercel Serverless Functions)
    ├─ register-user.ts → Polar OAuth registration
    ├─ webhook.ts → Receives workout sync from Polar
    ├─ user-data.ts → Fetches user data from Polar
    ├─ create-webhook.ts → Sets up Polar webhooks
    ├─ delete-webhook.ts → Removes Polar webhooks
    └─ disconnect-user.ts → Disconnects Polar account
    
api/cron/daily-polar-sync.ts
    ↓ scheduled sync
    └─ Fetches daily workout data from Polar API
```

---

## Key Decision Points

```
User Completes Workout
    │
    ├─► Is user authenticated?
    │   ├─ Yes → Process workout
    │   └─ No → Show "Sign in to earn rewards"
    │
    ├─► Calculate XP
    │   └─► Always award based on performance
    │
    ├─► Check creature unlocks
    │   ├─ Requirements met? → Unlock + Bonus XP
    │   └─ Not met? → Continue with base XP
    │
    ├─► Update Firebase
    │   ├─ Success → Show results
    │   └─ Failure → Show error, retry option
    │
    └─► Display UI
        ├─ Creatures unlocked? → Show modal
        └─ No creatures? → Show summary only
```

---

## Performance Considerations

### Optimizations in Place:
- ✅ Single Firebase write for all user updates
- ✅ Batch creature unlock checks
- ✅ Cached creature data (loaded once from JSON)
- ✅ Limited workout history (last 10 workouts)
- ✅ Efficient XP calculation (simple math)

### Potential Bottlenecks:
- ⚠️ Large number of creatures (currently 10, no issue)
- ⚠️ Frequent Firebase reads (use hooks with caching)
- ⚠️ Complex unlock requirements (keep simple)

---

## Error Handling

```
Workout Completion
    │
    ├─ Try to process
    │   ├─ Success → Continue
    │   └─ Error → Log & show user-friendly message
    │
    ├─ Try to update Firebase
    │   ├─ Success → Continue
    │   └─ Error → Retry or queue for later
    │
    └─ Try to display UI
        ├─ Success → Done!
        └─ Error → Fallback to basic summary
```

**Error Scenarios Handled:**
1. User not authenticated
2. Firebase connection failure
3. Invalid workout data
4. Missing creature configuration
5. XP calculation errors

---

## API Architecture (Vercel Serverless Functions)

```
┌─────────────────────────────────────────────────────────────┐
│                     Polar Cloud API                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                    │
│              (api/polar/*.ts)                               │
├─────────────────────────────────────────────────────────────┤
│  • OAuth Flow (register-user.ts)                            │
│  • Webhook Handler (webhook.ts)                             │
│  • User Data Fetch (user-data.ts)                           │
│  • Webhook Management (create/delete-webhook.ts)            │
│  • Account Disconnect (disconnect-user.ts)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Firebase Firestore                        │
│                 (Data Persistence)                          │
├─────────────────────────────────────────────────────────────┤
│  • Stores Polar access tokens                               │
│  • Saves synced workout data                                │
│  • Links Polar user_id with Firebase uid                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Mobile App (React Native)                      │
│            Displays synced workout data                     │
└─────────────────────────────────────────────────────────────┘
```

### Cron Job Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Vercel Cron Job (api/cron/daily-polar-sync.ts)     │
│                  Runs: Daily at 2 AM UTC                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─► For each user with Polar connected:
                     │   ├─ Fetch workouts from last 24h
                     │   ├─ Process workout data
                     │   ├─ Calculate XP and unlocks
                     │   └─ Update Firebase
                     │
                     └─► Error handling & logging
```

---

## Multi-Device Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Instructor Dashboard (instr-dashboard.tsx)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         useMultiDeviceWorkout Hook                          │
│         (src/hooks/useMultiDeviceWorkout.ts)                │
├─────────────────────────────────────────────────────────────┤
│  • Manages multiple Bluetooth connections                   │
│  • Tracks heart rates from each device                      │
│  • Aggregates real-time metrics                             │
│  • Maintains device state (connected/disconnected)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌────────────────┐      ┌────────────────┐
│  Polar Watch 1 │      │  Polar Watch 2 │
│  (Bluetooth)   │      │  (Bluetooth)   │
└────────────────┘      └────────────────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Real-time Display & Analytics                       │
│  • Individual heart rates                                   │
│  • Group average HR                                         │
│  • Active participants count                                │
│  • Workout duration & calories                              │
└─────────────────────────────────────────────────────────────┘
```

---

This architecture ensures:
- 🔒 Data consistency (Firebase as single source of truth)
- ⚡ Real-time updates (Firebase sync + Bluetooth streaming)
- 🎨 Clean separation of concerns (services, hooks, components)
- 🧪 Easy testing (mock data available)
- 📈 Scalability (modular design + serverless functions)
- 🌐 Web deployment (Vercel integration)
- 👥 Multi-user support (Multi-device tracking)
- 🔄 Background sync (Cron jobs for Polar data)
