import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-bfl-signature'];
    const secret = process.env.BFL_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('BFL_WEBHOOK_SECRET not configured, skipping signature verification');
    }

    // TODO: implement signature verification according to BFL's documented scheme once available
    // For now, if you control both sides, you can compare against your own scheme or skip in dev

    const body = req.body as {
      id: string;
      status: 'Ready'|'Error'|'Failed'|string;
      result?: { sample?: string }; // signed URL
      details?: unknown; 
      error?: unknown;
    };

    if (body.status !== 'Ready' || !body.result?.sample) {
      return res.json({ ok: true, status: body.status });
    }

    // Download the image bytes from BFL delivery URL
    const imgRes = await fetch(body.result.sample);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // For now, just return the data URL - in production you'd upload to S3/R2
    const base64 = buffer.toString('base64');
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    // TODO: persist job -> { status: 'Ready', url: dataUrl }
    console.log(`Webhook received for job ${body.id}: Ready`);

    return res.json({ ok: true, id: body.id, url: dataUrl });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
