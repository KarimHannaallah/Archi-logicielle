export interface User {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: string;
    consentGiven: boolean;
}
