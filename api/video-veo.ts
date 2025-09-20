import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = 'veo-3.0-generate-001', aspectRatio = '16:9', negativePrompt, seed, imageBase64, imageMimeType } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 });
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
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google AI API error:', errorData);
      return NextResponse.json({ error: 'Failed to create video generation request' }, { status: response.status });
    }

    const data = await response.json();
    
    // Return the operation name for polling
    return NextResponse.json({
      name: data.name,
      done: false,
    });

  } catch (error) {
    console.error('Video creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationName = searchParams.get('operationName');
    const action = searchParams.get('action'); // 'status' or 'download'

    if (!operationName) {
      return NextResponse.json({ error: 'Operation name is required' }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 });
    }

    // Call Google AI API to check operation status
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google AI API error:', errorData);
      return NextResponse.json({ error: 'Failed to check operation status' }, { status: response.status });
    }

    const data = await response.json();
    
    if (action === 'download') {
      // Handle download request
      if (!data.done) {
        return NextResponse.json({ error: 'Operation not completed yet' }, { status: 400 });
      }

      if (data.error) {
        return NextResponse.json({ error: data.error.message || 'Operation failed' }, { status: 400 });
      }

      // Get the video URL from the response
      const videoUrl = data.response?.video?.uri;
      if (!videoUrl) {
        return NextResponse.json({ error: 'No video URL found in response' }, { status: 400 });
      }

      // Download the video from the URL
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        return NextResponse.json({ error: 'Failed to download video' }, { status: videoResponse.status });
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      
      // Return the video as a stream
      return new NextResponse(videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="veo3_${operationName.split('/').pop() || 'video'}.mp4"`,
        },
      });
    } else {
      // Handle status request
      return NextResponse.json(data);
    }

  } catch (error) {
    console.error('Video operation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
