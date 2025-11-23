import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use Basic Auth with client credentials
  const BASIC_AUTH = 'OWFhNjJjZTEtNzAxNC00MmFkLTliY2YtZTIzNGI3NjQ2MjNmOjk0MTUxNzFmLWNiM2YtNDBiMy04OWYzLTFhYzVlYWI2ODk3NA==';

  try {
    const response = await axios.post(
      'https://www.polaraccesslink.com/v3/webhooks',
      {
        events: ['EXERCISE', 'SLEEP', 'ACTIVITY_SUMMARY'],
        url: 'https://questfit-pi.vercel.app/api/polar/webhook'
      },
      {
        headers: {
          'Authorization': `Basic ${BASIC_AUTH}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    console.log('Webhook created successfully:', response.data);
    
    return res.status(201).json({
      success: true,
      data: response.data,
      signatureSecret: response.data?.data?.signature_secret_key,
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    
    if (axios.isAxiosError(error)) {
      // 409 means webhook already exists
      if (error.response?.status === 409) {
        return res.status(200).json({
          success: true,
          alreadyExists: true,
          message: 'Webhook already exists',
        });
      }

      return res.status(error.response?.status || 500).json({
        error: 'Failed to create webhook',
        details: error.response?.data || error.message,
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
