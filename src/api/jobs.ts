import { apiFetch } from '../utils/api';

export interface JobVersion {
    id: string;
    jobId: string;
    resultUrl: string;
    createdAt: string;
}

export interface Job {
    id: string;
    type: string;
    status: string;
    progress: number;
    resultUrl?: string;
    error?: string;
    metadata?: Record<string, unknown>;
    versions?: JobVersion[];
    createdAt: string;
}

export async function fetchJobs(type?: string): Promise<Job[]> {
    // Assuming there is an endpoint to list jobs, possibly filtered by type
    // If not, we might need to fetch all and filter client-side or add a query param
    // Based on standard REST patterns often used:
    const url = type ? `/api/jobs?type=${type}` : '/api/jobs';
    // Note: The backend might not support ?type=... yet. 
    // If it doesn't, we'll fetch all and filter.
    // Let's try to fetch all first if we are unsure, but usually filtering is supported.
    // Checking backend logs earlier: "Mapped {/api/jobs, GET} route"


    return apiFetch<Job[]>(url);
}

export async function getJob(id: string): Promise<Job> {
    return apiFetch<Job>(`/api/timeline/${id}`);
}

