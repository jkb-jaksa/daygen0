import { apiRequest } from "./apiClient";

export type R2File = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  prompt?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  items: R2File[];
  totalCount: number;
  nextCursor: string | null;
};

export async function fetchR2Files(token: string, cursor?: string, limit = 50): Promise<ListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit !== 50) params.set('limit', limit.toString());
  
  const path = `/r2files${params.toString() ? `?${params.toString()}` : ''}`;

  return apiRequest<ListResponse>(path, { method: "GET" }, token);
}

export async function createR2File(
  token: string,
  payload: { 
    fileName: string; 
    fileUrl: string; 
    fileSize?: number; 
    mimeType?: string; 
    prompt?: string; 
    model?: string; 
  },
): Promise<R2File> {
  return apiRequest<R2File>(
    "/r2files",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteR2File(token: string, id: string): Promise<void> {
  return apiRequest<void>(
    `/r2files/${id}`,
    {
      method: "DELETE",
    },
    token,
  );
}
