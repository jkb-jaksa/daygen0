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
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
