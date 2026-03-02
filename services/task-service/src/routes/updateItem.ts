import type { Request, Response } from 'express';
import type { TodoService } from '../domain/TodoService';

export function makeUpdateItem(todoService: TodoService) {
    return async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        await todoService.updateTodo(
            userId,
            req.params.id,
            req.body.name,
            req.body.completed,
        );
        const item = await todoService.getTodo(userId, req.params.id);
        res.send(item);
    };
}
