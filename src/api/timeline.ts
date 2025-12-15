import type { Job } from './jobs';
import { apiFetch } from '../utils/api';
import type { Segment } from '../stores/timelineStore';

export interface TimelineResponse {
    segments: Segment[];
    audioUrl: string;
}


export async function generateTimeline(
    topic: string,
    style: string,
    duration: 'short' | 'medium' | 'long' = 'medium',
    musicVolume: number = 0.3,
    referenceImageUrls?: string[],
    voiceId?: string,
    includeVoiceover: boolean = true,
    includeSubtitles: boolean = true
): Promise<Job> {
    return apiFetch<Job>('/api/timeline/generate', {
        method: 'POST',
        // Map includeVoiceover -> includeNarration (backend DTO expectation)
        body: { topic, style, duration, musicVolume, referenceImageUrls, voiceId, includeNarration: includeVoiceover, includeSubtitles },
    });
}

export async function regenerateSegment(
    jobId: string,
    segmentIndex: number,
    text?: string,
    prompt?: string,
    motionPrompt?: string,
    regenerateImage?: boolean,
    regenerateVideo?: boolean,
    regenerateAudio?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return apiFetch<any>(`/api/timeline/${jobId}/segments/${segmentIndex}/regenerate`, {
        method: 'POST',
        body: { text, prompt, motionPrompt, regenerateImage, regenerateVideo, regenerateAudio }, // Only send what is defined
    });
}

export async function revertSegment(
    jobId: string,
    segmentIndex: number,
    versionId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return apiFetch<any>(`/api/timeline/${jobId}/segments/${segmentIndex}/revert`, {
        method: 'POST',
        body: { versionId },
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function stitchTimeline(jobId: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return apiFetch<any>(`/api/timeline/${jobId}/stitch`, {
        method: 'POST',
    });
}
