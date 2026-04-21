import express from 'express';
import Course from '../models/Course';
import { authorizeRole } from '../middlewares/authRole';

const router = express.Router();

function pickCourseFields(body: any) {
  const result: Record<string, unknown> = {};
  for (const field of ['name', 'image', 'level', 'duration', 'content', 'parentModuleId']) {
    if (body[field] !== undefined) result[field] = body[field];
  }
  return result;
}

router.post('/', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const course = new Course({
      ...pickCourseFields(req.body),
      createdBy: req.user.id,
    });
    await course.save();
    return res.status(201).json(course);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await course.deleteOne();
    return res.json({ message: 'Course deleted' });
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (req.user.role !== 'admin' && course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    Object.assign(course, pickCourseFields(req.body));
    await course.save();
    return res.json(course);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    return res.json(courses);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    return res.json(course);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

export default router;
