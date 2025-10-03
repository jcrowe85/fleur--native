// Add this temporary code to your CloudSyncPopup component to test environment
// Replace the handleSync function temporarily with this:

const handleSync = async () => {
  console.log('=== ENVIRONMENT TEST ===');
  
  // Check environment variables
  console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.log('EXPO_PUBLIC_FUNCTIONS_URL:', process.env.EXPO_PUBLIC_FUNCTIONS_URL);
  
  // Check Supabase client
  console.log('Supabase URL:', supabase.supabaseUrl);
  
  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Session:', { hasSession: !!session, error: sessionError?.message });
  
  if (session) {
    console.log('User:', {
      id: session.user.id,
      email: session.user.email,
      tokenLength: session.access_token.length,
      tokenStart: session.access_token.substring(0, 20) + '...'
    });
  }
  
  // Test the exact URL construction
  const functionsUrl = process.env.EXPO_PUBLIC_FUNCTIONS_URL || 
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
  
  console.log('Constructed functions URL:', functionsUrl);
  console.log('Full request URL:', `${functionsUrl}/link-email`);
  
  // Test a simple request to see if we get a different error
  try {
    const testResponse = await fetch(`${functionsUrl}/link-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        email: 'test@example.com',
        password: 'testpassword123'
      }),
    });
    
    console.log('Test response status:', testResponse.status);
    const testResult = await testResponse.text();
    console.log('Test response body:', testResult);
    
  } catch (testError) {
    console.error('Test request failed:', testError);
  }
  
  console.log('=== ENVIRONMENT TEST COMPLETE ===');
};
