import type { Request, Response } from 'express';
import type { TodoService } from '../domain/TodoService';

export function makeAddItem(todoService: TodoService) {
    return async (req: Request, res: Response): Promise<void> => {
        const userId: string = (req as any).userId || '';
        const projectId: string = req.body.projectId || '';
        const item = await todoService.createTodo(req.body.name, userId, projectId);
        res.send(item);
    };
}
