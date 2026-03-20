import type { Request, Response } from 'express';
import type { ProjectService } from '../domain/ProjectService';

export function makeGetProject(projectService: ProjectService) {
    return async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        const project = await projectService.getProject(req.params.id, userId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(project);
    };
}
