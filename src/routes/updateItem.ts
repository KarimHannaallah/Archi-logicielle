import { Request, Response } from 'express';

export function makeUpdateItem(persistence: any) {
    return async (req: Request, res: Response) => {
        await persistence.update(req.params.id, {
            name: req.body.name,
            completed: req.body.completed,
        });
        const item = await persistence.getById(req.params.id);
        res.send(item);
    };
}