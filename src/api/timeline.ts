import type { Segment } from '../stores/timelineStore';
import { apiFetch } from '../utils/api';

export interface TimelineResponse {
    segments: Segment[];
    audioUrl: string;
}

export async function generateTimeline(topic: string, style: string): Promise<TimelineResponse> {
    return apiFetch<TimelineResponse>('/api/timeline/generate', {
        method: 'POST',
        body: { topic, style },
    });
}
