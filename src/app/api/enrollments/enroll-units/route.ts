import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAcademicTermId } from '@/app/actions/enrollments';
import { getUnbilledEnrollmentsForCourses, createFeeInvoiceForEnrollments } from '@/lib/enrollment-fees';

export async function POST(request: NextRequest) {
  try {
    const { unitIds, termId } = await request.json();
    
    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json({ error: 'Unit IDs are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
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

    // Use provided termId or fall back to current academic term
    const effectiveTermId = termId || await getCurrentAcademicTermId();
    if (!effectiveTermId) {
      return NextResponse.json({ error: 'No academic term selected' }, { status: 400 });
    }

    const normalized = Array.from(new Set(unitIds.filter(Boolean)));

    const { data: programCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, code, name, unit_fee')
      .eq('program_id', student.program_id)
      .eq('is_active', true);

    if (coursesError) {
      return NextResponse.json({ error: coursesError.message }, { status: 500 });
    }

    const validCourseMap = new Map((programCourses ?? []).map((c) => [c.id as string, c]));
    const invalid = normalized.filter((id) => !validCourseMap.has(id));
    if (invalid.length > 0) {
      return NextResponse.json({ error: 'One or more selected units are not valid for your program' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('enrollments')
      .select('id, course_id')
      .eq('student_id', student.id)
      .eq('term_id', effectiveTermId)
      .in('status', ['active', 'pending']);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingByCourse = new Map((existing ?? []).map((e) => [e.course_id as string, e]));
    const toAdd = normalized.filter((id) => !existingByCourse.has(id));

    if (toAdd.length === 0) {
      return NextResponse.json({ error: 'Select at least one new unit to register' }, { status: 400 });
    }

    const { error: insertError } = await supabase.from('enrollments').insert(
      toAdd.map((courseId) => ({
        student_id: student.id,
        term_id: effectiveTermId,
        course_id: courseId,
        status: 'active',
      }))
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
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

    return NextResponse.json({ success: true, enrolledCount: toAdd.length });
  } catch (error) {
    console.error('Error enrolling units:', error);
    return NextResponse.json({ error: 'Failed to enroll in units' }, { status: 500 });
  }
}
