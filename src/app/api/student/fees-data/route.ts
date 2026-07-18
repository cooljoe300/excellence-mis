import { NextResponse } from 'next/server';
import { getMyFeesPageData } from '@/app/actions/student-fees';

export async function GET() {
  try {
    const data = await getMyFeesPageData();
    if (!data) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load fees';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
