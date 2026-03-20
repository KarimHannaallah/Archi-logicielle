import type { Request, Response } from 'express';
import { getNotificationsForUser } from '../store/notificationStore';

export function makeGetNotifications() {
    return (req: Request, res: Response): void => {
        const userId = (req as any).userId as string;
        const notifications = getNotificationsForUser(userId);
        res.json(notifications);
    };
}
