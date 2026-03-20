import type { Request, Response } from 'express';
import { markAllRead } from '../store/notificationStore';

export function makeMarkNotificationsRead() {
    return (req: Request, res: Response): void => {
        const userId = (req as any).userId as string;
        markAllRead(userId);
        res.json({ ok: true });
    };
}
