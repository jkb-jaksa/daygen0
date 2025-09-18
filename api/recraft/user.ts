import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.RECRAFT_API_KEY) {
      return res.status(500).json({ error: 'Recraft API key not configured' });
    }

    const response = await fetch('https://external.api.recraft.ai/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Recraft API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Recraft API key' });
      }
      
      return res.status(response.status).json({ 
        error: `Recraft API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);

  } catch (err) {
    console.error('Recraft user info error:', err);
    
    if (err instanceof Error) {
      if (err.message.includes('API key')) {
        return res.status(401).json({ error: 'Invalid Recraft API key' });
      }
    }
    
    res.status(500).json({
      error: 'Failed to get user info from Recraft',
      details: String(err?.message || err),
    });
  }
}
