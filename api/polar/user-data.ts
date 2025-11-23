import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessToken, polarUserId } = req.body;

  if (!accessToken || !polarUserId) {
    return res.status(400).json({ error: 'Missing accessToken or polarUserId' });
  }

  try {
    // Fetch user physical data from Polar API
    const response = await axios.get(
      `https://www.polaraccesslink.com/v3/users/${polarUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    // Return the physical data
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching Polar user data:', error);
    
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        error: 'Failed to fetch user data from Polar',
        details: error.response?.data,
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
