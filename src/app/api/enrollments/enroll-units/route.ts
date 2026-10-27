import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademicTermId } from '@/app/actions/enrollments';
import { resolveStudentCurriculum, findInvalidCurriculumUnits } from '@/lib/curriculum';
import { getUnbilledEnrollmentsForCourses, createFeeInvoiceForEnrollments } from '@/lib/enrollment-fees';

export async function POST(request: NextRequest) {
  try {
    const { unitIds, termId, semester: requestedSemester } = await request.json();

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json({ error: 'Unit IDs are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await (supabase.auth as any).getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, program_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    if (!student.program_id) {
      return NextResponse.json({ error: 'Select your programme first.' }, { status: 400 });
    }

    // Use provided termId or fall back to current academic term
    const effectiveTermId = termId || (await getCurrentAcademicTermId());
    if (!effectiveTermId) {
      return NextResponse.json({ error: 'No academic term selected' }, { status: 400 });
    }

    const normalized = Array.from(new Set<string>(unitIds.filter(Boolean)));

    const curriculumContext = await resolveStudentCurriculum(supabase, student.id);
    const curriculum = curriculumContext?.curriculum;

    if (!curriculum || curriculum.semesters.length === 0) {
      return NextResponse.json(
        {
          error:
            'No curriculum is configured for your programme yet. Please contact the college administration.',
        },
        { status: 400 }
      );
    }

    const requested = Number(requestedSemester);
    const currentSemester = Number(curriculumContext?.student.current_semester ?? 1);
    const semester = Number.isFinite(requested) && curriculum.semesters.includes(requested)
      ? requested
      : curriculum.semesters.includes(currentSemester)
        ? currentSemester
        : curriculum.semesters[0];

    const invalid = await findInvalidCurriculumUnits(
      supabase,
      curriculum.id,
      semester,
      normalized
    );

    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `One or more selected units are not part of semester ${semester} in your curriculum.`,
        },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('enrollments')
      .select('id, course_id, status')
      .eq('student_id', student.id)
      .eq('term_id', effectiveTermId)
      .in('status', ['active', 'pending', 'deregistered']);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const activeByCourse = new Map(
      (existing ?? [])
        .filter((e) => e.status === 'active' || e.status === 'pending')
        .map((e) => [e.course_id as string, e])
    );
    const deregisteredByCourse = new Map(
      (existing ?? [])
        .filter((e) => e.status === 'deregistered')
        .map((e) => [e.course_id as string, e])
    );

    const toAdd = normalized.filter((id) => !activeByCourse.has(id));

    if (toAdd.length === 0) {
      return NextResponse.json({ error: 'Select at least one new unit to register' }, { status: 400 });
    }

    const reactivate = toAdd.filter((id) => deregisteredByCourse.has(id));

    if (reactivate.length > 0) {
      const { error: reactivateError } = await supabase
        .from('enrollments')
        .update({
          status: 'active',
          deregistered_at: null,
          deregistered_by: null,
          deregistration_reason: null,
        })
        .eq('student_id', student.id)
        .eq('term_id', effectiveTermId)
        .in('course_id', reactivate);

      if (reactivateError) {
        return NextResponse.json({ error: reactivateError.message }, { status: 500 });
      }
    }

    const trulyNew = toAdd.filter((id) => !deregisteredByCourse.has(id));

    if (trulyNew.length > 0) {
      const { error: insertError } = await supabase.from('enrollments').insert(
        trulyNew.map((courseId) => ({
          student_id: student.id,
          term_id: effectiveTermId,
          course_id: courseId,
          status: 'active',
        }))
      );

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const unbilledEnrollments = await getUnbilledEnrollmentsForCourses(
      supabase,
      student.id,
      effectiveTermId,
      normalized
    );

    if (unbilledEnrollments.length > 0) {
      const invoiceResult = await createFeeInvoiceForEnrollments(supabase, {
        studentId: student.id,
        termId: effectiveTermId,
        enrollments: unbilledEnrollments,
      });

      if (invoiceResult && 'error' in invoiceResult) {
        return NextResponse.json({ error: invoiceResult.error }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      enrolledCount: toAdd.length,
      semester,
      curriculumName: curriculum.name,
    });
  } catch (error) {
    console.error('Error enrolling units:', error);
    return NextResponse.json({ error: 'Failed to enroll in units' }, { status: 500 });
  }
}
