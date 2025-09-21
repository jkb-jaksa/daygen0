import { VercelRequest, VercelResponse } from '@vercel/node';

const ARK_BASE = process.env.ARK_BASE || 'https://ark.ap-southeast.bytepluses.com/api/v3';
const ARK_API_KEY = process.env.ARK_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ARK_API_KEY) return res.status(500).json({ error: 'ARK_API_KEY not configured' });

  try {
    const {
      prompt,
      mode = 't2v', // t2v, i2v-first, i2v-first-last
      ratio = '16:9',
      duration = 5,
      resolution = '1080p',
      fps = 24, // 24 fixed today
      camerafixed = true, // lock camera if needed
      seed, // optional number/string
      imageBase64, // data URL for first frame (required for i2v-first / i2v-first-last)
      lastFrameBase64 // optional data URL for last frame (only for i2v-first-last)
    } = (req.body ?? {});

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Compose text with inline control flags supported by Seedance prompt syntax
    const flags: string[] = [
      `--ratio ${ratio}`,
      `--duration ${duration}`,
      `--resolution ${resolution}`,
      `--fps ${fps}`,
      `--camerafixed ${String(!!camerafixed)}`
    ];
    if (seed !== undefined && seed !== null && String(seed).trim() !== '') {
      flags.push(`--seed ${seed}`);
    }

    const content: any[] = [
      { type: 'text', text: `${prompt.trim()}  ${flags.join(' ')}` }
    ];

    // Image-to-video modes: supply one or two reference frames via data URLs
    if (mode.startsWith('i2v') && imageBase64) {
      content.push({ type: 'image_url', image_url: { url: imageBase64 } });
    }
    if (mode === 'i2v-first-last' && lastFrameBase64) {
      // The API accepts multiple images; pass the last frame as an additional image_url entry.
      content.push({ type: 'image_url', image_url: { url: lastFrameBase64 } });
    }

    // Pro model ID (2025-05-28 release). Keep this string as-is.
    const model = 'seedance-1-0-pro-250528';

    const createResp = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, content })
    });

    const created = await createResp.json().catch(() => null);
    if (!createResp.ok) {
      return res.status(createResp.status).json({ error: 'Seedance task create failed', details: created });
    }

    const taskId = (created && (created.id || created.task_id || created.taskId)) ?? null;
    if (!taskId) return res.status(502).json({ error: 'No task id in Seedance response', details: created });

    return res.status(200).json({ taskId, raw: created });
  } catch (err: any) {
    console.error('seedance-video create error', err);
    return res.status(500).json({ error: 'Internal error', details: String(err?.message || err) });
  }
}
