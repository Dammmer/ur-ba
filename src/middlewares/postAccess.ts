import { Request, Response, NextFunction } from 'express';
import { PostCategory } from '../models/Post';
import { authenticate } from './authenticate';

const ALLOWED_ROLES: Record<PostCategory, string[]> = {
  question: ['student', 'teacher', 'admin'],
  discussion: ['student', 'teacher', 'admin'],
  news: ['teacher', 'admin'],
  history: ['teacher', 'admin'],
};

export function canCreatePost(req: Request, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    const user = (req as any).user;
    const category: PostCategory = req.body.category;
    if (!category || !ALLOWED_ROLES[category]) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (!ALLOWED_ROLES[category].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  });
}
