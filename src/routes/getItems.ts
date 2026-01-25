import type { Request, Response } from 'express';
import type { TodoService } from '../domain/TodoService';

export function makeGetItems(todoService: TodoService) {
    return async (_req: Request, res: Response): Promise<void> => {
        const items = await todoService.listTodos();
        res.send(items);
    };
}
