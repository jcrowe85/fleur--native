// Simple test webhook to debug Slack verification
export default async function handler(req, res) {
  console.log('Test webhook called with method:', req.method);
  console.log('Request body:', req.body);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the request body
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }
    
    console.log('Parsed body:', JSON.stringify(body, null, 2));
    
    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      console.log('URL verification challenge received:', body.challenge);
      res.status(200).send(body.challenge);
      return;
    }

    // For any other request, just return success
    return res.status(200).json({ 
      success: true, 
      message: 'Test webhook working',
      received: body 
    });
    
  } catch (error) {
    console.error('Test webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
