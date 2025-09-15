import { NextRequest, NextResponse } from 'next/server';
import { downloadBFLImage, BFLAPIError } from '@/src/lib/bfl';

export const runtime = 'nodejs';

type WebhookPayload = {
  id: string;
  status: 'Ready' | 'Error' | 'Failed' | 'Queued' | 'Processing';
  result?: {
    sample?: string; // Signed URL for the generated image
  };
  details?: unknown;
  error?: unknown;
};

/**
 * Verify webhook signature (placeholder - implement according to BFL docs)
 * TODO: Implement proper signature verification once BFL provides details
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  // For now, we'll skip signature verification in development
  // In production, implement proper HMAC verification
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // TODO: Implement actual signature verification
  // This should verify the x-bfl-signature header against the payload
  // using the webhook secret
  return true;
}

/**
 * Store image data (placeholder - implement your storage solution)
 * TODO: Implement actual storage (S3, R2, GCS, etc.)
 */
async function storeImage(
  jobId: string,
  imageData: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  // For now, we'll return the base64 data URL
  // In production, upload to your storage service and return the public URL
  
  // Example S3 upload (uncomment when ready):
  /*
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const buffer = Buffer.from(imageData.split(',')[1], 'base64');
  const key = `flux/${jobId}.${mimeType.split('/')[1]}`;
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read',
  }));
  
  return `${process.env.CDN_BASE_URL}/${key}`;
  */
  
  // For development, return the base64 data URL
  return imageData;
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-bfl-signature');
    const secret = process.env.BFL_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('BFL_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const payload = await req.text();
    
    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, secret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(payload) as WebhookPayload;
    
    console.log('Received webhook for job:', body.id, 'status:', body.status);

    // Handle different job statuses
    if (body.status === 'Ready' && body.result?.sample) {
      try {
        // Download the image from BFL's delivery URL
        const imageDataUrl = await downloadBFLImage(body.result.sample);
        
        // Store the image (implement your storage solution)
        const storedUrl = await storeImage(body.id, imageDataUrl);
        
        // TODO: Update job status in your database
        // await updateJobStatus(body.id, 'completed', storedUrl);
        
        console.log('Job completed successfully:', body.id, 'stored at:', storedUrl);
        
        return NextResponse.json({ 
          ok: true, 
          id: body.id, 
          status: 'completed',
          url: storedUrl 
        });
        
      } catch (error) {
        console.error('Failed to process completed job:', body.id, error);
        
        // TODO: Update job status to failed in your database
        // await updateJobStatus(body.id, 'failed', null, error.message);
        
        return NextResponse.json(
          { 
            ok: false, 
            id: body.id, 
            error: 'Failed to process completed job',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }
    
    if (body.status === 'Error' || body.status === 'Failed') {
      console.error('Job failed:', body.id, 'error:', body.error);
      
      // TODO: Update job status to failed in your database
      // await updateJobStatus(body.id, 'failed', null, body.error);
      
      return NextResponse.json({ 
        ok: true, 
        id: body.id, 
        status: 'failed',
        error: body.error 
      });
    }
    
    // For other statuses (Queued, Processing), just acknowledge
    return NextResponse.json({ 
      ok: true, 
      id: body.id, 
      status: body.status 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
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
      'Access-Control-Allow-Headers': 'Content-Type, x-bfl-signature',
    },
  });
}
