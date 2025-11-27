# Style Files Organization

This document outlines the refactoring of inline styles to dedicated style files for better project organization and maintainability.

## Directory Structure

```
src/
├── styles/
│   ├── components/
│   │   ├── signInScreenStyles.ts
│   │   ├── consentModalStyles.ts
│   │   ├── polarLinkScreenStyles.ts
│   │   ├── statsDisplayStyles.ts
│   │   ├── creatureCardStyles.ts
│   │   ├── creatureUnlockModalStyles.ts
│   │   ├── deviceHeartRateCardStyles.ts
│   │   └── workoutCardStyles.ts
│   └── screens/
│       └── instructorDashboardStyles.ts
```

## Component-to-Style File Mapping

### Auth Components

1. **SignInScreen** (`components/auth/SignInScreen.tsx`)
   - Style file: `src/styles/components/signInScreenStyles.ts`
   - Export: `signInScreenStyles`

2. **ConsentModal** (`components/auth/ConsentModal.tsx`)
   - Style file: `src/styles/components/consentModalStyles.ts`
   - Export: `consentModalStyles`

3. **PolarLinkScreen** (`components/auth/PolarLinkScreen.tsx`)
   - Style file: `src/styles/components/polarLinkScreenStyles.ts`
   - Export: `polarLinkScreenStyles`

### Game Components

4. **StatsDisplay** (`components/game/StatsDisplay.tsx`)
   - Style file: `src/styles/components/statsDisplayStyles.ts`
   - Export: `statsDisplayStyles`

5. **CreatureCard** (`components/game/CreatureCard.tsx`)
   - Style file: `src/styles/components/creatureCardStyles.ts`
   - Export: `creatureCardStyles`

6. **CreatureUnlockModal** (`components/game/CreatureUnlockModal.tsx`)
   - Style file: `src/styles/components/creatureUnlockModalStyles.ts`
   - Export: `creatureUnlockModalStyles`

### Fitness Components

7. **DeviceHeartRateCard** (`components/fitness/DeviceHeartRateCard.tsx`)
   - Style file: `src/styles/components/deviceHeartRateCardStyles.ts`
   - Export: `deviceHeartRateCardStyles`

8. **WorkoutCard** (`components/fitness/WorkoutCard.tsx`)
   - Style file: `src/styles/components/workoutCardStyles.ts`
   - Export: `workoutCardStyles`

### Screen Components

9. **InstructorDashboard** (`app/(tabs)/instr-dashboard.tsx`)
   - Style file: `src/styles/screens/instructorDashboardStyles.ts`
   - Export: `instructorDashboardStyles`

## Usage Example

Before:
```tsx
import { StyleSheet } from 'react-native';

export const MyComponent = () => {
  // ... component code
};

const styles = StyleSheet.create({
  container: { /* ... */ },
  title: { /* ... */ },
});
```

After:
```tsx
import { myComponentStyles as styles } from '@/src/styles/components/myComponentStyles';

export const MyComponent = () => {
  // ... component code
};
```

## Benefits

✅ **Better Organization** - All styles are centralized in a dedicated directory structure
✅ **Cleaner Components** - Component files focus on logic, not styling
✅ **Easier Maintenance** - Styles are easier to update and manage
✅ **Consistency** - Uniform style file naming and organization
✅ **Code Reusability** - Styles can be easily imported in multiple components
✅ **Scalability** - Easy to add new style files as the project grows

## Existing Centralized Styles

The following styles were already centralized in `src/styles.ts`:
- `indexStyles` - Home/Index Tab
- `twoStyles` - Creatures Tab
- `liveStyles` - Live Workout Tab
- `xpStyles` - XP Management Tab

These remain unchanged and continue to be used as-is.
