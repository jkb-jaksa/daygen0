import type { Job } from './jobs';
import { apiFetch } from '../utils/api';
import type { Segment } from '../stores/timelineStore';

export interface TimelineResponse {
    segments: Segment[];
    audioUrl: string;
}


export async function generateTimeline(topic: string, style: string, duration: 'short' | 'medium' | 'long' = 'medium'): Promise<Job> {
    return apiFetch<Job>('/api/timeline/generate', {
        method: 'POST',
        body: { topic, style, duration },
    });
}

export async function regenerateSegment(jobId: string, segmentIndex: number, text?: string, prompt?: string, motionPrompt?: string): Promise<any> {
    return apiFetch<any>(`/api/timeline/${jobId}/segments/${segmentIndex}/regenerate`, {
        method: 'POST',
        body: { text, prompt, motionPrompt }, // Only send what is defined
    });
}
