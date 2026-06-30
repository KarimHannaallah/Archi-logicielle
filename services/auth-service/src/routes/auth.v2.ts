import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import type { AuthService } from '../domain/AuthService';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});

const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function makeAuthV2Router(authService: AuthService): Router {
    const router = Router();

    // POST /v2/auth/register — birthDate is required
    router.post('/register', authLimiter, async (req, res) => {
        try {
            const { email, name, password, consent, birthDate } = req.body;
            if (!email || !name || !password) {
                res.status(400).json({ error: 'Email, name and password are required' });
                return;
            }
            if (!birthDate || !BIRTH_DATE_RE.test(birthDate)) {
                res.status(400).json({ error: 'birthDate is required and must be in YYYY-MM-DD format' });
                return;
            }
            const user = await authService.register(email, name, password, consent ?? false, birthDate);
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
            res.status(201).json({
                token,
                user: { id: user.id, email: user.email, name: user.name, birthDate: user.birthDate },
            });
        } catch (err: any) {
            if (err.message === 'Email already in use') {
                res.status(409).json({ error: err.message });
                return;
            }
            if (err.message.includes('Consent')) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}