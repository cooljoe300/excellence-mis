import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademicTermId, getProgramCourses } from '@/app/actions/enrollments';

export async function POST(request: NextRequest) {
  try {
    const { programId } = await request.json();
    
    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle();

    const studentId = student?.id;

    const termId = await getCurrentAcademicTermId();
    const units = await getProgramCourses(programId);

    // Get existing enrollments for the current term
    let enrolledCourseIds: string[] = [];
    if (studentId && termId) {
      const { data: existingEnrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .in('status', ['active', 'pending']);
      
      enrolledCourseIds = (existingEnrollments ?? []).map((e) => e.course_id as string);
    }

    return NextResponse.json({
      units: units.map((u: any) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        unit_fee: Number(u.unit_fee ?? 0),
        credits: u.credits ?? 0,
        isEnrolled: enrolledCourseIds.includes(u.id),
      })),
      termId,
    });
  } catch (error) {
    console.error('Error fetching program units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}
