# Instructor Dashboard

The Instructor Dashboard allows designated users to monitor multiple students' fitness data in real-time.

## Setup

### 1. Create an Instructor User

To grant instructor access to a user, run:

```bash
node scripts/set-instructor.js <userId>
```

Example:
```bash
node scripts/set-instructor.js admin_user
```

This will:
- Set `isInstructor: true` on the user document
- Initialize the instructor's `selectedUsers` collection
- Allow the user to access the Instructor Dashboard tab

### 2. Features

#### User Selection
- Multi-select interface to choose students to monitor
- Search by user ID
- Selected users are persisted in Firebase (`instructors/{instructorId}/selectedUsers`)

#### Overview Dashboard
Shows real-time stats for all selected users:
- **Activity**: Steps, calories, distance
- **Cardio Load**: Daily cardio load ratio
- **Sleep**: Duration and quality score
- **Exercises**: Number of workouts completed today

#### Data Sources
All data is pulled from:
```
users/{userId}/polarData/{dataType}/all/{date}
```

Where `dataType` includes:
- `activities` - Daily activity metrics
- `cardioLoad` - Cardio load calculations
- `sleep` - Sleep tracking data
- `nightlyRecharge` - Recovery metrics
- `continuousHeartRate` - HR data
- `exercises` - Workout sessions

#### Pull to Refresh
Swipe down to reload all user data and get the latest sync.

## File Structure

```
app/(tabs)/
  └── instr-dashboard.tsx          # Main dashboard component

src/hooks/
  ├── useInstructor.ts              # Check if user is instructor
  └── useInstructorStudents.ts      # Manage selected students

scripts/
  └── set-instructor.js             # CLI tool to grant instructor access
```

## Usage

1. Sign in with a user that has `isInstructor: true`
2. Navigate to the "Instructor" tab
3. Tap "Select Users" to choose students
4. View overview stats for all selected users
5. Tap any user card to see detailed stats (coming soon)
6. Pull down to refresh data

## Access Control

The Instructor tab is only visible to users with `isInstructor: true` in their Firebase user document. Non-instructors will see "Access Denied" if they somehow navigate to the route.

## Future Enhancements

- [ ] Detailed user view with historical data comparison
- [ ] Real-time vs historical data visualization
- [ ] Week/month aggregation views
- [ ] Export data functionality
- [ ] Push notifications for goal achievements
- [ ] Custom alerts for unusual patterns
