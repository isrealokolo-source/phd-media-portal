import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendLoginAlertEmail } from '@/lib/email';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`login_${ip}`, 15, 5 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateLimit.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        artistProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGGED_IN',
      entityType: 'User',
      entityId: user.id,
    });

    // Send login security alert email (asynchronously)
    sendLoginAlertEmail({
      userEmail: user.email,
      userName: user.name,
      role: user.role,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || 'Web Browser',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    }).catch((err) => console.error('Failed to send login alert email:', err));

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
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error during authentication' }, { status: 500 });
  }
}

