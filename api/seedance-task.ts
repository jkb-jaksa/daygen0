import { VercelRequest, VercelResponse } from '@vercel/node';

const ARK_BASE = process.env.ARK_BASE || 'https://ark.ap-southeast.bytepluses.com/api/v3';
const ARK_API_KEY = process.env.ARK_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ARK_API_KEY) return res.status(500).json({ error: 'ARK_API_KEY not configured' });

  const id = (req.query?.id || req.query?.taskId) as string | string[] | undefined;
  const taskId = Array.isArray(id) ? id[0] : id;
  if (!taskId) return res.status(400).json({ error: 'Missing task id' });

  try {
    const r = await fetch(`${ARK_BASE}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ARK_API_KEY}` }
    });

    const data = await r.json().catch(() => null);
    if (!r.ok) return res.status(r.status).json({ error: 'Seedance task query failed', details: data });

    // Try common shapes returned by ARK; keep raw for debugging/forward-compatibility.
    const status = (data && (data.status || data.task_status || data.state)) ?? 'unknown';
    const outputs = (data && (data.result?.output || data.output || data.data)) ?? null;
    let videoUrl: string | null = null;
    if (Array.isArray(outputs) && outputs.length) {
      // Often an array of artifacts with urls
      videoUrl = outputs[0]?.url || outputs[0]?.video_url || null;
    } else if (outputs && typeof outputs === 'object') {
      videoUrl = outputs.url || outputs.video_url || null;
    } else if (data?.result?.video_url) {
      videoUrl = data.result.video_url;
    }

    return res.status(200).json({ status, videoUrl, raw: data });
  } catch (err: any) {
    console.error('seedance-task query error', err);
    return res.status(500).json({ error: 'Internal error', details: String(err?.message || err) });
  }
}
