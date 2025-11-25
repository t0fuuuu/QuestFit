// Test script to verify Firebase storage structure
// This shows what the data structure will look like in Firestore

const testData = {
  userId: 'testUser123',
  date: '2025-11-24',
  data: {
    activities: {
      steps: 58,
      inactivity_alert_count: 0,
      start_time: '2025-11-24T00:00',
      end_time: '2025-11-24T18:20',
      calories: 993,
      active_calories: 5,
      active_duration: 'PT8M',
      inactive_duration: 'PT2H19M30S',
    },
    continuousHeartRate: {
      date: '2025-11-24',
      heart_rate_samples: [
        { heart_rate: 81, sample_time: '05:19:50' },
        { heart_rate: 56, sample_time: '15:54:14' },
      ],
    },
    cardioLoad: [
      {
        cardio_load_ratio: 2.71233,
        cardio_load_level: {
          very_low: 0,
          low: 14.193474,
          medium: 21.29021,
          high: 35.483685,
          very_high: 56.773895,
        },
      },
    ],
    exercises: [
      {
        id: '5A2j9koz',
        start_time: '2025-11-24T18:19:15',
        duration: 'PT56.156S',
        calories: 1,
        heart_rate: { average: 69, maximum: 79 },
        training_load_pro: {
          'cardio-load': 0.0724197,
          'cardio-load-interpretation': 'VERY_LOW',
        },
        sport: 'OTHER',
      },
    ],
  },
};

console.log('📁 Firebase Structure Preview');
console.log('═══════════════════════════════════════════════════════\n');

console.log(`users/${testData.userId}/polarData/`);
console.log('');

// Activities
if (testData.data.activities) {
  console.log('  📊 activities/');
  console.log('    └── daily/');
  console.log(`        └── ${testData.date}/`);
  console.log('            ', JSON.stringify(testData.data.activities, null, 12).split('\n').join('\n            '));
  console.log('');
}

// Continuous Heart Rate
if (testData.data.continuousHeartRate) {
  console.log('  ❤️  continuousHeartRate/');
  console.log('    └── daily/');
  console.log(`        └── ${testData.date}/`);
  console.log('            ', JSON.stringify(testData.data.continuousHeartRate, null, 12).split('\n').join('\n            '));
  console.log('');
}

// Cardio Load
if (testData.data.cardioLoad) {
  console.log('  💪 cardioLoad/');
  console.log('    └── daily/');
  console.log(`        └── ${testData.date}/`);
  console.log('            ', JSON.stringify({ data: testData.data.cardioLoad[0] }, null, 12).split('\n').join('\n            '));
  console.log('');
}

// Exercises
if (testData.data.exercises) {
  console.log('  🏃 exercises/');
  console.log('    └── all/');
  testData.data.exercises.forEach((exercise, idx) => {
    console.log(`        ${idx === testData.data.exercises.length - 1 ? '└' : '├'}── ${exercise.id}/`);
    console.log('            ', JSON.stringify(exercise, null, 12).split('\n').join('\n            '));
    if (idx < testData.data.exercises.length - 1) console.log('');
  });
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ This structure will be created in Firestore when the cron runs!');
console.log('\nTo query this data in your app:');
console.log('  - All activities: users/{userId}/polarData/activities/daily');
console.log('  - Specific date: users/{userId}/polarData/activities/daily/{date}');
console.log('  - All exercises: users/{userId}/polarData/exercises/all');
