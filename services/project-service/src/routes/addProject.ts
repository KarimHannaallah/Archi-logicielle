import type { Request, Response } from 'express';
import type { ProjectService } from '../domain/ProjectService';

export function makeAddProject(projectService: ProjectService) {
    return async (req: Request, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        const project = await projectService.createProject(req.body.name, userId);
        res.json(project);
    };
}
