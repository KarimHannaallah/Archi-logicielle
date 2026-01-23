import { Request, Response } from 'express';

export function makeDeleteItem(persistence: any) {
    return async (req: Request, res: Response) => {
        await persistence.remove(req.params.id);
        res.sendStatus(200);
    };
}