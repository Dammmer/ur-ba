import { Request, Response, NextFunction } from 'express';
import User from '../models/Users';
import { verifyAuthToken } from '../utils/jwt';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid token' });

  try {
    const decoded = verifyAuthToken(token);
    const user = await User.findById(decoded.id, '-passwordHash');
    if (!user || user.blocked || user.active === false) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    (req as any).user = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      role: user.role,
      level: user.level,
      access: user.access,
      emailVerified: user.emailVerified,
      blocked: user.blocked,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
