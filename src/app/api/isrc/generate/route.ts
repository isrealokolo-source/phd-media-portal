import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateNextIsrc } from '@/lib/reference';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const countParam = searchParams.get('count');
    const count = Math.min(Math.max(parseInt(countParam || '1', 10) || 1, 1), 100);

    const isrcs = await generateNextIsrc(count);
    return NextResponse.json({ success: true, isrcs });
  } catch (err: any) {
    console.error('Failed to generate ISRC:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate ISRC' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(parseInt(body.count || '1', 10) || 1, 1), 100);

    const isrcs = await generateNextIsrc(count);
    return NextResponse.json({ success: true, isrcs });
  } catch (err: any) {
    console.error('Failed to generate ISRC:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate ISRC' }, { status: 500 });
  }
}

