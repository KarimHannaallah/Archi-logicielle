const API_BASE = '/api';

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

// --- Projects ---
import type { Project, TodoItem, Notification } from '../types';

export const getProjects = () => apiGet<Project[]>('/projects');
export const createProject = (name: string) => apiPost<Project>('/projects', { name });
export const getProject = (id: string) => apiGet<Project>(`/projects/${id}`);
export const deleteProject = (id: string) => apiDelete(`/projects/${id}`);
export const getTasksByProject = (projectId: string) =>
    apiGet<TodoItem[]>(`/items?projectId=${projectId}`);

// --- Notifications ---
export const getNotifications = () => apiGet<Notification[]>('/notifications');
export const markNotificationsRead = () => apiPut<void>('/notifications/read', {});
