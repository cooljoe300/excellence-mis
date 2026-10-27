import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademicTermId } from '@/app/actions/enrollments';
import {
  getCurriculumUnitOptions,
  getProgrammeCurricula,
  resolveDefaultCurriculum,
  resolveStudentCurriculum,
} from '@/lib/curriculum';

export async function POST(request: NextRequest) {
  try {
    const { programId, termId, semester: requestedSemester } = await request.json();

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await (supabase.auth as any).getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student record
    const { data: student } = await supabase
      .from('students')
      .select('id, program_id, curriculum_id, current_semester')
      .eq('profile_id', user.id)
      .maybeSingle();

    const studentId = student?.id;

    // Use provided termId or fall back to current academic term
    const effectiveTermId = termId || (await getCurrentAcademicTermId());

    let curriculum = null;

    if (student && student.program_id === programId) {
      const context = await resolveStudentCurriculum(supabase, student.id);
      curriculum = context?.curriculum ?? null;
    }

    if (!curriculum) {
      curriculum = await resolveDefaultCurriculum(supabase, programId);
    }

    if (!curriculum) {
      return NextResponse.json({
        units: [],
        termId: effectiveTermId,
        semester: null,
        semesters: [],
        curriculumName: null,
        error:
          'No curriculum is configured for this programme yet. Please contact the college administration.',
      });
    }

    const requested = Number(requestedSemester);
    const semester = Number.isFinite(requested) && curriculum.semesters.includes(requested)
      ? requested
      : curriculum.semesters.includes(Number(student?.current_semester))
        ? Number(student?.current_semester)
        : curriculum.semesters[0];

    const units = await getCurriculumUnitOptions(supabase, curriculum.id, semester);

    // Get existing enrollments for the term
    let enrolledCourseIds: string[] = [];
    if (studentId && effectiveTermId) {
      const { data: existingEnrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('term_id', effectiveTermId)
        .in('status', ['active', 'pending']);

      enrolledCourseIds = (existingEnrollments ?? []).map((e) => e.course_id as string);
    }

    return NextResponse.json({
      units: units.map((u) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        unit_fee: Number(u.unit_fee ?? 0),
        credits: u.credits ?? 0,
        semester: u.semester,
        isEnrolled: enrolledCourseIds.includes(u.id),
      })),
      termId: effectiveTermId,
      semester,
      semesters: curriculum.semesters,
      curriculumName: curriculum.name,
    });
  } catch (error) {
    console.error('Error fetching curriculum units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const programId = request.nextUrl.searchParams.get('programId');
  if (!programId) {
    return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const curricula = await getProgrammeCurricula(supabase, programId, true);

    return NextResponse.json({
      curricula: curricula.map((curriculum) => ({
        id: curriculum.id,
        name: curriculum.name,
        academic_year: curriculum.academic_year,
        version: curriculum.version,
        semesters: curriculum.semesters,
        unit_count: curriculum.unit_count,
      })),
    });
  } catch (error) {
    console.error('Error fetching programme curricula:', error);
    return NextResponse.json({ error: 'Failed to fetch curricula' }, { status: 500 });
  }
}
