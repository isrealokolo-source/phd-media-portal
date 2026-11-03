import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'phd-services-secure-jwt-signing-key-production-grade-2026';
const COOKIE_NAME = 'phd_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
  role: Role;
  isEmailVerified: boolean;
  avatarUrl: string | null;
  artistProfile?: {
    id: string;
    stageName: string;
    legalName: string;
  } | null;
} | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        artistProfile: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl,
      artistProfile: user.artistProfile
        ? {
            id: user.artistProfile.id,
            stageName: user.artistProfile.stageName,
            legalName: user.artistProfile.legalName,
          }
        : null,
    };
  } catch (err) {
    return null;
  }
}

export function isPhdAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'RELEASE_REVIEWER';
}

export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN';
}

export function canCountersign(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

