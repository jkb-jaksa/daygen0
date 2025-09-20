import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { action } = query;

  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return res.status(500).json({ error: 'Google AI API key not configured' });
    }

    if (method === 'POST') {
      // Handle video creation
      const { prompt, model = 'veo-3.0-generate-001', aspectRatio = '16:9', negativePrompt, seed, imageBase64, imageMimeType } = body;

      // Validate required fields
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Prepare the request body for Google AI
      const requestBody: any = {
        prompt,
        model,
        aspectRatio,
      };

      if (negativePrompt) {
        requestBody.negativePrompt = negativePrompt;
      }
      if (seed) {
        requestBody.seed = seed;
      }
      if (imageBase64 && imageMimeType) {
        requestBody.image = {
          data: imageBase64,
          mimeType: imageMimeType,
        };
      }

      // Call Google AI API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateVideo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_AI_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Google AI API error:', errorData);
        return res.status(response.status).json({ error: 'Failed to create video generation request' });
      }

      const data = await response.json();
      
      // Return the operation name for polling
      return res.json({
        name: data.name,
        done: false,
      });

    } else if (method === 'GET') {
      // Handle status check or download
      const operationName = query.operationName as string;

      if (!operationName) {
        return res.status(400).json({ error: 'Operation name is required' });
      }

      // Call Google AI API to check operation status
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}`, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': process.env.GOOGLE_AI_API_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Google AI API error:', errorData);
        return res.status(response.status).json({ error: 'Failed to check operation status' });
      }

      const data = await response.json();
      
      if (action === 'download') {
        // Handle download request
        if (!data.done) {
          return res.status(400).json({ error: 'Operation not completed yet' });
        }

        if (data.error) {
          return res.status(400).json({ error: data.error.message || 'Operation failed' });
        }

        // Get the video URL from the response
        const videoUrl = data.response?.video?.uri;
        if (!videoUrl) {
          return res.status(400).json({ error: 'No video URL found in response' });
        }

        // Download the video from the URL
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          return res.status(videoResponse.status).json({ error: 'Failed to download video' });
        }

        const videoBuffer = await videoResponse.arrayBuffer();
        
        // Return the video as a stream
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="veo3_${operationName.split('/').pop() || 'video'}.mp4"`);
        return res.send(Buffer.from(videoBuffer));

      } else {
        // Handle status request
        return res.json(data);
      }

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Video operation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}