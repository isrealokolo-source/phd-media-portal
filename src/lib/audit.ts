import { prisma } from './prisma';

export interface LogAuditOptions {
  releaseId?: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export async function createAuditLog(options: LogAuditOptions) {
  try {
    return await prisma.auditLog.create({
      data: {
        releaseId: options.releaseId,
        userId: options.userId,
        userEmail: options.userEmail,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        previousValue: options.previousValue ? JSON.stringify(options.previousValue) : null,
        newValue: options.newValue ? JSON.stringify(options.newValue) : null,
        ipAddress: options.ipAddress || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

