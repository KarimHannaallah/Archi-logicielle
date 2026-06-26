import express from 'express';
import rateLimit from 'express-rate-limit';
import type { ProjectService } from './domain/ProjectService';
import { makeGetProjects } from './routes/getProjects';
import { makeAddProject } from './routes/addProject';
import { makeUpdateProject } from './routes/updateProject';
import { makeDeleteProject } from './routes/deleteProject';
import { makeGetProject } from './routes/getProject';
import { authMiddleware } from '@archi/shared-auth';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

interface AppOptions {
    enableAuth?: boolean;
}

export function createApp(projectService: ProjectService, options?: AppOptions) {
    const app = express();
    app.use(express.json());

    if (options?.enableAuth === false) {
        app.get('/projects', makeGetProjects(projectService));
        app.get('/projects/:id', makeGetProject(projectService));
        app.post('/projects', makeAddProject(projectService));
        app.put('/projects/:id', makeUpdateProject(projectService));
        app.delete('/projects/:id', makeDeleteProject(projectService));
    } else {
        app.get('/projects', apiLimiter, authMiddleware, makeGetProjects(projectService));
        app.get('/projects/:id', apiLimiter, authMiddleware, makeGetProject(projectService));
        app.post('/projects', apiLimiter, authMiddleware, makeAddProject(projectService));
        app.put('/projects/:id', apiLimiter, authMiddleware, makeUpdateProject(projectService));
        app.delete('/projects/:id', apiLimiter, authMiddleware, makeDeleteProject(projectService));
    }

    return app;
}