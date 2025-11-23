import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// Signature secret from Polar webhook creation
const SIGNATURE_SECRET = 'b9ea4ffb-963e-4c44-b607-cc0617124ebc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Webhook received:', req.method, req.body);

  // Handle ping from Polar during webhook creation
  if (req.method === 'POST' && req.body?.ping) {
    console.log('Ping received from Polar');
    return res.status(200).json({ message: 'Pong' });
  }

  // Handle actual webhook notifications
  if (req.method === 'POST') {
    const signature = req.headers['polar-webhook-signature'] as string;
    
    // Verify signature
    if (signature) {
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', SIGNATURE_SECRET)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid signature - Expected:', expectedSignature, 'Got:', signature);
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      console.log('✅ Signature verified');
    }

    console.log('🔔 Webhook event received:', JSON.stringify(req.body, null, 2));
    
    // Process the webhook event here
    // Event types: EXERCISE, SLEEP, ACTIVITY_SUMMARY
    const event = req.body;
    
    if (event.event === 'EXERCISE') {
      console.log('💪 New exercise data available for user:', event.user_id);
      // TODO: Fetch and process exercise data
    } else if (event.event === 'SLEEP') {
      console.log('😴 New sleep data available for user:', event.user_id);
      // TODO: Fetch and process sleep data
    } else if (event.event === 'ACTIVITY_SUMMARY') {
      console.log('📊 New activity summary available for user:', event.user_id);
      // TODO: Fetch and process activity summary
    }
    
    return res.status(200).json({ received: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
