import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isPhdAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();

    const updated = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: {
        companyName: body.companyName,
        administrativeEmail: body.administrativeEmail,
        companyContactInfo: body.companyContactInfo,
        defaultAuthorizedRep: body.defaultAuthorizedRep,
        defaultRepPosition: body.defaultRepPosition,
        releaseReferencePrefix: body.releaseReferencePrefix,
        availableCurrencies: Array.isArray(body.availableCurrencies)
          ? JSON.stringify(body.availableCurrencies)
          : body.availableCurrencies,
        supportedDsps: Array.isArray(body.supportedDsps)
          ? JSON.stringify(body.supportedDsps)
          : body.supportedDsps,
        maxFileUploadMb: Number(body.maxFileUploadMb) || 100,
      },
      create: {
        id: 'default',
        companyName: body.companyName || 'PHD Services',
        administrativeEmail: body.administrativeEmail || 'operations@phdservices.com',
        companyContactInfo: body.companyContactInfo || 'PHD Services HQ',
        defaultAuthorizedRep: body.defaultAuthorizedRep || 'Authorised Representative',
        defaultRepPosition: body.defaultRepPosition || 'Head of Legal & Business Affairs',
        releaseReferencePrefix: body.releaseReferencePrefix || 'PHD',
      },
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entityType: 'SystemSettings',
      entityId: 'default',
      newValue: body,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

