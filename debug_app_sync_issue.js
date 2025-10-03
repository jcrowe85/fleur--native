// Debug script to identify the exact sync issue
// Run this in your app's console or add to CloudSyncPopup temporarily

console.log('=== APP SYNC DEBUG START ===');

// Check environment variables
console.log('Environment check:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_FUNCTIONS_URL:', process.env.EXPO_PUBLIC_FUNCTIONS_URL);

// Check Supabase client
import { supabase } from '@/services/supabase';
console.log('Supabase client URL:', supabase.supabaseUrl);

// Get current session
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
console.log('Session check:');
console.log('Has session:', !!session);
console.log('Session error:', sessionError);
if (session) {
  console.log('User ID:', session.user.id);
  console.log('User email:', session.user.email);
  console.log('Access token length:', session.access_token.length);
}

// Test the exact same call the app makes
const testEmail = `debug-${Date.now()}@example.com`;
const testPassword = 'debugpassword123';

console.log('Testing with:');
console.log('Email:', testEmail);
console.log('Password:', testPassword);

const functionsUrl = process.env.EXPO_PUBLIC_FUNCTIONS_URL || 
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

console.log('Functions URL:', functionsUrl);

try {
  console.log('Making fetch request...');
  
  const response = await fetch(`${functionsUrl}/link-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ 
      email: testEmail.trim(),
      password: testPassword.trim()
    }),
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  const responseText = await response.text();
  console.log('Raw response:', responseText);
  
  let result;
  try {
    result = JSON.parse(responseText);
    console.log('Parsed response:', result);
  } catch (parseError) {
    console.error('Failed to parse JSON:', parseError);
    console.log('Raw response was:', responseText);
  }

  if (result?.success) {
    console.log('✅ SUCCESS: Email linked successfully!');
  } else {
    console.log('❌ FAILED:', result?.error || 'Unknown error');
  }

} catch (fetchError) {
  console.error('❌ FETCH ERROR:', fetchError);
  console.error('Error details:', {
    message: fetchError.message,
    name: fetchError.name,
    stack: fetchError.stack
  });
}

console.log('=== APP SYNC DEBUG END ===');
