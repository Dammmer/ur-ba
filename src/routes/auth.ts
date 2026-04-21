import express from 'express';
import User from '../models/Users';
import { comparePassword } from '../utils/hash';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { signAuthToken } from '../utils/jwt';

const router = express.Router();

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function createJwtToken(user: any) {
  return signAuthToken({
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
    level: user.level,
    access: user.access,
    emailVerified: user.emailVerified,
    blocked: user.blocked,
  });
}

const transporter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username || '' });
    if (!user) {
      return res.status(401).json({ error: 'No account with this data' });
    }
    if (user.blocked || user.active === false) {
      return res.status(403).json({ error: 'Account is disabled' });
    }
    const isMatch = await comparePassword(password, user.passwordHash || '');
    if (!isMatch) {
      return res.status(401).json({ error: 'incorrect password' });
    }
    const token = createJwtToken(user);
    return res.json({ token, role: user.role, username: user.username, id: user._id, emailVerified: user.emailVerified });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/send-verification-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ error: 'Email service is not configured' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const code = crypto.randomInt(100000, 1000000).toString();
  verificationCodes.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + VERIFICATION_TTL_MS,
    attempts: 0,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: normalizedEmail,
      subject: 'Email Verification',
      text: `Your verification code is: ${code}`,
    });
    return res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send verification email' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const storedCode = verificationCodes.get(normalizedEmail);
  if (!storedCode || storedCode.expiresAt < Date.now()) {
    verificationCodes.delete(normalizedEmail);
    return res.status(404).json({ error: 'No verification code found for this email' });
  }
  if (storedCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    verificationCodes.delete(normalizedEmail);
    return res.status(429).json({ error: 'Too many verification attempts' });
  }

  if (storedCode.code !== String(code)) {
    storedCode.attempts += 1;
    return res.status(401).json({ error: 'Invalid verification code' });
  }

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    { emailVerified: true },
    { new: true }
  );
  if (!user) {
    verificationCodes.delete(normalizedEmail);
    return res.status(404).json({ error: 'User not found' });
  }

  verificationCodes.delete(normalizedEmail);
  const token = createJwtToken(user);
  return res.status(200).json({ message: 'Email verified', token });
});

export default router;
