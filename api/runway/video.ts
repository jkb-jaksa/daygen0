import { VercelRequest, VercelResponse } from '@vercel/node';
import RunwayML, { TaskFailedError } from '@runwayml/sdk';

const DEFAULT_PROMPT_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RUNWAY_API_KEY is not configured' });
  }

  const {
    model = 'gen4_turbo',
    promptText,
    promptImage,
    ratio = '1280:720',
    duration = 5,
    seed,
    contentModeration,
  } = req.body ?? {};

  if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
    return res.status(400).json({ error: 'Provide promptText.' });
  }

  const sanitizedPrompt = promptText.trim();
  const sanitizedModel = typeof model === 'string' && model.trim() ? model.trim() : 'gen4_turbo';
  const sanitizedRatio = typeof ratio === 'string' && ratio.trim() ? ratio.trim() : '1280:720';
  const parsedDuration = typeof duration === 'number'
    ? duration
    : Number.parseInt(duration, 10);
  const finalDuration = Number.isFinite(parsedDuration) ? parsedDuration : 5;

  try {
    const client = new RunwayML({ apiKey });

    const payload: Record<string, unknown> = {
      model: sanitizedModel,
      promptText: sanitizedPrompt,
      promptImage: typeof promptImage === 'string' && promptImage.trim() ? promptImage.trim() : DEFAULT_PROMPT_IMAGE,
      ratio: sanitizedRatio,
      duration: finalDuration,
    };

    if (seed !== undefined && seed !== null && `${seed}`.trim() !== '') {
      payload.seed = seed;
    }
    if (contentModeration && typeof contentModeration === 'object') {
      payload.contentModeration = contentModeration;
    }

    const task = await client.imageToVideo
      .create(payload)
      .waitForTaskOutput({ timeout: 5 * 60 * 1000 });

    const outputUrl = task.output?.[0];
    if (!outputUrl) {
      throw new Error('No output URL returned from Runway');
    }

    return res.status(200).json({
      url: outputUrl,
      taskId: task.id,
      meta: {
        model: sanitizedModel,
        ratio: sanitizedRatio,
        duration: finalDuration,
        seed: seed ?? null,
      },
    });
  } catch (error) {
    console.error('Runway Video generation error:', error);

    if (error instanceof TaskFailedError) {
      return res.status(422).json({
        error: 'Runway task failed',
        code: 'RUNWAY_TASK_FAILED',
        details: error.taskDetails,
      });
    }

    return res.status(500).json({
      error: 'Generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
