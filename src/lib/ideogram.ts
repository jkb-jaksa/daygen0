import { Readable } from "node:stream";
import FormData from "form-data";
import { fetch } from "undici";

const IDEO_BASE = "https://api.ideogram.ai";

type RenderSpeed = "TURBO" | "DEFAULT" | "QUALITY";

export type GenerateOptions = {
  prompt: string;
  aspect_ratio?: string;   // e.g. "16:9" (can't be used with resolution)
  resolution?: string;     // e.g. "1024x1024"
  rendering_speed?: RenderSpeed;
  num_images?: number;     // 1..8
  seed?: number;
  style_preset?: string;   // see docs for enumerations
  style_type?: "AUTO" | "GENERAL" | "REALISTIC" | "DESIGN" | "FICTION";
  negative_prompt?: string;
  // Buffers for style/character refs (<=10MB total)
  style_reference_images?: { filename: string; data: Buffer; contentType?: string }[];
  character_reference_images?: { filename: string; data: Buffer; contentType?: string }[];
  character_reference_images_mask?: { filename: string; data: Buffer; contentType?: string }[];
};

export type FilePart = { filename: string; data: Buffer; contentType?: string };

function authHeaders() {
  const key = process.env.IDEOGRAM_API_KEY!;
  return { "Api-Key": key };
}

async function sendMultipart(endpoint: string, form: FormData) {
  const res = await fetch(`${IDEO_BASE}${endpoint}`, {
    method: "POST",
    headers: { ...authHeaders(), ...form.getHeaders() },
    body: form as any,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ideogram ${endpoint} ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ data?: { url: string }[]; descriptions?: { text: string }[] }>;
}

// ---- Generate (text-to-image) ----
export async function ideogramGenerate(opts: GenerateOptions) {
  const form = new FormData();
  form.append("prompt", opts.prompt);
  if (opts.aspect_ratio) form.append("aspect_ratio", opts.aspect_ratio);
  if (opts.resolution)   form.append("resolution", opts.resolution);
  if (opts.rendering_speed) form.append("rendering_speed", opts.rendering_speed);
  if (opts.num_images)   form.append("num_images", String(opts.num_images));
  if (opts.seed !== undefined) form.append("seed", String(opts.seed));
  if (opts.style_preset) form.append("style_preset", opts.style_preset);
  if (opts.style_type)   form.append("style_type", opts.style_type);
  if (opts.negative_prompt) form.append("negative_prompt", opts.negative_prompt);

  for (const f of opts.style_reference_images ?? []) {
    form.append("style_reference_images", f.data, { filename: f.filename, contentType: f.contentType ?? "image/png" });
  }
  for (const f of opts.character_reference_images ?? []) {
    form.append("character_reference_images", f.data, { filename: f.filename, contentType: f.contentType ?? "image/png" });
  }
  for (const f of opts.character_reference_images_mask ?? []) {
    form.append("character_reference_images_mask", f.data, { filename: f.filename, contentType: f.contentType ?? "image/png" });
  }

  return sendMultipart("/v1/ideogram-v3/generate", form);
}

// ---- Edit (image+mask) ----
export async function ideogramEdit(params: {
  image: FilePart; mask: FilePart; prompt: string;
  rendering_speed?: RenderSpeed; seed?: number; num_images?: number;
  style_preset?: string; style_type?: GenerateOptions["style_type"];
}) {
  const form = new FormData();
  form.append("image", params.image.data, { filename: params.image.filename, contentType: params.image.contentType ?? "image/png" });
  form.append("mask",  params.mask.data,  { filename: params.mask.filename,  contentType: params.mask.contentType  ?? "image/png" });
  form.append("prompt", params.prompt);
  if (params.rendering_speed) form.append("rendering_speed", params.rendering_speed);
  if (params.seed !== undefined) form.append("seed", String(params.seed));
  if (params.num_images) form.append("num_images", String(params.num_images));
  if (params.style_preset) form.append("style_preset", params.style_preset);
  if (params.style_type)   form.append("style_type", params.style_type);

  return sendMultipart("/v1/ideogram-v3/edit", form);
}

// ---- Reframe (square image -> target resolution) ----
export async function ideogramReframe(params: {
  image: FilePart; resolution: string; rendering_speed?: RenderSpeed; seed?: number; num_images?: number; style_preset?: string;
}) {
  const form = new FormData();
  form.append("image", params.image.data, { filename: params.image.filename, contentType: params.image.contentType ?? "image/png" });
  form.append("resolution", params.resolution);
  if (params.rendering_speed) form.append("rendering_speed", params.rendering_speed);
  if (params.seed !== undefined) form.append("seed", String(params.seed));
  if (params.num_images) form.append("num_images", String(params.num_images));
  if (params.style_preset) form.append("style_preset", params.style_preset);

  return sendMultipart("/v1/ideogram-v3/reframe", form);
}

// ---- Replace Background ----
export async function ideogramReplaceBg(params: {
  image: FilePart; prompt: string; rendering_speed?: RenderSpeed; seed?: number; num_images?: number; style_preset?: string;
}) {
  const form = new FormData();
  form.append("image", params.image.data, { filename: params.image.filename, contentType: params.image.contentType ?? "image/png" });
  form.append("prompt", params.prompt);
  if (params.rendering_speed) form.append("rendering_speed", params.rendering_speed);
  if (params.seed !== undefined) form.append("seed", String(params.seed));
  if (params.num_images) form.append("num_images", String(params.num_images));
  if (params.style_preset) form.append("style_preset", params.style_preset);

  return sendMultipart("/v1/ideogram-v3/replace-background", form);
}

// ---- Upscale ----
export async function ideogramUpscale(params: {
  image: FilePart; image_request?: { resemblance?: number; detail?: number; prompt?: string };
}) {
  const form = new FormData();
  form.append("image_file", params.image.data, { filename: params.image.filename, contentType: params.image.contentType ?? "image/png" });
  if (params.image_request) form.append("image_request", JSON.stringify(params.image_request));
  return sendMultipart("/upscale", form);
}

// ---- Describe ----
export async function ideogramDescribe(image: FilePart, modelVersion: "V_2"|"V_3" = "V_3") {
  const form = new FormData();
  form.append("image_file", image.data, { filename: image.filename, contentType: image.contentType ?? "image/png" });
  form.append("describe_model_version", modelVersion);
  return sendMultipart("/describe", form);
}
