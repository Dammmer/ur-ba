import { Router } from 'express';
import Post, { PostCategory } from '../models/Post';
import Comment from '../models/Comment';
import { canCreatePost } from '../middlewares/postAccess';
import { authorizeRole } from '../middlewares/authRole';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

function pickPostFields(body: any) {
  const result: Record<string, unknown> = {};
  for (const field of ['title', 'content']) {
    if (body[field] !== undefined) result[field] = body[field];
  }
  return result;
}

// GET /api/posts?category=question
router.get('/', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.category) {
      filter.category = req.query.category as PostCategory;
    }
    const posts = await Post.find(filter).populate('author', 'firstName lastName role photo');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/:id
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName role photo')
      .populate({ path: 'comments', populate: { path: 'author', select: 'firstName lastName role photo' } });
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts  (role-based via canCreatePost)
router.post('/', canCreatePost, async (req: any, res) => {
  try {
    const { title, content, category } = req.body;
    const newPost = await Post.create({
      title,
      content,
      category,
      author: req.user.id,
    });
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/posts/:id  (teacher/admin or author)
router.patch('/:id', authorizeRole(['teacher', 'admin', 'student']), async (req: any, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    // only author or elevated role
    if (post.author.toString() !== req.user.id && !['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    post.set(pickPostFields(req.body));
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id (teacher/admin or author)
router.delete('/:id', authorizeRole(['teacher', 'admin', 'student']), async (req: any, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.author.toString() !== req.user.id && !['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', authenticate, async (req: any, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const newComment = await Comment.create({ content, author: req.user.id, post: post._id });
    post.comments.push(newComment._id as mongoose.Types.ObjectId);
    await post.save();
    const populated = await newComment.populate('author', 'firstName lastName role photo');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/comments/:commentId
router.delete('/comments/:commentId', authenticate, async (req: any, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Not found' });
    if (comment.author.toString() !== req.user.id && !['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
    await comment.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
