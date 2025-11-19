import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({
  apiFetch: vi.fn(),
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
import * as apiModule from "../api";

describe("audioApi helpers", () => {
  const apiFetchMock = vi.mocked(apiModule.apiFetch);

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



