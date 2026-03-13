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
