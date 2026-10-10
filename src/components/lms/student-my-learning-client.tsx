'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getStudentLearningHierarchy, trackRecordedClassView } from '@/app/actions/lms';
import type { StudentLearningData, StudentLearningUnit } from '@/app/actions/lms';
import { calculateLessonStatus } from '@/lib/lms-utils';
import type { Student, OnlineLesson, LmsLearningActivity } from '@/lib/types';
import {
  BookOpen, Video, Loader2, Search, Calendar, Clock, CheckCircle2, ArrowRight, Copy, Phone,
  Play, FileText, GraduationCap, ChevronDown, ChevronRight, ExternalLink, RotateCcw,
} from 'lucide-react';

type TypeFilter = 'all' | 'recorded' | 'live' | 'materials';
type ProgressFilter = 'all' | 'not-started' | 'in-progress' | 'completed';

interface UnitWithProgram {
  programId: string;
  unit: StudentLearningUnit;
}

interface ContinueTarget {
  kind: 'live-upcoming' | 'recorded';
  programId: string;
  unit: StudentLearningUnit;
  lesson: OnlineLesson;
}

function lessonStartTime(lesson: OnlineLesson): number {
  if (!lesson.scheduled_date) return Number.MAX_SAFE_INTEGER;
  const d = new Date(lesson.scheduled_date);
  if (lesson.start_time) {
    const [h, m] = lesson.start_time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d.getTime();
}

export function StudentMyLearningClient({ student }: { student: Student }) {
  const [data, setData] = useState<StudentLearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [highlightedLessonId, setHighlightedLessonId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<{ field: string; lessonId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hierarchy = await getStudentLearningHierarchy(student.id);
        if (!cancelled) setData(hierarchy);
      } catch (error) {
        console.error('Error loading learning data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [student.id]);

  const flatUnits = useMemo<UnitWithProgram[]>(() => {
    if (!data) return [];
    return data.programs.flatMap(p => p.units.map(unit => ({ programId: p.programId, unit })));
  }, [data]);

  const unitProgress = (unit: StudentLearningUnit): number => {
    if (unit.enrollmentStatus === 'completed') return 1;
    if (unit.recordedLessons.length === 0) return 0;
    return unit.viewedLessonIds.length / unit.recordedLessons.length;
  };

  const unitStatusOf = (unit: StudentLearningUnit): 'not-started' | 'in-progress' | 'completed' => {
    if (unit.enrollmentStatus === 'completed' || unitProgress(unit) === 1) return 'completed';
    if (unitProgress(unit) === 0) return 'not-started';
    return 'in-progress';
  };

  const allLessons = useMemo(() => {
    return flatUnits.flatMap(({ unit }) => [...unit.liveLessons, ...unit.recordedLessons]);
  }, [flatUnits]);

  const liveLessons = useMemo(
    () => allLessons.filter(l => calculateLessonStatus(l) === 'live'),
    [allLessons],
  );

  // Most relevant unfinished activity: nearest upcoming live class, otherwise an
  // unviewed recording from the unit with the lowest progress.
  const continueTarget = useMemo<ContinueTarget | null>(() => {
    if (!data) return null;

    const upcoming = flatUnits
      .flatMap(({ programId, unit }) => unit.liveLessons.map(lesson => ({ programId, unit, lesson })))
      .filter(item => calculateLessonStatus(item.lesson) === 'upcoming')
      .sort((a, b) => lessonStartTime(a.lesson) - lessonStartTime(b.lesson));
    if (upcoming.length > 0) {
      return { kind: 'live-upcoming', ...upcoming[0] };
    }

    const withUnviewed = flatUnits
      .map(({ programId, unit }) => ({
        programId,
        unit,
        unviewed: unit.recordedLessons.filter(l => !unit.viewedLessonIds.includes(l.id)),
      }))
      .filter(item => item.unviewed.length > 0)
      .sort((a, b) => unitProgress(a.unit) - unitProgress(b.unit));
    if (withUnviewed.length > 0) {
      const { programId, unit, unviewed } = withUnviewed[0];
      return { kind: 'recorded', programId, unit, lesson: unviewed[0] };
    }

    return null;
  }, [data, flatUnits]);

  const unitFilterOptions = useMemo(() => {
    const units = programFilter === 'all'
      ? flatUnits
      : flatUnits.filter(({ programId }) => programId === programFilter);
    return units.map(({ unit }) => ({
      value: unit.courseId,
      label: `${unit.courseCode} ${unit.courseName}`.trim(),
    }));
  }, [flatUnits, programFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    programFilter !== 'all' ||
    unitFilter !== 'all' ||
    typeFilter !== 'all' ||
    progressFilter !== 'all';

  function resetFilters() {
    setSearchQuery('');
    setProgramFilter('all');
    setUnitFilter('all');
    setTypeFilter('all');
    setProgressFilter('all');
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  function handleJoinClass(lesson: OnlineLesson) {
    const url = lesson.class_type === 'recorded' ? lesson.recording_url : lesson.zoom_url;
    if (!url) return;
    if (lesson.class_type === 'recorded' && student.id) {
      trackRecordedClassView(lesson.id, student.id)
        .then(() => {
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              programs: prev.programs.map(p => ({
                ...p,
                units: p.units.map(u =>
                  u.courseId === lesson.course_id && !u.viewedLessonIds.includes(lesson.id)
                    ? { ...u, viewedLessonIds: [...u.viewedLessonIds, lesson.id] }
                    : u,
                ),
              })),
            };
          });
        })
        .catch(err => console.error('Failed to track view:', err));
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openMaterial(activity: LmsLearningActivity) {
    if (!activity.external_url) return;
    if (activity.launch_mode === 'same_tab') {
      window.location.assign(activity.external_url);
    } else {
      window.open(activity.external_url, '_blank', 'noopener,noreferrer');
    }
  }

  async function copyToClipboard(text: string | null, field: string, lessonId: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField({ field, lessonId });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  function isFieldCopied(field: string, lessonId: string): boolean {
    return copiedField?.lessonId === lessonId && copiedField.field === field;
  }

  function extractMeetingId(zoomUrl: string | null): string | null {
    if (!zoomUrl) return null;
    try {
      const url = new URL(zoomUrl);
      const pathParts = url.pathname.split('/');
      return pathParts[pathParts.length - 1] || null;
    } catch {
      return null;
    }
  }

  function toggleUnit(courseId: string) {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }

  function handleContinueLearning() {
    if (!continueTarget) return;
    setSearchQuery('');
    setTypeFilter('all');
    setProgressFilter('all');
    setProgramFilter(continueTarget.programId);
    setUnitFilter('all');
    setExpandedUnits(prev => new Set(prev).add(continueTarget.unit.courseId));
    setHighlightedLessonId(continueTarget.lesson.id);
    setTimeout(() => {
      document
        .getElementById(`lesson-${continueTarget.lesson.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => setHighlightedLessonId(null), 2600);
  }

  // Content visible inside a unit after type + search filters
  function filterUnitContent(unit: StudentLearningUnit) {
    const q = searchQuery.trim().toLowerCase();
    const matches = (text: string | null) => !!text && text.toLowerCase().includes(q);

    let recorded = unit.recordedLessons;
    let live = unit.liveLessons;
    let materials = unit.materials;

    if (typeFilter !== 'all') {
      recorded = typeFilter === 'recorded' ? recorded : [];
      live = typeFilter === 'live' ? live : [];
      materials = typeFilter === 'materials' ? materials : [];
    }

    if (q) {
      const unitMatches = matches(unit.courseName) || matches(unit.courseCode);
      if (!unitMatches) {
        recorded = recorded.filter(l => matches(l.title) || matches(l.topic));
        live = live.filter(l => matches(l.title) || matches(l.topic));
        materials = materials.filter(a => matches(a.name) || matches(a.description));
      }
    }

    return { recorded, live, materials };
  }

  function isUnitVisible(unit: StudentLearningUnit, programName: string): boolean {
    if (unitFilter !== 'all' && unit.courseId !== unitFilter) return false;
    if (progressFilter !== 'all' && unitStatusOf(unit) !== progressFilter) return false;

    const q = searchQuery.trim().toLowerCase();
    const content = filterUnitContent(unit);
    const totalContent = content.recorded.length + content.live.length + content.materials.length;
    if (totalContent === 0) {
      // Only keep a unit with no matching content if the search itself matched the unit
      if (!q) return false;
      return (
        unit.courseName.toLowerCase().includes(q) ||
        unit.courseCode.toLowerCase().includes(q) ||
        programName.toLowerCase().includes(q)
      );
    }
    return true;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const intakeLabel = student.intake
    ? [student.intake.name, student.intake.academic_year].filter(Boolean).join(' · ')
    : '';

  const visiblePrograms = (data?.programs ?? [])
    .filter(p => programFilter === 'all' || p.programId === programFilter)
    .map(p => ({
      ...p,
      units: p.units.filter(u => isUnitVisible(u, p.programName)),
    }))
    .filter(p => p.units.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">My Learning</h1>
        <p className="text-slate-600 mt-1">Continue your learning across your enrolled programmes.</p>
      </div>

      {/* Continue Learning */}
      {continueTarget ? (
        <div className="bg-primary-light border border-primary/20 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Continue Learning</div>
              <h2 className="text-lg font-bold text-slate-900 mt-1 truncate">
                {continueTarget.lesson.title}
              </h2>
              <div className="text-sm text-slate-600 mt-1">
                {continueTarget.unit.courseCode} {continueTarget.unit.courseName}
                {continueTarget.kind === 'live-upcoming' && continueTarget.lesson.scheduled_date && (
                  <span className="inline-flex items-center gap-1 ml-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(continueTarget.lesson.scheduled_date)} {formatTime(continueTarget.lesson.start_time)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 max-w-md">
                <div className="h-2 flex-1 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${Math.round(unitProgress(continueTarget.unit) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {Math.round(unitProgress(continueTarget.unit) * 100)}%
                </span>
              </div>
            </div>
            <Button onClick={handleContinueLearning} className="shrink-0">
              {continueTarget.kind === 'live-upcoming' ? 'View Live Class' : 'Continue'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      ) : data && data.totalUnits > 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
          <div>
            <div className="font-semibold text-slate-900">You are all caught up</div>
            <p className="text-sm text-slate-600">You have no unfinished recorded classes right now.</p>
          </div>
        </div>
      ) : null}

      {/* Live Class Banner */}
      {liveLessons.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="font-semibold">LIVE NOW</span>
              </div>
              <h3 className="text-xl font-bold">{liveLessons[0].title}</h3>
              {liveLessons[0].topic && <p className="text-red-100 mt-1">{liveLessons[0].topic}</p>}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-red-100">
                {liveLessons[0].scheduled_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(liveLessons[0].scheduled_date)}
                  </div>
                )}
                {liveLessons[0].start_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTime(liveLessons[0].start_time)} – {formatTime(liveLessons[0].end_time)}
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => handleJoinClass(liveLessons[0])}
              className="bg-white text-red-600 hover:bg-red-50 shrink-0"
            >
              <Phone className="h-4 w-4 mr-2" />
              Join Live Class
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search units, lessons, materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={programFilter}
            onChange={(e) => { setProgramFilter(e.target.value); setUnitFilter('all'); }}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Programmes</option>
            {(data?.programs ?? []).map(p => (
              <option key={p.programId} value={p.programId}>{p.programName}</option>
            ))}
          </select>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Units</option>
            {unitFilterOptions.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-5">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-10 w-full sm:w-48 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Learning Types</option>
              <option value="recorded">Recorded Classes</option>
              <option value="live">Live Classes</option>
              <option value="materials">Learning Materials</option>
            </select>
            <select
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value as ProgressFilter)}
              className="h-10 w-full sm:w-48 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Progress</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="shrink-0">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Programme sections */}
      {!data || data.totalUnits === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No enrolled units yet</h3>
          <p className="text-slate-600">You are not enrolled in any units yet. Once your enrollment is confirmed, your learning content will appear here.</p>
        </div>
      ) : visiblePrograms.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No learning content matches your filters</h3>
          <p className="text-slate-600 mb-4">Try adjusting your search or filters.</p>
          <Button variant="secondary" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {visiblePrograms.map(program => {
            const programProgress = program.units.length > 0
              ? program.units.reduce((sum, u) => sum + unitProgress(u), 0) / program.units.length
              : 0;
            const programCompleted = program.units.filter(u => u.enrollmentStatus === 'completed').length;

            return (
              <div key={program.programId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {/* Programme header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-primary text-base sm:text-lg">{program.programName}</h2>
                        {program.programCode && (
                          <Badge variant="outline">{program.programCode}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {[intakeLabel, `${program.units.length} unit${program.units.length !== 1 ? 's' : ''}`, `${programCompleted} completed`, `${program.units.length - programCompleted} pending`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(programProgress * 100)}%
                      </div>
                      <div className="text-xs text-slate-500">
                        {programCompleted} of {program.units.length} units completed
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{ width: `${Math.round(programProgress * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Units */}
                <div className="divide-y divide-slate-200">
                  {program.units.map(unit => {
                    const isExpanded = expandedUnits.has(unit.courseId);
                    const progress = unitProgress(unit);
                    const status = unitStatusOf(unit);
                    const content = filterUnitContent(unit);
                    const totalContent = content.recorded.length + content.live.length + content.materials.length;

                    return (
                      <div key={unit.courseId}>
                        <button
                          onClick={() => toggleUnit(unit.courseId)}
                          className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                              : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900 truncate">
                                  {unit.courseCode} {unit.courseName}
                                </span>
                                {status === 'completed' && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
                                )}
                                {status === 'in-progress' && (
                                  <Badge variant="default">In Progress</Badge>
                                )}
                                {status === 'not-started' && (
                                  <Badge variant="outline">Not Started</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                                {unit.recordedLessons.length > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Video className="h-3.5 w-3.5" />
                                    {unit.recordedLessons.length} recorded
                                  </span>
                                )}
                                {unit.liveLessons.length > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {unit.liveLessons.length} live
                                  </span>
                                )}
                                {unit.materials.length > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" />
                                    {unit.materials.length} materials
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold text-slate-700">
                                {Math.round(progress * 100)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${status === 'completed' ? 'bg-green-500' : 'bg-primary'}`}
                              style={{ width: `${Math.round(progress * 100)}%` }}
                            />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 sm:px-6 sm:pb-6 bg-slate-50/50 space-y-6">
                            {totalContent === 0 ? (
                              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
                                <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-600">
                                  No learning content is available for this unit yet. Check back soon.
                                </p>
                              </div>
                            ) : (
                              <>
                                {/* Recorded Classes */}
                                {content.recorded.length > 0 && (
                                  <section>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                      <Video className="h-4 w-4 text-primary" />
                                      Recorded Classes
                                      <span className="text-slate-400 font-normal">({content.recorded.length})</span>
                                    </h3>
                                    <div className="space-y-3">
                                      {content.recorded.map(lesson => {
                                        const viewed = unit.viewedLessonIds.includes(lesson.id);
                                        return (
                                          <div
                                            key={lesson.id}
                                            id={`lesson-${lesson.id}`}
                                            className={`bg-white border rounded-lg p-4 transition-shadow ${
                                              highlightedLessonId === lesson.id
                                                ? 'border-primary ring-2 ring-primary/30'
                                                : 'border-slate-200'
                                            }`}
                                          >
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                                                  {viewed ? (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                                      Watched
                                                    </Badge>
                                                  ) : (
                                                    <Badge variant="outline">Not watched</Badge>
                                                  )}
                                                </div>
                                                {lesson.topic && (
                                                  <p className="text-sm text-slate-600 mt-1">{lesson.topic}</p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                                                  {lesson.scheduled_date && (
                                                    <span className="inline-flex items-center gap-1">
                                                      <Calendar className="h-4 w-4" />
                                                      {formatDate(lesson.scheduled_date)}
                                                    </span>
                                                  )}
                                                  {lesson.start_time && (
                                                    <span className="inline-flex items-center gap-1">
                                                      <Clock className="h-4 w-4" />
                                                      {formatTime(lesson.start_time)} – {formatTime(lesson.end_time)}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <Button
                                                onClick={() => handleJoinClass(lesson)}
                                                variant={viewed ? 'secondary' : undefined}
                                                className="shrink-0 w-full sm:w-auto"
                                              >
                                                <Play className="h-4 w-4 mr-2" />
                                                {viewed ? 'Watch Again' : 'Watch Recording'}
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </section>
                                )}

                                {/* Live Classes */}
                                {content.live.length > 0 && (
                                  <section>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-primary" />
                                      Live Classes
                                      <span className="text-slate-400 font-normal">({content.live.length})</span>
                                    </h3>
                                    <div className="space-y-3">
                                      {content.live.map(lesson => {
                                        const status = calculateLessonStatus(lesson);
                                        const meetingId = lesson.zoom_meeting_id || extractMeetingId(lesson.zoom_url);
                                        return (
                                          <div
                                            key={lesson.id}
                                            id={`lesson-${lesson.id}`}
                                            className={`bg-white border rounded-lg p-4 transition-shadow ${
                                              highlightedLessonId === lesson.id
                                                ? 'border-primary ring-2 ring-primary/30'
                                                : 'border-slate-200'
                                            }`}
                                          >
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                              {status === 'live' && <Badge variant="destructive">LIVE NOW</Badge>}
                                              {status === 'upcoming' && <Badge variant="default">UPCOMING</Badge>}
                                              {status === 'completed' && <Badge variant="secondary">COMPLETED</Badge>}
                                            </div>
                                            <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                                            {lesson.topic && (
                                              <p className="text-sm text-slate-600 mt-1">{lesson.topic}</p>
                                            )}
                                            {lesson.scheduled_date && (
                                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                                                <span className="inline-flex items-center gap-1">
                                                  <Calendar className="h-4 w-4" />
                                                  {formatDate(lesson.scheduled_date)}
                                                </span>
                                                {lesson.start_time && (
                                                  <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {formatTime(lesson.start_time)} – {formatTime(lesson.end_time)}
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                            {/* Zoom details */}
                                            {(meetingId || lesson.passcode || lesson.zoom_url) && (
                                              <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-3">
                                                <div className="text-sm font-medium text-slate-700">Zoom Meeting Details</div>
                                                {meetingId && (
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-xs text-slate-500 mb-1">Meeting ID</div>
                                                      <div className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200 truncate">
                                                        {meetingId}
                                                      </div>
                                                    </div>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => copyToClipboard(meetingId, 'meetingId', lesson.id)}
                                                    >
                                                      {isFieldCopied('meetingId', lesson.id) ? (
                                                        <span className="text-green-600">✓ Copied</span>
                                                      ) : (
                                                        <><Copy className="h-4 w-4 mr-1" />Copy</>
                                                      )}
                                                    </Button>
                                                  </div>
                                                )}
                                                {lesson.passcode && (
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-xs text-slate-500 mb-1">Passcode</div>
                                                      <div className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200 truncate">
                                                        {lesson.passcode}
                                                      </div>
                                                    </div>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => copyToClipboard(lesson.passcode, 'passcode', lesson.id)}
                                                    >
                                                      {isFieldCopied('passcode', lesson.id) ? (
                                                        <span className="text-green-600">✓ Copied</span>
                                                      ) : (
                                                        <><Copy className="h-4 w-4 mr-1" />Copy</>
                                                      )}
                                                    </Button>
                                                  </div>
                                                )}
                                                {lesson.zoom_url && (
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-xs text-slate-500 mb-1">Meeting Link</div>
                                                      <div className="text-xs bg-white px-2 py-1 rounded border border-slate-200 truncate">
                                                        {lesson.zoom_url}
                                                      </div>
                                                    </div>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => copyToClipboard(lesson.zoom_url, 'link', lesson.id)}
                                                    >
                                                      {isFieldCopied('link', lesson.id) ? (
                                                        <span className="text-green-600">✓ Copied</span>
                                                      ) : (
                                                        <><Copy className="h-4 w-4 mr-1" />Copy</>
                                                      )}
                                                    </Button>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            <div className="flex justify-end mt-3">
                                              {status === 'live' ? (
                                                <Button
                                                  onClick={() => handleJoinClass(lesson)}
                                                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                                >
                                                  <Phone className="h-4 w-4 mr-2" />
                                                  Join Zoom
                                                </Button>
                                              ) : status === 'upcoming' ? (
                                                <Button variant="secondary" disabled className="w-full sm:w-auto">
                                                  Upcoming
                                                </Button>
                                              ) : (
                                                <Button variant="ghost" disabled className="w-full sm:w-auto">
                                                  Completed
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </section>
                                )}

                                {/* Learning Materials */}
                                {content.materials.length > 0 && (
                                  <section>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-primary" />
                                      Learning Materials
                                      <span className="text-slate-400 font-normal">({content.materials.length})</span>
                                    </h3>
                                    <div className="space-y-3">
                                      {content.materials.map(activity => (
                                        <div key={activity.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-medium text-slate-900">{activity.name}</h4>
                                                <Badge variant="outline">{activity.provider.replace(/_/g, ' ')}</Badge>
                                              </div>
                                              {activity.display_description && activity.description && (
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                  {activity.description}
                                                </p>
                                              )}
                                            </div>
                                            <Button
                                              onClick={() => openMaterial(activity)}
                                              variant="secondary"
                                              className="shrink-0 w-full sm:w-auto"
                                            >
                                              <ExternalLink className="h-4 w-4 mr-2" />
                                              Open Material
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </section>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
