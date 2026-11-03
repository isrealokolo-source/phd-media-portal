import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const artists = await prisma.user.findMany({
      where: { role: 'ARTIST' },
      include: {
        artistProfile: true,
        releases: {
          select: {
            id: true,
            title: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ artists });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to list artists' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isPhdAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, stageName, legalName, phone, label, country } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const tempPassword = 'Password123!';
    const passwordHash = await hashPassword(tempPassword);

    const newArtist = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: 'ARTIST',
        isEmailVerified: true,
        artistProfile: {
          create: {
            stageName: stageName || name,
            legalName: legalName || name,
            contactEmail: email.toLowerCase(),
            phone,
            label,
            country: country || 'Nigeria',
          },
        },
      },
      include: { artistProfile: true },
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ARTIST_INVITED',
      entityType: 'User',
      entityId: newArtist.id,
      newValue: { email: newArtist.email, stageName },
    });

    return NextResponse.json({ success: true, artist: newArtist });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

