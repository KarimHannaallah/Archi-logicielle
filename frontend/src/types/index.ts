export interface TodoItem {
    id: string;
    name: string;
    completed: boolean;
    userId?: string;
    projectId?: string;
}

export interface Project {
    id: string;
    name: string;
    userId: string;
    status: 'open' | 'closed';
    totalTasks: number;
    completedTasks: number;
    createdAt: string;
}

export interface Notification {
    id: string;
    eventType: string;
    eventId: string;
    message: string;
    userId: string;
    projectId: string;
    taskId?: string;
    createdAt: string;
    read: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    consentGiven: boolean;
}

export interface AuthResponse {
    token: string;
    user: { id: string; email: string; name: string };
}
