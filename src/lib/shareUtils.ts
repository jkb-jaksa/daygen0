// Share utilities for generating remix URLs and handling clipboard operations

export function withUtm(url: string, source: "copy" | "qr") {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "share");
  u.searchParams.set("utm_campaign", "user_share");
  return u.toString();
}

export async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    // toast("Link copied")
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url; 
    document.body.appendChild(ta); 
    ta.select();
    document.execCommand("copy"); 
    document.body.removeChild(ta);
    // toast("Link copied")
  }
}

export function makeRemixUrl(baseUrl: string, prompt: string): string {
  const encoded = btoa(unescape(encodeURIComponent(prompt))).replace(/=+$/, "");
  return `${baseUrl.replace(/\/$/, "")}/app/image?from=share&prompt=${encoded}`;
}

export function decodeSharePrompt(encodedPrompt: string): string | null {
  try {
    return decodeURIComponent(escape(atob(encodedPrompt)));
  } catch {
    return null;
  }
}
