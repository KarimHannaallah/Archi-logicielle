const API_BASE = '';

function getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function apiDelete(path: string): Promise<void> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `${res.status} ${res.statusText}`);
    }
}

// --- Projects API ---
import type { Project, TodoItem } from '../types';

export function getProjects(): Promise<Project[]> {
    return apiGet<Project[]>('/projects');
}

export function getProject(id: string): Promise<Project> {
    return apiGet<Project>(`/projects/${id}`);
}

export function createProject(name: string): Promise<Project> {
    return apiPost<Project>('/projects', { name });
}

export function deleteProject(id: string): Promise<void> {
    return apiDelete(`/projects/${id}`);
}

export function getTasksByProject(projectId: string): Promise<TodoItem[]> {
    return apiGet<TodoItem[]>(`/items?projectId=${projectId}`);
}
