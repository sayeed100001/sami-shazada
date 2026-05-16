// Environment validation for build process
try {
  require('dotenv').config({ path: '.env' });
} catch (e) {
  // dotenv not available, continue without it
}

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

const optionalEnvVars = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

console.log('🔍 Validating environment variables...');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  Missing environment variable: ${varName} (development mode)`);
      hasWarnings = true;
    } else {
      console.error(`❌ Missing required environment variable: ${varName}`);
      hasErrors = true;
    }
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

// Check optional variables
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName} is set (optional)`);
  } else {
    console.warn(`⚠️  Optional environment variable not set: ${varName}`);
  }
});

if (hasErrors) {
  console.error('\n❌ Environment validation failed. Please set the required environment variables.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  Environment validation passed with warnings (development mode).');
} else {
  console.log('\n✅ Environment validation passed!');
}