import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendArtistWelcomeEmail, sendNewArtistRegistrationAdminAlertEmail } from '@/lib/email';

const registerSchema = z.object({
  contractNumber: z.string().trim().min(3, 'Contract number is required'),
  artistName: z.string().trim().min(1, 'Artist name is required'),
  name: z.string().trim().min(2, 'Full legal name is required'),
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

    // 1. Verify Contract Number & Artist Name match
    const contract = await prisma.artistContract.findFirst({
      where: {
        contractNumber: { equals: validated.contractNumber, mode: 'insensitive' },
      },
    });

    if (!contract) {
      return NextResponse.json(
        {
          error: `Contract number "${validated.contractNumber}" was not found. Please contact PHD Services to obtain an authorized contract number.`,
        },
        { status: 400 }
      );
    }

    if (contract.status === 'CLAIMED') {
      return NextResponse.json(
        { error: `Contract "${contract.contractNumber}" has already been claimed by a registered artist account.` },
        { status: 400 }
      );
    }

    if (contract.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Contract "${contract.contractNumber}" is no longer active.` },
        { status: 400 }
      );
    }

    // Compare artist name (case-insensitive trim)
    const normalizedContractName = contract.artistName.trim().toLowerCase();
    const normalizedInputName = validated.artistName.trim().toLowerCase();

    if (normalizedContractName !== normalizedInputName) {
      return NextResponse.json(
        {
          error: `Artist name "${validated.artistName}" does not match the authorized artist name on contract ${contract.contractNumber}. Both the contract number and artist name must match exactly.`,
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(validated.password);

    // 2. Create User and Claim Contract in Transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: validated.email.toLowerCase(),
          passwordHash,
          name: validated.name,
          role: 'ARTIST',
          isEmailVerified: true,
          artistProfile: {
            create: {
              stageName: contract.artistName,
              legalName: validated.name,
              contactEmail: validated.email.toLowerCase(),
            },
          },
        },
        include: {
          artistProfile: true,
        },
      });

      await tx.artistContract.update({
        where: { id: contract.id },
        data: {
          status: 'CLAIMED',
          claimedByUserId: newUser.id,
          claimedAt: new Date(),
        },
      });

      return newUser;
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      newValue: {
        email: user.email,
        role: user.role,
        contractNumber: contract.contractNumber,
        artistName: contract.artistName,
      },
    });

    // 3. Dispatch Email Notifications
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://phd-media-portal.onrender.com';
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const adminEmail = settings?.administrativeEmail || process.env.PHD_ADMIN_EMAIL || 'israel@phantomdigital.com.ng';

    sendArtistWelcomeEmail({
      artistEmail: user.email,
      artistName: contract.artistName,
      contractNumber: contract.contractNumber,
      appUrl,
    }).catch((err) => console.error('Failed to send artist welcome email:', err));

    sendNewArtistRegistrationAdminAlertEmail({
      adminEmail,
      artistName: contract.artistName,
      artistEmail: user.email,
      contractNumber: contract.contractNumber,
      appUrl,
    }).catch((err) => console.error('Failed to send admin alert email:', err));

    // 4. Issue Session Token
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
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
