import { describe, expect, it, vi, beforeEach } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("../api", () => ({
  apiFetch: apiFetchMock,
  getApiUrl: (path: string) => path,
}));

vi.mock("../tokenManager", () => ({
  ensureValidToken: vi.fn().mockResolvedValue("token"),
}));

import {
  cloneElevenLabsVoice,
  fetchElevenLabsVoices,
  generateElevenLabsSpeech,
} from "../audioApi";

describe("audioApi helpers", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("requests ElevenLabs voices via backend proxy", async () => {
    apiFetchMock.mockResolvedValue({ success: true, voices: [] });

    const result = await fetchElevenLabsVoices();

    expect(apiFetchMock).toHaveBeenCalledWith("/api/audio/voices", {
      method: "GET",
    });
    expect(result).toEqual({ success: true, voices: [] });
  });

  it("requires a script before generating speech", async () => {
    await expect(
      generateElevenLabsSpeech({ text: "   " }),
    ).rejects.toThrow("A script is required to generate speech.");
  });

  it("requires a file for cloning voices", async () => {
    await expect(
      cloneElevenLabsVoice(undefined as unknown as File),
    ).rejects.toThrow("A voice sample file is required.");
  });
});



