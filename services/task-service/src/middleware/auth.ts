import type { Request, Response, NextFunction } from 'express';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        const response = await fetch(`${AUTH_SERVICE_URL}/auth/verify`, {
            headers: { Authorization: authHeader },
        });

        if (!response.ok) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        const data = await response.json() as { userId: string };
        (req as any).userId = data.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Auth service unavailable' });
    }
}