import type { Request, Response } from 'express';
import { getNotificationsForUser } from '../store/notificationStore';

export function makeGetNotifications() {
    return async (req: Request, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        const notifications = getNotificationsForUser(userId);
        res.json(notifications);
    };
}
