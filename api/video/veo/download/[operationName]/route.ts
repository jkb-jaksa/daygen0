import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { operationName: string } }
) {
  try {
    const { operationName } = params;

    if (!operationName) {
      return NextResponse.json({ error: 'Operation name is required' }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 });
    }

    // First, get the operation status to ensure it's completed
    const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    });

    if (!statusResponse.ok) {
      const errorData = await statusResponse.text();
      console.error('Google AI API error:', errorData);
      return NextResponse.json({ error: 'Failed to check operation status' }, { status: statusResponse.status });
    }

    const statusData = await statusResponse.json();
    
    if (!statusData.done) {
      return NextResponse.json({ error: 'Operation not completed yet' }, { status: 400 });
    }

    if (statusData.error) {
      return NextResponse.json({ error: statusData.error.message || 'Operation failed' }, { status: 400 });
    }

    // Get the video URL from the response
    const videoUrl = statusData.response?.video?.uri;
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

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
