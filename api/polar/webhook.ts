import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// Store the signature secret (in production, use environment variables or database)
let SIGNATURE_SECRET: string | null = null;

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
    
    // Verify signature if we have the secret
    if (SIGNATURE_SECRET && signature) {
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', SIGNATURE_SECRET)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    console.log('Webhook event received:', req.body);
    
    // Process the webhook event here
    // You can add logic to handle EXERCISE, SLEEP, etc. events
    
    return res.status(200).json({ received: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export function setSignatureSecret(secret: string) {
  SIGNATURE_SECRET = secret;
}
