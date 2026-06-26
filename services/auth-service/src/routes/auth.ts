import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import type { AuthService } from '../domain/AuthService';
import { authMiddleware } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Rate limiter strict pour les routes sensibles (login, register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});
// Rate limiter souple pour les routes authentifiées
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});

export function makeAuthRouter(authService: AuthService): Router {
    const router = Router();

    router.post('/register', authLimiter, async (req, res) => {
        try {
            const { email, name, password, consent } = req.body;
            if (!email || !name || !password) {
                res.status(400).json({ error: 'Email, name and password are required' });
                return;
            }
            const user = await authService.register(email, name, password, consent ?? false);
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
            res.status(201).json({
                token,
                user: { id: user.id, email: user.email, name: user.name },
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

    router.post('/login', authLimiter, async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ error: 'Email and password are required' });
                return;
            }
            const user = await authService.login(email, password);
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
            res.json({
                token,
                user: { id: user.id, email: user.email, name: user.name },
            });
        } catch (err: any) {
            if (err.message === 'Invalid credentials') {
                res.status(401).json({ error: err.message });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/logout', apiLimiter, (_req, res) => {
        res.json({ message: 'Logged out successfully' });
    });

    router.get('/profile', apiLimiter, authMiddleware, async (req: any, res) => {
        try {
            const user = await authService.getProfile(req.userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
                consentGiven: user.consentGiven,
            });
        } catch {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.put('/profile', apiLimiter, authMiddleware, async (req: any, res) => {
        try {
            const { name, email } = req.body;
            if (!name || !email) {
                res.status(400).json({ error: 'Name and email are required' });
                return;
            }
            const user = await authService.updateProfile(req.userId, { name, email });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
                consentGiven: user.consentGiven,
            });
        } catch (err: any) {
            if (err.message === 'Email already in use') {
                res.status(409).json({ error: err.message });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.delete('/profile', apiLimiter, authMiddleware, async (req: any, res) => {
        try {
            await authService.deleteAccount(req.userId);
            res.json({ message: 'Account deleted successfully' });
        } catch {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.get('/verify', apiLimiter, authMiddleware, (req: any, res) => {
        res.json({ valid: true, userId: req.userId });
    });

    return router;
}