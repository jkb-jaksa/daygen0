import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Check if BFL API key is available
    const bflKey = process.env.BFL_API_KEY;
    const bflBase = process.env.BFL_API_BASE || 'https://api.bfl.ai';
    
    return NextResponse.json({
      hasBFLKey: !!bflKey,
      bflKeyLength: bflKey ? bflKey.length : 0,
      bflBase,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('BFL')),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
