import { Request, Response } from 'express';

export function makeGetItems(persistence: any) {
    return async (_req: Request, res: Response) => {
        const items = await persistence.getAll();
        res.send(items);
    };
}