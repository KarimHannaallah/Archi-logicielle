import type { Request, Response } from 'express';
import type { TodoService } from '../domain/TodoService';

export function makeGetItems(todoService: TodoService) {
    return async (req: Request, res: Response): Promise<void> => {
        const userId = (req as any).userId;
        const items = await todoService.listTodos(userId);
        res.send(items);
    };
}
