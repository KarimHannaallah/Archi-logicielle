import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

export function makeAddItem(persistence: any) {
    return async (req: Request, res: Response) => {
        const item = {
            id: uuid(),
            name: req.body.name,
            completed: false,
        };
        await persistence.add(item);
        res.send(item);
    };
}