import dotenv from 'dotenv';
import { sendOTPEmail } from './config/emailConfig.js';

// Load environment variables
dotenv.config();

console.log('🔍 Testing Email Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('  EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? `✅ Set (${process.env.EMAIL_PASS.length} chars)` : '❌ NOT SET');
console.log('  EMAIL_PASS (cleaned):', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '').length + ' chars' : 'N/A');
console.log();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ Email credentials not found in .env file!');
  process.exit(1);
}

console.log('📧 Sending test OTP email...\n');

// Test sending an OTP email
sendOTPEmail(process.env.EMAIL_USER, '123456', 'Test User')
  .then((result) => {
    console.log('✅ Test email sent successfully!');
    console.log('Result:', result);
    console.log('\nCheck your inbox at:', process.env.EMAIL_USER);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to send test email!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    console.error('\nPossible issues:');
    console.error('1. App password is incorrect');
    console.error('2. 2-Step Verification is not enabled on your Google account');
    console.error('3. Gmail account requires additional verification');
    console.error('\nTo fix:');
    console.error('- Go to: https://myaccount.google.com/apppasswords');
    console.error('- Generate a NEW App Password');
    console.error('- Update EMAIL_PASS in .env file (remove all spaces)');
    process.exit(1);
  });
