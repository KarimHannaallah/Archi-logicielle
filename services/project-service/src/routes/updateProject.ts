import type { Request, Response } from 'express';
import type { ProjectService } from '../domain/ProjectService';

export function makeUpdateProject(projectService: ProjectService) {
    return async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        await projectService.updateProject(req.params.id, userId, { name: req.body.name });
        const project = await projectService.getProject(req.params.id, userId);
        res.json(project);
    };
}
