import { Request, Response, NextFunction } from 'express';
import { authenticate } from './authenticate';

export function authorizeRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, () => {
      const user = (req as any).user;
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    });
  };
}
