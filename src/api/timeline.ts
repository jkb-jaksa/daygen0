import type { Job } from './jobs';
import { apiFetch } from '../utils/api';

export interface TimelineResponse {
    segments: any[]; // Using any[] to avoid circular dependency if Segment is not exported or complex, but ideally import Segment
    audioUrl: string;
}

export async function generateTimeline(topic: string, style: string, duration: 'short' | 'medium' | 'long' = 'medium'): Promise<Job> {
    return apiFetch<Job>('/api/timeline/generate', {
        method: 'POST',
        body: { topic, style, duration },
    });
}
