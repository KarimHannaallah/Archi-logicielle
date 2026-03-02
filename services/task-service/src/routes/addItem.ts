import type { Request, Response } from 'express';
import type { TodoService } from '../domain/TodoService';

export function makeAddItem(todoService: TodoService) {
    return async (req: Request, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        const item = await todoService.createTodo(userId, req.body.name);
        res.send(item);
    };
}
