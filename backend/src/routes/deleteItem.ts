import type { Request, Response } from 'express';
import type { TodoService } from '../domain/TodoService';

export function makeDeleteItem(todoService: TodoService) {
    return async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        await todoService.deleteTodo(req.params.id);
        res.sendStatus(200);
    };
}
