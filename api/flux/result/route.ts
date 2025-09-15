import { NextRequest, NextResponse } from 'next/server';
import { bflPoll, BFLAPIError, BFLJobResult } from '@/src/lib/bfl';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const pollingUrl = req.nextUrl.searchParams.get('pollingUrl');
    
    if (!pollingUrl) {
      return NextResponse.json(
        { error: 'Missing pollingUrl parameter' },
        { status: 400 }
      );
    }

    // Validate that the polling URL is from BFL
    const validDomains = [
      'api.bfl.ai',
      'api.eu.bfl.ai', 
      'api.us.bfl.ai',
      'api.eu1.bfl.ai',
      'api.us1.bfl.ai'
    ];
    
    const url = new URL(pollingUrl);
    if (!validDomains.some(domain => url.hostname === domain)) {
      return NextResponse.json(
        { error: 'Invalid polling URL domain' },
        { status: 400 }
      );
    }

    const result = await bflPoll<BFLJobResult>(pollingUrl);
    
    // Return the result with additional metadata
    return NextResponse.json({
      ...result,
      pollingUrl, // Include the polling URL for reference
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Flux polling error:', error);

    if (error instanceof BFLAPIError) {
      return NextResponse.json(
        { 
          error: error.message,
          status: error.status,
          details: error.details
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        error: 'Polling failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
