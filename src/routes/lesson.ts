import express from 'express';
import Lesson from '../models/Lesson';
import Course from '../models/Course';
import { authorizeRole } from '../middlewares/authRole';
import { authenticate } from '../middlewares/authenticate';

const router = express.Router();

function pickLessonFields(body: any) {
  const result: Record<string, unknown> = {};
  for (const field of ['title', 'description', 'contentBlocks', 'order']) {
    if (body[field] !== undefined) result[field] = body[field];
  }
  return result;
}

function canReadLessonContent(user: any) {
  return ['admin', 'teacher'].includes(user.role) || (user.emailVerified && user.access);
}

router.post('/', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    if (!req.body.course || typeof req.body.course !== 'string' || !/^[0-9a-fA-F]{24}$/.test(req.body.course)) {
      return res.status(400).json({ error: 'Invalid course ID format' });
    }

    const course = await Course.findById(req.body.course);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const maxOrderLesson = await Lesson.findOne({ course: req.body.course }).sort({ order: -1 });
    const newOrder = maxOrderLesson ? maxOrderLesson.order + 1 : 1;

    const lesson = new Lesson({
      ...pickLessonFields(req.body),
      course: req.body.course,
      order: req.body.order || newOrder,
    });

    await lesson.save();
    return res.status(201).json(lesson);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.get('/course/:courseId', authenticate, async (req: any, res) => {
  try {
    if (!canReadLessonContent(req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const lessons = await Lesson.find({ course: req.params.courseId }).sort({ order: 1 });
    return res.json(lessons);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req: any, res) => {
  try {
    if (!canReadLessonContent(req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const lesson = await Lesson.findById(req.params.id).populate('course');
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    return res.json(lesson);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const course = await Course.findById(lesson.course);
    if (!course) {
      return res.status(404).json({ error: 'Associated course not found' });
    }
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    Object.assign(lesson, pickLessonFields(req.body));
    await lesson.save();
    return res.json(lesson);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const course = await Course.findById(lesson.course);
    if (!course) {
      return res.status(404).json({ error: 'Associated course not found' });
    }
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await lesson.deleteOne();
    return res.json({ message: 'Lesson deleted' });
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

export default router;
