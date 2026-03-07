import type { Request, Response } from 'express';
import type { TodoService } from '../domain/TodoService';

export function makeGetItems(todoService: TodoService) {
    return async (req: Request, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        const projectId = req.query.projectId as string | undefined;
        const items = await todoService.listTodos(userId, projectId);
        res.send(items);
    };
}
