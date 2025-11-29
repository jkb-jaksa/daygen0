import assert from "node:assert";

export type GenParams = {
  prompt: string;
  negative_prompt?: string;
  width?: number;   // e.g., 1024
  height?: number;  // e.g., 1024
  aspect_ratio?: string; // e.g., "16:9" if supported
  model?: string;   // e.g., "reve-image-1.0" (see your docs)
  guidance_scale?: number;
  steps?: number;
  seed?: number;
  batch_size?: number; // 1..n
  // add any Reve-specific fields here (style, safety, typography mode, etc.)
};

export type EditParams = {
  prompt: string;
  init_image: Buffer;            // original image bytes
  mask_image?: Buffer;           // optional mask bytes (white=keep, black=paint)
  strength?: number;             // img2img strength
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  // other Reve edit params (outpainting, upscale mode, etc.) if available
};

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export interface ReveClientOptions {
  baseUrl?: string;
  apiKey: string;
  projectId?: string;
  timeoutMs?: number;
}

export class ReveClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(opts: ReveClientOptions) {
    assert(opts.apiKey, "REVE_API_KEY missing");
    this.baseUrl = (opts.baseUrl ?? process.env.REVE_BASE_URL ?? "https://api.reve.com").replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.timeout = opts.timeoutMs ?? 60000;
  }

  private headers(extra: Record<string,string> = {}) {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  // ---- Text -> Image (async job) ----
  async createGeneration(params: GenParams): Promise<{ job_id: string }> {
    // Reve API endpoint for image generation
    const endpoint = `${this.baseUrl}/v1/image/create`;

    // Convert our params to Reve's expected format
    const requestBody = {
      prompt: params.prompt,
      ...(params.negative_prompt && { negative_prompt: params.negative_prompt }),
      ...(params.seed !== undefined && { seed: params.seed }),
      ...(params.guidance_scale && { guidance_scale: params.guidance_scale }),
      ...(params.steps && { steps: params.steps }),
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!res.ok) throw new Error(`Reve createGeneration failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    // Reve returns the job ID in the response
    return { job_id: data.id ?? data.job_id ?? data.request_id };
  }

  // ---- Image Edit (async job) ----
  async createEdit(params: EditParams): Promise<{ job_id: string }> {
    // Many providers require multipart/form-data for images.
    // If Reve requires JSON-upload URLs, adjust accordingly.
    const endpoint = `${this.baseUrl}/v1/image/edit`;

    const form = new FormData();
    form.set("prompt", params.prompt);
    if (params.mask_image) form.set("mask", new Blob([params.mask_image]), "mask.png");
    form.set("image", new Blob([params.init_image]), "init.png");
    if (params.width) form.set("width", String(params.width));
    if (params.height) form.set("height", String(params.height));
    if (params.model) form.set("model", params.model);
    if (params.seed !== undefined) form.set("seed", String(params.seed));
    if (params.strength !== undefined) form.set("strength", String(params.strength));

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!res.ok) throw new Error(`Reve createEdit failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { job_id: data.id ?? data.job_id };
  }

  // ---- Job status ----
  async getJob(jobId: string): Promise<{
    id: string;
    status: JobStatus;
    // Many providers return URLs or base64 when completed:
    images?: { url?: string; b64?: string; mime?: string }[];
    error?: string;
    seed?: number;
    meta?: Record<string, unknown>;
  }> {
    // Common patterns:
    //   GET /v1/jobs/:id
    //   or  GET /v1/images/generations/:id
    const endpoint = `${this.baseUrl}/v1/jobs/${jobId}`;

    const res = await fetch(endpoint, {
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!res.ok) throw new Error(`Reve getJob failed: ${res.status} ${await res.text()}`);
    return res.json();
  }
}
