export interface TodoItem {
    id: string;
    name: string;
    completed: boolean;
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
