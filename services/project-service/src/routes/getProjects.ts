import type { Request, Response } from 'express';
import type { ProjectService } from '../domain/ProjectService';

export function makeGetProjects(projectService: ProjectService) {
    return async (req: Request, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        const projects = await projectService.listProjects(userId);
        res.json(projects);
    };
}
