import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isSuperAdmin, isPhdAdmin, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { sendUserInvitationEmail } from '@/lib/email';
import { z } from 'zod';
import crypto from 'crypto';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'RELEASE_REVIEWER', 'ARTIST']),
  password: z.string().min(6).optional(),
  sendInviteEmail: z.boolean().default(true),
  // Optional Artist Profile details
  stageName: z.string().optional(),
  legalName: z.string().optional(),
  label: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Only PHD personnel can access user list' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const query = searchParams.get('q')?.toLowerCase();

    const where: any = {};
    if (roleFilter && ['SUPER_ADMIN', 'ADMIN', 'RELEASE_REVIEWER', 'ARTIST'].includes(roleFilter)) {
      where.role = roleFilter;
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { artistProfile: { stageName: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        avatarUrl: true,
        createdAt: true,
        artistProfile: true,
        _count: {
          select: {
            releases: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('Failed to fetch users:', err);
    return NextResponse.json({ error: err.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Super Administrators can provision user accounts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createUserSchema.parse(body);

    const email = parsed.email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A user with email "${email}" already exists on the portal` },
        { status: 400 }
      );
    }

    // Determine initial password
    const rawPassword =
      parsed.password?.trim() ||
      `PHD-${crypto.randomBytes(3).toString('hex').toUpperCase()}!${Math.floor(10 + Math.random() * 90)}`;

    const passwordHash = await hashPassword(rawPassword);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: parsed.name.trim(),
          email,
          passwordHash,
          role: parsed.role,
          isEmailVerified: true,
        },
      });

      if (parsed.role === 'ARTIST') {
        await tx.artistProfile.create({
          data: {
            userId: u.id,
            stageName: parsed.stageName?.trim() || parsed.name.trim(),
            legalName: parsed.legalName?.trim() || parsed.name.trim(),
            contactEmail: email,
            label: parsed.label?.trim() || 'Independent',
            phone: parsed.phone?.trim() || null,
            country: parsed.country?.trim() || 'Nigeria',
          },
        });
      }

      return tx.user.findUnique({
        where: { id: u.id },
        include: { artistProfile: true },
      });
    });

    // Record in Audit Trail
    await createAuditLog({
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser!.id,
      newValue: {
        email: newUser!.email,
        name: newUser!.name,
        role: newUser!.role,
        createdBy: currentUser.email,
      },
    });

    // Send invitation email if enabled
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    if (parsed.sendInviteEmail) {
      sendUserInvitationEmail({
        toEmail: newUser!.email,
        name: newUser!.name,
        role: newUser!.role,
        tempPassword: rawPassword,
        appUrl,
      }).catch((err) => console.error('Failed to send invitation email:', err));
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      temporaryPassword: rawPassword,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || 'Invalid input data' }, { status: 400 });
    }
    console.error('Failed to create user:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 500 });
  }
}

