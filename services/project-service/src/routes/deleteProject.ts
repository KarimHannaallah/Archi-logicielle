import type { Request, Response } from 'express';
import type { ProjectService } from '../domain/ProjectService';

export function makeDeleteProject(projectService: ProjectService) {
    return async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        await projectService.deleteProject(req.params.id, userId);
        res.sendStatus(200);
    };
}
