import { NextRequest, NextResponse } from 'next/server';
import { createFluxJob, BFLAPIError, FluxModel, FluxJobParams, FluxModelType, FLUX_MODEL_MAP } from '@/src/lib/bfl';

export const runtime = 'nodejs';

type RequestBody = {
  model: FluxModel | FluxModelType;
  prompt: string;
  // Sizing options
  width?: number;
  height?: number;
  aspect_ratio?: string;
  // Ultra-specific params
  raw?: boolean;
  image_prompt?: string;
  image_prompt_strength?: number;
  // Kontext (editing) params
  input_image?: string;
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  // Common params
  seed?: number;
  output_format?: 'jpeg' | 'png';
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
  // Webhook control
  useWebhook?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    
    // Validate required fields
    if (!body.model || !body.prompt) {
      return NextResponse.json(
        { error: 'Model and prompt are required' },
        { status: 400 }
      );
    }

    // Validate model and map to BFL model if needed
    const validModels: (FluxModel | FluxModelType)[] = [
      'flux-t1', 'flux-t2', 'flux-e1', 'flux-e2',
      'flux-pro-1.1',
      'flux-pro-1.1-ultra', 
      'flux-kontext-pro',
      'flux-kontext-max',
      'flux-pro',
      'flux-dev'
    ];

    if (!validModels.includes(body.model)) {
      return NextResponse.json(
        { error: `Invalid model. Must be one of: ${validModels.join(', ')}` },
        { status: 400 }
      );
    }

    // Map simplified model names to BFL model names
    const bflModel = body.model in FLUX_MODEL_MAP 
      ? FLUX_MODEL_MAP[body.model as FluxModelType]
      : body.model as FluxModel;

    // Prepare parameters
    const params: FluxJobParams = {
      prompt: body.prompt,
      width: body.width,
      height: body.height,
      aspect_ratio: body.aspect_ratio,
      raw: body.raw,
      image_prompt: body.image_prompt,
      image_prompt_strength: body.image_prompt_strength,
      input_image: body.input_image,
      input_image_2: body.input_image_2,
      input_image_3: body.input_image_3,
      input_image_4: body.input_image_4,
      seed: body.seed,
      output_format: body.output_format,
      prompt_upsampling: body.prompt_upsampling,
      safety_tolerance: body.safety_tolerance,
    };

    // Create the job
    const { id, polling_url } = await createFluxJob(
      bflModel,
      params,
      body.useWebhook !== false // Default to true
    );

    // TODO: Store job in database for tracking
    // For now, we'll return the job info to the client

    return NextResponse.json({ 
      id, 
      pollingUrl: polling_url,
      model: body.model,
      status: 'queued'
    });

  } catch (error) {
    console.error('Flux generation error:', error);

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
        error: 'Internal server error',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
