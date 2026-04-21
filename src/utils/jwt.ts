import jwt from 'jsonwebtoken';

export interface AuthTokenPayload {
  id: string;
  email?: string;
  username?: string;
  role: string;
  level?: string;
  access?: boolean;
  emailVerified?: boolean;
  blocked?: boolean;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must be configured and at least 32 characters long');
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1d' });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}
