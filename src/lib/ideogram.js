import { Readable } from "node:stream";
import { fetch, FormData } from "undici";

const IDEO_BASE = "https://api.ideogram.ai";

function authHeaders() {
  const key = process.env.IDEOGRAM_API_KEY;
  return { "Api-Key": key };
}

async function sendMultipart(endpoint, form) {
  const res = await fetch(`${IDEO_BASE}${endpoint}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ideogram ${endpoint} ${res.status}: ${text}`);
  }
  return res.json();
}

// ---- Generate (text-to-image) ----
export async function ideogramGenerate(opts) {
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
export async function ideogramEdit(params) {
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
export async function ideogramReframe(params) {
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
export async function ideogramReplaceBg(params) {
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
export async function ideogramUpscale(params) {
  const form = new FormData();
  form.append("image_file", params.image.data, { filename: params.image.filename, contentType: params.image.contentType ?? "image/png" });
  if (params.image_request) form.append("image_request", JSON.stringify(params.image_request));
  return sendMultipart("/upscale", form);
}

// ---- Describe ----
export async function ideogramDescribe(image, modelVersion = "V_3") {
  const form = new FormData();
  form.append("image_file", image.data, { filename: image.filename, contentType: image.contentType ?? "image/png" });
  form.append("describe_model_version", modelVersion);
  return sendMultipart("/describe", form);
}
