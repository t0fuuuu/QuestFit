#!/usr/bin/env node

/**
 * Test script for the Polar daily sync cron job
 * 
 * Usage:
 *   node scripts/test-polar-sync.js
 *   node scripts/test-polar-sync.js --date=2025-11-23
 *   node scripts/test-polar-sync.js --prod
 */

const https = require('https');
const http = require('http');

// Configuration
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const dateArg = args.find(arg => arg.startsWith('--date='));
const testDate = dateArg ? dateArg.split('=')[1] : null;

const LOCAL_URL = 'http://localhost:3000/api/cron/daily-polar-sync';
const PROD_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/cron/daily-polar-sync`
  : `${process.env.EXPO_PUBLIC_BASE_URL || 'https://questfit.life'}/api/cron/daily-polar-sync`;

const url = isProd ? PROD_URL : LOCAL_URL;
const cronSecret = process.env.CRON_SECRET || 'test-secret';

console.log('🧪 Testing Polar Daily Sync');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Environment: ${isProd ? 'PRODUCTION' : 'LOCAL'}`);
console.log(`URL: ${url}`);
if (testDate) {
  console.log(`Date: ${testDate}`);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const urlObj = new URL(testDate ? `${url}?date=${testDate}` : url);
const client = urlObj.protocol === 'https:' ? https : http;

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname + urlObj.search,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${cronSecret}`,
    'Content-Type': 'application/json',
  },
};

const req = client.request(options, (res) => {
  let data = '';

  console.log(`Status Code: ${res.statusCode}\n`);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Response:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.results) {
        console.log('\n📊 Summary:');
        console.log(`  Total users: ${json.results.total}`);
        console.log(`  ✅ Successful: ${json.results.successful}`);
        console.log(`  ❌ Failed: ${json.results.failed}`);
        
        if (json.results.synced && json.results.synced.length > 0) {
          console.log('\n✅ Synced users:');
          json.results.synced.forEach(user => {
            console.log(`  - ${user.userId}`);
            console.log(`    Activities: ${user.hasActivities ? 'Yes' : 'No'}`);
            console.log(`    Nightly Recharge: ${user.hasNightlyRecharge ? 'Yes' : 'No'}`);
            console.log(`    Exercises: ${user.exerciseCount}`);
          });
        }
        
        if (json.results.errors && json.results.errors.length > 0) {
          console.log('\n❌ Errors:');
          json.results.errors.forEach(err => {
            console.log(`  - ${err.userId}: ${err.error} (${err.status})`);
          });
        }
      }
    } catch (error) {
      console.log('Raw response:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Make sure your server is running (npm run dev)');
  console.error('  2. Check that the URL is correct');
  console.error('  3. Verify CRON_SECRET environment variable');
  console.error('  4. For production, ensure deployment is complete');
});

req.end();
