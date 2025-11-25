const axios = require('axios');
const dataConfig = require('../api/cron/polar-data-config.json');

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';

// Test access token - replace with your actual token
const ACCESS_TOKEN = '47244ed52d043ed26fc5973e3eb55d6e';

/**
 * Filter object to only include specified fields from config
 */
function filterFields(data, fields) {
  if (!data || typeof data !== 'object') return data;
  
  const filtered = {};
  for (const field of fields) {
    if (field in data) {
      filtered[field] = data[field];
    }
  }
  return filtered;
}

async function testCronJob() {
  console.log('🧪 Testing Polar API Cron Job');
  console.log('═══════════════════════════════════════════════════════\n');

  const date = '2025-11-24'; // TODAY'S DATE
  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Accept': 'application/json',
  };

  const result = { date };

  // Fetch daily activities
  console.log('📊 Fetching daily activities...');
  try {
    const activitiesResponse = await axios.get(
      `${POLAR_BASE_URL}/users/activities/${date}`,
      { headers }
    );
    result.activities = filterFields(activitiesResponse.data, dataConfig.activities);
    console.log('✅ Activities fetched successfully');
    console.log(JSON.stringify(result.activities, null, 2));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ No activities for this date');
    } else {
      console.error('❌ Activities error:', error.response?.status, error.message);
    }
  }
  console.log('\n' + '─'.repeat(55) + '\n');

  // Fetch sleep data
  console.log('😴 Fetching sleep data...');
  try {
    const sleepResponse = await axios.get(
      `${POLAR_BASE_URL}/users/sleep/${date}`,
      { headers }
    );
    result.sleep = filterFields(sleepResponse.data, dataConfig.sleep);
    console.log('✅ Sleep data fetched successfully');
    console.log(JSON.stringify(result.sleep, null, 2));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ No sleep data for this date');
    } else {
      console.error('❌ Sleep error:', error.response?.status, error.message);
    }
  }
  console.log('\n' + '─'.repeat(55) + '\n');

  // Fetch nightly recharge
  console.log('⚡ Fetching nightly recharge...');
  try {
    const rechargeResponse = await axios.get(
      `${POLAR_BASE_URL}/users/nightly-recharge/${date}`,
      { headers }
    );
    result.nightlyRecharge = filterFields(rechargeResponse.data, dataConfig.nightlyRecharge);
    console.log('✅ Nightly recharge fetched successfully');
    console.log(JSON.stringify(result.nightlyRecharge, null, 2));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ No nightly recharge for this date');
    } else {
      console.error('❌ Nightly recharge error:', error.response?.status, error.message);
    }
  }
  console.log('\n' + '─'.repeat(55) + '\n');

  // Fetch continuous heart rate
  console.log('❤️  Fetching continuous heart rate...');
  try {
    const heartRateResponse = await axios.get(
      `${POLAR_BASE_URL}/users/continuous-heart-rate/${date}`,
      { headers }
    );
    result.continuousHeartRate = filterFields(heartRateResponse.data, dataConfig.continuousHeartRate);
    console.log('✅ Continuous heart rate fetched successfully');
    console.log(JSON.stringify(result.continuousHeartRate, null, 2));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ No continuous heart rate for this date');
    } else {
      console.error('❌ Continuous heart rate error:', error.response?.status, error.message);
    }
  }
  console.log('\n' + '─'.repeat(55) + '\n');

  // Fetch cardio load (1 day only)
  console.log('💪 Fetching cardio load (1-day)...');
  try {
    const cardioLoadResponse = await axios.get(
      `${POLAR_BASE_URL}/users/cardio-load/period/days/1`,
      { headers }
    );
    result.cardioLoad = cardioLoadResponse.data.map(item => 
      filterFields(item, dataConfig.cardioLoad)
    );
    console.log('✅ Cardio load fetched successfully');
    console.log(JSON.stringify(result.cardioLoad, null, 2));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ No cardio load data');
    } else {
      console.error('❌ Cardio load error:', error.response?.status, error.message);
    }
  }
  console.log('\n' + '─'.repeat(55) + '\n');

  // Fetch exercises uploaded today
  console.log('🏃 Fetching exercises uploaded today...');
  result.exercises = [];
  try {
    // List all available exercises
    const exercisesListResponse = await axios.get(
      `${POLAR_BASE_URL}/exercises`,
      { headers }
    );
    
    const exercises = exercisesListResponse.data || [];
    console.log(`ℹ️  Found ${exercises.length} total exercises available`);
    
    // Filter for exercises uploaded today (by upload_time)
    const todayExercises = exercises.filter(ex => {
      const uploadDate = ex.upload_time?.split('T')[0];
      return uploadDate === date;
    });
    
    console.log(`ℹ️  Found ${todayExercises.length} exercises uploaded on ${date}`);
    
    // Fetch detailed data for each exercise
    for (const exercise of todayExercises) {
      try {
        console.log(`  Fetching exercise ${exercise.id}...`);
        const exerciseDetailsResponse = await axios.get(
          `${POLAR_BASE_URL}/exercises/${exercise.id}?samples=true`,
          { headers }
        );
        const filteredExercise = filterFields(exerciseDetailsResponse.data, dataConfig.exercises);
        result.exercises.push(filteredExercise);
        console.log(`  ✅ Exercise ${exercise.id} fetched`);
      } catch (error) {
        console.error(`  ❌ Error fetching exercise ${exercise.id}:`, error.message);
      }
    }
    
    if (result.exercises.length > 0) {
      console.log('✅ Exercises fetched successfully');
      console.log(JSON.stringify(result.exercises, null, 2));
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ No exercises available');
    } else {
      console.error('❌ Exercises error:', error.response?.status, error.message);
    }
  }
  console.log('\n' + '─'.repeat(55) + '\n');

  // Summary
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Date:', date);
  console.log('Activities:', result.activities ? '✅ Found' : '❌ Not found');
  console.log('Sleep:', result.sleep ? '✅ Found' : '❌ Not found');
  console.log('Nightly Recharge:', result.nightlyRecharge ? '✅ Found' : '❌ Not found');
  console.log('Continuous Heart Rate:', result.continuousHeartRate ? '✅ Found' : '❌ Not found');
  console.log('Cardio Load:', result.cardioLoad ? '✅ Found' : '❌ Not found');
  console.log('Exercises:', result.exercises?.length > 0 ? `✅ Found (${result.exercises.length})` : '❌ Not found');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🎉 Test complete!');
}

testCronJob().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
