import express from 'express';
import type { ProjectService } from './domain/ProjectService';
import { makeGetProjects } from './routes/getProjects';
import { makeAddProject } from './routes/addProject';
import { makeUpdateProject } from './routes/updateProject';
import { makeDeleteProject } from './routes/deleteProject';
import { authMiddleware } from './middleware/auth';

interface AppOptions {
    enableAuth?: boolean;
}

export function createApp(projectService: ProjectService, options?: AppOptions) {
    const app = express();
    app.use(express.json());

    if (options?.enableAuth === false) {
        app.get('/projects', makeGetProjects(projectService));
        app.post('/projects', makeAddProject(projectService));
        app.put('/projects/:id', makeUpdateProject(projectService));
        app.delete('/projects/:id', makeDeleteProject(projectService));
    } else {
        app.get('/projects', authMiddleware, makeGetProjects(projectService));
        app.post('/projects', authMiddleware, makeAddProject(projectService));
        app.put('/projects/:id', authMiddleware, makeUpdateProject(projectService));
        app.delete('/projects/:id', authMiddleware, makeDeleteProject(projectService));
    }

    return app;
}