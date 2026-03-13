import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token required' });
        return;
    }
    try {
        const token = header.slice(7);
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
        (req as any).userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}
