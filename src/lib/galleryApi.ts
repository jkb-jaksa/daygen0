import { apiRequest } from "./apiClient";

export type GalleryEntry = {
  id: string;
  ownerAuthId: string;
  templateId: string | null;
  assetUrl: string;
  metadata: Record<string, unknown> | null;
  status: 'ACTIVE' | 'REMOVED';
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  items: GalleryEntry[];
  nextCursor: string | null;
};

export async function fetchGallery(token: string, cursor?: string, limit = 50): Promise<ListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const path = `/gallery${params.toString() ? `?${params.toString()}` : ""}`;
  return apiRequest<ListResponse>(path, { method: "GET" }, token);
}

export async function createGalleryEntry(
  token: string,
  payload: { assetUrl: string; templateId?: string | null; metadata?: Record<string, unknown> },
): Promise<GalleryEntry> {
  return apiRequest<GalleryEntry>(
    "/gallery",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteGalleryEntry(token: string, id: string): Promise<void> {
  await apiRequest(`/gallery/${id}`, { method: "DELETE" }, token);
}
