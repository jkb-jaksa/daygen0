import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const BFL_API_KEY = process.env.BFL_API_KEY;
    
    if (!BFL_API_KEY) {
      return res.status(500).json({ error: 'BFL_API_KEY is not configured' });
    }

    const pollingUrl = req.query.pollingUrl as string;
    if (!pollingUrl) {
      return res.status(400).json({ error: 'Missing pollingUrl' });
    }

    const validDomains = [
      'api.bfl.ai', 'api.eu.bfl.ai', 'api.us.bfl.ai',
      'api.eu1.bfl.ai', 'api.us1.bfl.ai',
      'api.eu4.bfl.ai', 'api.us4.bfl.ai'
    ];

    const url = new URL(pollingUrl);
    if (!validDomains.some(domain => url.hostname === domain)) {
      return res.status(400).json({ error: 'Invalid polling URL domain' });
    }

    const response = await fetch(pollingUrl, {
      headers: { 'x-key': BFL_API_KEY, 'accept': 'application/json' },
      method: 'GET',
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Polling failed: ${response.status} ${text}` });
    }

    const result = await response.json();
    res.json(result);

  } catch (error) {
    console.error('Error in /api/flux/result:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
