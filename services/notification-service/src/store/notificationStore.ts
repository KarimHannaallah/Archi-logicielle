import type { Notification } from '../domain/Notification';

const MAX_NOTIFICATIONS = 1000;
const store: Notification[] = [];

export function addNotification(notification: Notification): void {
    store.unshift(notification);
    if (store.length > MAX_NOTIFICATIONS) {
        store.pop();
    }
}

export function getNotificationsForUser(userId: string): Notification[] {
    return store.filter(n => n.userId === userId);
}

export function markAllRead(userId: string): void {
    store.forEach(n => {
        if (n.userId === userId) n.read = true;
    });
}
