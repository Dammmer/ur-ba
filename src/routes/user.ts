import express from 'express';
import User from '../models/Users';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authRole';
import { verifyAuthToken } from '../utils/jwt';

const router = express.Router();

const PUBLIC_PROFILE_FIELDS = '-passwordHash';
const USER_ROLES = ['student', 'teacher', 'admin'];
const LEVELS = ['none', 'beginner', 'intermediate', 'advanced', 'speaking'];

function pick(source: any, fields: string[]) {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (source[field] !== undefined) {
      result[field] = source[field];
    }
  }
  return result;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
}

async function getRequester(authHeader?: string) {
  const token = authHeader?.split(' ')[1];
  if (!token) return null;

  const decoded = verifyAuthToken(token);
  const user = await User.findById(decoded.id, PUBLIC_PROFILE_FIELDS);
  if (!user || user.blocked || user.active === false) return null;

  return {
    id: String(user._id),
    role: user.role,
  };
}

router.post('/check-duplicate', async (req, res) => {
  const { username, email } = req.body;
  try {
    const userByUsername = await User.findOne({ username });
    const userByEmail = await User.findOne({ email: String(email || '').trim().toLowerCase() });
    if (userByUsername || userByEmail) {
      return res.status(409).json({ error: 'User with this data already exists' });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authorizeRole(['admin', 'teacher']), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }, PUBLIC_PROFILE_FIELDS);
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const {
      login,
      password,
      username,
      firstName,
      lastName,
      phone,
      country,
      language,
      photo,
      gender,
      telegram,
      whatsapp,
      email,
      birthday,
    } = req.body;

    function isFilled(val: any) {
      return typeof val === 'string' ? val.trim().length > 0 : !!val;
    }
    if (![login, password, username, firstName, lastName, phone, country, language, email].every(isFilled)) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    let requester: any = null;
    if (req.headers.authorization) {
      requester = await getRequester(req.headers.authorization);
      if (!requester) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    const isAdmin = requester?.role === 'admin';
    const requestedRole = USER_ROLES.includes(req.body.role) ? req.body.role : 'student';
    const role = isAdmin ? requestedRole : 'student';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      passwordHash,
      firstName,
      lastName,
      phone,
      country,
      language,
      photo,
      role,
      level: isAdmin && LEVELS.includes(req.body.level) ? req.body.level : role === 'teacher' ? 'speaking' : 'none',
      access: isAdmin ? toBoolean(req.body.access) : false,
      active: isAdmin && req.body.active !== undefined ? toBoolean(req.body.active) : true,
      blocked: isAdmin && req.body.blocked !== undefined ? toBoolean(req.body.blocked) : false,
      emailVerified: isAdmin && req.body.emailVerified !== undefined ? toBoolean(req.body.emailVerified) : false,
      lastLogin: new Date(),
      gender: gender || 'male',
      telegram,
      whatsapp,
      email: String(email).trim().toLowerCase(),
      birthday,
      createdAt: new Date(),
    });

    await user.save();
    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return res.status(201).json(userObj);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'User with this data already exists' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/:id', authenticate, async (req: any, res) => {
  try {
    if (req.user.id !== req.params.id && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await User.findById(req.params.id, PUBLIC_PROFILE_FIELDS);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid id format' });
  }
});

router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';
    if (!isSelf && !isAdmin && !isTeacher) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let updates: Record<string, unknown> = {};
    if (isAdmin) {
      updates = pick(req.body, [
        'firstName', 'lastName', 'phone', 'country', 'language', 'photo', 'gender',
        'telegram', 'whatsapp', 'birthday', 'notes', 'status', 'cardColor',
      ]);
      if (req.body.email !== undefined) updates.email = String(req.body.email).trim().toLowerCase();
      if (USER_ROLES.includes(req.body.role)) updates.role = req.body.role;
      if (LEVELS.includes(req.body.level)) updates.level = req.body.level;
      for (const field of ['active', 'access', 'blocked', 'emailVerified']) {
        if (req.body[field] !== undefined) updates[field] = toBoolean(req.body[field]);
      }
    } else if (isTeacher) {
      if (user.role !== 'student' && !isSelf) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      updates = pick(req.body, ['notes', 'status', 'cardColor']);
    } else if (isSelf) {
      updates = pick(req.body, ['status', 'cardColor', 'telegram', 'whatsapp', 'photo']);
      if (req.body.active !== undefined) updates.active = toBoolean(req.body.active);
    }

    Object.assign(user, updates);

    const { completedLessonId } = req.body;
    if ((isSelf || isAdmin) && completedLessonId) {
      const alreadyDone = user.completedLessons.find((id: any) => id.toString() === completedLessonId);
      if (!alreadyDone) {
        user.completedLessons.push(completedLessonId);
        user.coursesCompleted = (user.coursesCompleted || 0) + 1;
      }
    }

    await user.save();
    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return res.json(userObj);
  } catch (err) {
    return res.status(500).json({ error: 'Error updating user' });
  }
});

export default router;
