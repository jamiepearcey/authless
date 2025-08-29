#!/usr/bin/env node

// Test script to check environment variable loading
require('dotenv').config({ path: '.env' });

console.log('=== Environment Variable Test ===');
console.log('WHATSAPP_2FA_WEBHOOK_URL:', process.env.WHATSAPP_2FA_WEBHOOK_URL);
console.log('WHATSAPP_2FA_WEBHOOK_SECRET:', process.env.WHATSAPP_2FA_WEBHOOK_SECRET);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

// Check if we're in the right directory
const fs = require('fs');
const path = require('path');

console.log('\n=== File Check ===');
console.log('Current directory:', process.cwd());
console.log('.env exists:', fs.existsSync('.env'));
console.log('apps/web/.env.local exists:', fs.existsSync('apps/web/.env.local'));

// Try loading from different paths
console.log('\n=== Loading from different paths ===');
try {
  require('dotenv').config({ path: 'apps/web/.env.local' });
  console.log('After loading .env.local:');
  console.log('WHATSAPP_2FA_WEBHOOK_URL:', process.env.WHATSAPP_2FA_WEBHOOK_URL);
} catch (error) {
  console.log('Error loading .env.local:', error.message);
}
