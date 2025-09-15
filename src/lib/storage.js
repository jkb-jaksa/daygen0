import { fetch } from "undici";

export async function persistIdeogramUrl(url, key) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download failed ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const contentType = r.headers.get("content-type") ?? "image/png";
  
  // Convert to base64 data URL for direct use
  const base64 = buf.toString('base64');
  return `data:${contentType};base64,${base64}`;
}
