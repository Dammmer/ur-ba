import express from 'express';
import Event from '../models/Event';
import { authorizeRole } from '../middlewares/authRole';

const router = express.Router();

function pickEventFields(body: any) {
  const result: Record<string, unknown> = {};
  for (const field of ['title', 'description', 'date', 'location', 'image']) {
    if (body[field] !== undefined) result[field] = body[field];
  }
  return result;
}

router.get('/', async (req, res) => {
  const events = await Event.find();
  return res.json(events);
});

router.post('/', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const event = new Event({ ...pickEventFields(req.body), createdBy: req.user.id });
    await event.save();
    return res.status(201).json(event);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await event.deleteOne();
    return res.json({ message: 'Event deleted' });
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authorizeRole(['admin', 'teacher']), async (req: any, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    Object.assign(event, pickEventFields(req.body));
    await event.save();
    return res.json(event);
  } catch (err) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }
});

export default router;
