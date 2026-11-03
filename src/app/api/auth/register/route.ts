import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  stageName: z.string().optional(),
  legalName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`register_${ip}`, 10, 10 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(validated.password);

    // Public self-registration is strictly role: 'ARTIST' for security
    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        passwordHash,
        name: validated.name,
        role: 'ARTIST',
        isEmailVerified: true,
        artistProfile: {
          create: {
            stageName: validated.stageName || validated.name,
            legalName: validated.legalName || validated.name,
            contactEmail: validated.email.toLowerCase(),
          },
        },
      },
      include: {
        artistProfile: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        artistProfile: user.artistProfile,
      },
    });

    response.cookies.set('phd_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal server error during registration' }, { status: 500 });
  }
}

