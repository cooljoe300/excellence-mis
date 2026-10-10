'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  getRecordedClassesHierarchy,
  createOnlineLesson,
  updateOnlineLesson,
  deleteOnlineLesson,
  type RecordedClassesData,
  type RecordedClassProgramGroup,
  type RecordedClassUnitGroup,
  type RecordedClassLesson,
} from '@/app/actions/lms';
import { getCourses, getPrograms } from '@/app/actions/courses';
import type { Course, Program } from '@/lib/types';
import {
  Plus, Edit, Trash2, Video, Play, Loader2, Lock, Copy,
  ChevronDown, ChevronRight, Search, Eye, Users, GraduationCap, BookOpen, AlertTriangle,
} from 'lucide-react';

type SortBy = 'recent' | 'oldest' | 'views_desc' | 'views_asc' | 'title_asc' | 'title_desc';
type StatusFilter = 'all' | 'published' | 'draft';

const NO_PROGRAM_KEY = '__no_program__';
const UNASSIGNED_KEY = '__unassigned__';

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

function sortLessons(lessons: RecordedClassLesson[], sortBy: SortBy): RecordedClassLesson[] {
  const sorted = [...lessons];
  switch (sortBy) {
    case 'recent':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case 'views_desc':
      sorted.sort((a, b) => b.stats.totalViews - a.stats.totalViews);
      break;
    case 'views_asc':
      sorted.sort((a, b) => a.stats.totalViews - b.stats.totalViews);
      break;
    case 'title_asc':
      sorted.sort((a, b) => collator.compare(a.title, b.title));
      break;
    case 'title_desc':
      sorted.sort((a, b) => collator.compare(b.title, a.title));
      break;
  }
  return sorted;
}

export function AdminOnlineClassesClient() {
  const { success, error: toastError } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [data, setData] = useState<RecordedClassesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<RecordedClassLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecordedClassLesson | null>(null);
  const [previewLesson, setPreviewLesson] = useState<RecordedClassLesson | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const initialExpansionDone = useRef(false);
  const [formData, setFormData] = useState({
    program_id: '',
    course_id: '',
    title: '',
    topic: '',
    description: '',
    recording_url: '',
    zoom_meeting_id: '',
    passcode: '',
    class_type: 'recorded' as 'live' | 'recorded',
    is_published: true,
  });

  useEffect(() => {
    loadPrograms();
    loadCourses();
    loadHierarchy();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      loadCourses(selectedProgramId);
    }
  }, [selectedProgramId]);

  async function loadPrograms() {
    try {
      const allPrograms = await getPrograms();
      setPrograms(allPrograms);
    } catch (error) {
      console.error('Error loading programs:', error);
      toastError('Failed to load programs');
    }
  }

  async function loadCourses(programId?: string) {
    try {
      const allCourses = await getCourses(programId);
      setCourses(allCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      toastError('Failed to load courses');
    }
  }

  async function loadHierarchy() {
    setLoading(true);
    try {
      const hierarchy = await getRecordedClassesHierarchy();
      setData(hierarchy);
      // Expand all programmes on first load only; preserve user toggles after refetches
      if (!initialExpansionDone.current) {
        initialExpansionDone.current = true;
        setExpandedPrograms(new Set(hierarchy.programs.map(p => p.programId ?? NO_PROGRAM_KEY)));
      }
    } catch (error) {
      console.error('Error loading recorded classes:', error);
      toastError('Failed to load recorded classes');
    } finally {
      setLoading(false);
    }
  }

  function toggleProgram(key: string) {
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleUnit(key: string) {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    const formDataObj = new FormData();
    formDataObj.append('program_id', formData.program_id);
    formDataObj.append('course_id', formData.course_id);
    formDataObj.append('title', formData.title);
    formDataObj.append('topic', formData.topic);
    formDataObj.append('description', formData.description);
    formDataObj.append('recording_url', formData.recording_url);
    formDataObj.append('zoom_meeting_id', formData.zoom_meeting_id);
    formDataObj.append('passcode', formData.passcode);
    formDataObj.append('class_type', formData.class_type);
    formDataObj.append('is_published', formData.is_published.toString());

    try {
      if (editingLesson) {
        const result = await updateOnlineLesson(editingLesson.id, formDataObj);
        if (result.success) {
          success('Recorded class updated successfully');
          setShowForm(false);
          setEditingLesson(null);
          resetForm();
          loadHierarchy();
        } else {
          toastError(result.error || 'Failed to update recorded class');
        }
      } else {
        const result = await createOnlineLesson(formDataObj);
        if (result.success) {
          success('Recorded class published successfully');
          setShowForm(false);
          resetForm();
          if (formData.program_id) {
            setExpandedPrograms(prev => new Set(prev).add(formData.program_id));
          }
          loadHierarchy();
        } else {
          toastError(result.error || 'Failed to publish recorded class');
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toastError('An error occurred while saving the class');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      const result = await deleteOnlineLesson(deleteTarget.id);
      if (result.success) {
        success('Recorded class deleted successfully');
        setDeleteTarget(null);
        loadHierarchy();
      } else {
        toastError(result.error || 'Failed to delete recorded class');
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toastError('An error occurred while deleting the class');
    }
  }

  function handleEdit(lesson: RecordedClassLesson) {
    setEditingLesson(lesson);
    setSelectedProgramId(lesson.program_id || '');
    setFormData({
      program_id: lesson.program_id || '',
      course_id: lesson.course_id,
      title: lesson.title,
      topic: lesson.topic || '',
      description: lesson.description || '',
      recording_url: lesson.recording_url || '',
      zoom_meeting_id: lesson.zoom_meeting_id || '',
      passcode: lesson.passcode || '',
      class_type: lesson.class_type || 'recorded',
      is_published: lesson.is_published,
    });
    setShowForm(true);
  }

  function handleProgramChange(programId: string) {
    setSelectedProgramId(programId);
    setFormData(prev => ({ ...prev, program_id: programId, course_id: '' }));
  }

  function resetForm() {
    setSelectedProgramId('');
    setFormData({
      program_id: '',
      course_id: '',
      title: '',
      topic: '',
      description: '',
      recording_url: '',
      zoom_meeting_id: '',
      passcode: '',
      class_type: 'recorded',
      is_published: true,
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    success('Passcode copied to clipboard');
  }

  function clearFilters() {
    setSearchQuery('');
    setFilterProgramId('');
    setFilterUnitId('');
    setFilterStatus('all');
  }

  const programUnitOptions = useMemo(() => {
    const groups = data?.programs || [];
    const scoped = filterProgramId ? groups.filter(g => g.programId === filterProgramId) : groups;
    const units = new Map<string, string>();
    for (const group of scoped) {
      for (const unit of group.units) {
        if (unit.assigned && unit.courseId) units.set(unit.courseId, unit.name);
      }
    }
    return Array.from(units.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => collator.compare(a.label, b.label));
  }, [data, filterProgramId]);

  const filteredGroups = useMemo(() => {
    const groups = data?.programs || [];
    const query = searchQuery.trim().toLowerCase();

    return groups
      .filter(group => !filterProgramId || group.programId === filterProgramId)
      .map(group => {
        const units: RecordedClassUnitGroup[] = [];
        for (const unit of group.units) {
          if (filterUnitId && unit.courseId !== filterUnitId) continue;
          const lessons = sortLessons(
            unit.lessons.filter(lesson => {
              if (filterStatus === 'published' && !lesson.is_published) return false;
              if (filterStatus === 'draft' && lesson.is_published) return false;
              if (query) {
                const haystack = [
                  group.name,
                  unit.code || '',
                  unit.name,
                  lesson.title,
                  lesson.topic || '',
                ].join(' ').toLowerCase();
                if (!haystack.includes(query)) return false;
              }
              return true;
            }),
            sortBy,
          );
          if (lessons.length === 0) continue;
          units.push({ ...unit, lessons });
        }
        if (units.length === 0) return null;
        return { ...group, units } as RecordedClassProgramGroup;
      })
      .filter((g): g is RecordedClassProgramGroup => g !== null);
  }, [data, filterProgramId, filterUnitId, filterStatus, searchQuery, sortBy]);

  const stats = useMemo(() => {
    if (!data) return null;
    const lessons = filteredGroups.flatMap(g => g.units.flatMap(u => u.lessons));
    // Union of per-lesson viewer ids gives an exact distinct-viewer count for any
    // filter combination; equals data.stats.uniqueViewers when nothing is filtered.
    const uniqueViewers = new Set(lessons.flatMap(l => l.stats.viewerIds)).size;
    return {
      totalClasses: lessons.length,
      publishedClasses: lessons.filter(l => l.is_published).length,
      totalViews: lessons.reduce((sum, l) => sum + l.stats.totalViews, 0),
      uniqueViewers,
      programCount: filteredGroups.length,
      unitCount: filteredGroups.reduce((sum, g) => sum + g.units.filter(u => u.assigned).length, 0),
    };
  }, [data, filteredGroups]);

  // Course options for the form; ensure the edited lesson's current course is visible
  // even if it is inactive and therefore missing from the programme's active course list
  const formCourseOptions = useMemo(() => {
    if (editingLesson?.course && !courses.some(c => c.id === editingLesson.course_id)) {
      return [editingLesson.course, ...courses];
    }
    return courses;
  }, [courses, editingLesson]);

  const statCards = stats ? [
    { label: 'Total Classes', value: stats.totalClasses },
    { label: 'Published', value: stats.publishedClasses },
    { label: 'Total Views', value: stats.totalViews },
    { label: 'Unique Viewers', value: stats.uniqueViewers },
    { label: 'Programmes', value: stats.programCount },
    { label: 'Units', value: stats.unitCount },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Recorded Classes</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Add and manage recorded lessons for your students.</p>
        </div>
        <Button
          onClick={() => { resetForm(); setEditingLesson(null); setShowForm(true); }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Recorded Class
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs sm:text-sm text-slate-600">{card.label}</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="w-full">
            <label htmlFor="search-classes" className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                id="search-classes"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search classes..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-full">
            <label htmlFor="filter-program" className="block text-sm font-medium text-slate-700 mb-1">Programme</label>
            <select
              id="filter-program"
              value={filterProgramId}
              onChange={(e) => { setFilterProgramId(e.target.value); setFilterUnitId(''); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Programmes</option>
              {(data?.programs || []).map(program => (
                <option key={program.programId || NO_PROGRAM_KEY} value={program.programId || ''}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="filter-unit" className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
            <select
              id="filter-unit"
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              disabled={programUnitOptions.length === 0}
            >
              <option value="">All Units</option>
              {programUnitOptions.map(unit => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="filter-status" className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="sort-by" className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="views_desc">Most Viewed</option>
              <option value="views_asc">Least Viewed</option>
              <option value="title_asc">Class Name A–Z</option>
              <option value="title_desc">Class Name Z–A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hierarchy: Programme → Unit → Recorded Classes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : !data || data.stats.totalClasses === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center">
          <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No recorded classes yet</h3>
          <p className="text-slate-600 mb-4 text-sm sm:text-base">Get started by adding your first recorded class.</p>
          <Button
            onClick={() => { resetForm(); setEditingLesson(null); setShowForm(true); }}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Recorded Class
          </Button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center">
          <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No recorded classes match your filters</h3>
          <p className="text-slate-600 mb-4 text-sm sm:text-base">Try adjusting the programme, unit, status or search.</p>
          <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => {
            const programKey = group.programId || NO_PROGRAM_KEY;
            const isProgramExpanded = expandedPrograms.has(programKey);
            // Derive counts from the filtered units so headers always match what is shown
            const groupLessons = group.units.flatMap(u => u.lessons);
            const groupLessonCount = groupLessons.length;
            const groupViews = groupLessons.reduce((sum, l) => sum + l.stats.totalViews, 0);
            const groupPublished = groupLessons.filter(l => l.is_published).length;
            const groupDrafts = groupLessonCount - groupPublished;
            const groupUnitCount = group.units.filter(u => u.assigned).length;
            return (
              <div key={programKey} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {/* Programme header */}
                <button
                  type="button"
                  onClick={() => toggleProgram(programKey)}
                  aria-expanded={isProgramExpanded}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  {isProgramExpanded ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                  )}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-primary text-base sm:text-lg">{group.name}</h2>
                      {group.code && <Badge variant="outline">{group.code}</Badge>}
                    </span>
                    <span className="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs sm:text-sm text-slate-600">
                      <span>{groupUnitCount} {groupUnitCount === 1 ? 'Unit' : 'Units'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{groupLessonCount} Recorded {groupLessonCount === 1 ? 'Class' : 'Classes'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{groupViews} {groupViews === 1 ? 'View' : 'Views'}</span>
                      {groupPublished > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          {groupPublished} Published
                        </Badge>
                      )}
                      {groupDrafts > 0 && (
                        <Badge variant="outline">{groupDrafts} Draft</Badge>
                      )}
                    </span>
                  </span>
                </button>

                {/* Units */}
                {isProgramExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4 space-y-3">
                    {group.units.map(unit => {
                      const unitKey = `${programKey}::${unit.courseId || UNASSIGNED_KEY}`;
                      const isUnitExpanded = expandedUnits.has(unitKey);
                      const unitViews = unit.lessons.reduce((sum, l) => sum + l.stats.totalViews, 0);
                      return (
                        <div key={unit.courseId || UNASSIGNED_KEY} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                          {/* Unit header */}
                          <button
                            type="button"
                            onClick={() => toggleUnit(unitKey)}
                            aria-expanded={isUnitExpanded}
                            className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            {isUnitExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                            )}
                            {unit.assigned ? (
                              <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span className={`font-medium text-sm sm:text-base ${unit.assigned ? 'text-slate-900' : 'text-amber-700'}`}>
                                  {unit.name}
                                </span>
                                {!unit.assigned && (
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">Needs unit</Badge>
                                )}
                              </span>
                              <span className="block text-xs sm:text-sm text-slate-600 mt-0.5">
                                {unit.lessons.length} {unit.lessons.length === 1 ? 'class' : 'classes'} · {unitViews} {unitViews === 1 ? 'view' : 'views'}
                              </span>
                            </span>
                          </button>

                          {/* Lessons */}
                          {isUnitExpanded && (
                            <div className="border-t border-slate-200">
                              {!unit.assigned && (
                                <div className="flex items-start gap-2 bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-sm text-amber-800">
                                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <span>
                                    These recorded classes are not linked to a unit. Use the Edit action to assign each class to the correct unit.
                                  </span>
                                </div>
                              )}

                              {/* Desktop table */}
                              <div className="hidden lg:block">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Class</TableHead>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Views</TableHead>
                                      <TableHead>Unique Viewers</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {unit.lessons.map(lesson => (
                                      <TableRow key={lesson.id}>
                                        <TableCell>
                                          <div className="font-medium text-slate-900">{lesson.title}</div>
                                          {lesson.topic && (
                                            <div className="text-sm text-slate-600">{lesson.topic}</div>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="secondary">RECORDED</Badge>
                                        </TableCell>
                                        <TableCell>
                                          <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <Eye className="h-4 w-4 text-slate-400" />
                                            {lesson.stats.totalViews}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            {lesson.stats.uniqueViewers}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          {lesson.is_published ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Published</Badge>
                                          ) : (
                                            <Badge variant="outline">Draft</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setPreviewLesson(lesson)}
                                              aria-label={`Preview ${lesson.title}`}
                                            >
                                              <Play className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleEdit(lesson)}
                                              aria-label={`Edit ${lesson.title}`}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setDeleteTarget(lesson)}
                                              aria-label={`Delete ${lesson.title}`}
                                            >
                                              <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>

                              {/* Mobile list */}
                              <div className="lg:hidden divide-y divide-slate-100">
                                {unit.lessons.map(lesson => (
                                  <div key={lesson.id} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="font-medium text-slate-900 text-sm">{lesson.title}</div>
                                        {lesson.topic && (
                                          <div className="text-xs text-slate-600 mt-0.5">{lesson.topic}</div>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                          <Badge variant="secondary" className="text-xs">RECORDED</Badge>
                                          {lesson.is_published ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Published</Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-xs">Draft</Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-600">
                                          <span className="flex items-center gap-1">
                                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                                            {lesson.stats.totalViews} views
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5 text-slate-400" />
                                            {lesson.stats.uniqueViewers} viewers
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setPreviewLesson(lesson)}
                                          aria-label={`Preview ${lesson.title}`}
                                        >
                                          <Play className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEdit(lesson)}
                                          aria-label={`Edit ${lesson.title}`}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setDeleteTarget(lesson)}
                                          aria-label={`Delete ${lesson.title}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingLesson(null); resetForm(); }}
        title={editingLesson ? 'Edit Recorded Class' : 'Add Recorded Class'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="program_id" className="block text-sm font-medium text-slate-700 mb-1">
              Programme <span className="text-red-600">*</span>
            </label>
            <select
              id="program_id"
              required
              value={formData.program_id}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            >
              <option value="">Select programme</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="course_id" className="block text-sm font-medium text-slate-700 mb-1">
              Unit <span className="text-red-600">*</span>
            </label>
            <select
              id="course_id"
              required
              disabled={!selectedProgramId}
              value={formData.course_id}
              onChange={(e) => setFormData(prev => ({ ...prev, course_id: e.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedProgramId ? 'Please select a programme first' : 'Select unit'}
              </option>
              {formCourseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            {!selectedProgramId && (
              <p className="text-xs text-slate-500 mt-1">Select a programme to see available units</p>
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Class Title <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Introduction to Financial Accounting – Lesson 1"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., Introduction to Double Entry Accounting"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="This recorded lesson covers the basic principles of double-entry accounting."
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="recording_url" className="block text-sm font-medium text-slate-700 mb-1">
              Recorded Class URL <span className="text-red-600">*</span>
            </label>
            <input
              id="recording_url"
              type="url"
              required
              value={formData.recording_url}
              onChange={(e) => setFormData(prev => ({ ...prev, recording_url: e.target.value }))}
              placeholder="Paste Zoom recording link here"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="zoom_meeting_id" className="block text-sm font-medium text-slate-700 mb-1">
              Zoom Meeting ID
            </label>
            <input
              id="zoom_meeting_id"
              type="text"
              value={formData.zoom_meeting_id}
              onChange={(e) => setFormData(prev => ({ ...prev, zoom_meeting_id: e.target.value }))}
              placeholder="e.g., 123 456 7890"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-slate-500 mt-1">Optional: Enter the Zoom meeting ID for easy reference.</p>
          </div>

          <div>
            <label htmlFor="class_type" className="block text-sm font-medium text-slate-700 mb-1">
              Class Type
            </label>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-600">Recorded Class</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Students will click to watch the recorded class.</p>
            <input type="hidden" name="class_type" value={formData.class_type} />
          </div>

          <div>
            <label htmlFor="passcode" className="block text-sm font-medium text-slate-700 mb-1">
              Passcode
            </label>
            <input
              id="passcode"
              type="text"
              value={formData.passcode}
              onChange={(e) => setFormData(prev => ({ ...prev, passcode: e.target.value }))}
              placeholder="Enter recording passcode if required"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-slate-500 mt-1">Leave blank if the recording does not require a passcode.</p>
          </div>

          <div>
            <label htmlFor="is_published" className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              id="is_published"
              value={formData.is_published ? 'published' : 'draft'}
              onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.value === 'published' }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Draft classes are only visible to administrators.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowForm(false); setEditingLesson(null); resetForm(); }}
              disabled={formLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading} className="w-full sm:w-auto">
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingLesson ? 'Update Class' : 'Save Recorded Class'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewLesson && (
        <Modal
          open={!!previewLesson}
          onClose={() => setPreviewLesson(null)}
          title="Class Preview"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Programme</label>
              <p className="text-slate-900 mt-1 break-words">
                {previewLesson.program?.name || programs.find(p => p.id === previewLesson.program_id)?.name || 'Not assigned'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Unit</label>
              <p className="text-slate-900 mt-1 break-words">
                {previewLesson.course
                  ? `${previewLesson.course.code} - ${previewLesson.course.name}`
                  : previewLesson.unit_name || 'Unit not assigned'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Class Title</label>
              <p className="text-slate-900 mt-1 break-words">{previewLesson.title}</p>
            </div>
            {previewLesson.topic && (
              <div>
                <label className="text-sm font-medium text-slate-700">Topic</label>
                <p className="text-slate-900 mt-1 break-words">{previewLesson.topic}</p>
              </div>
            )}
            {previewLesson.description && (
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <p className="text-slate-900 mt-1 break-words">{previewLesson.description}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant={previewLesson.class_type === 'recorded' ? 'secondary' : 'default'}>
                {previewLesson.class_type === 'recorded' ? 'RECORDED CLASS' : 'LIVE CLASS'}
              </Badge>
            </div>
            {(() => {
              const passcode = previewLesson.passcode;
              if (!passcode) return null;
              return (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">Recording Passcode</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(passcode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-slate-900 font-mono break-all">{passcode}</p>
                </div>
              );
            })()}
            <div className="pt-4 border-t border-slate-200">
              <Button
                onClick={() => {
                  if (previewLesson.recording_url) {
                    window.open(previewLesson.recording_url, '_blank', 'noopener,noreferrer');
                  } else if (previewLesson.zoom_url) {
                    window.open(previewLesson.zoom_url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {previewLesson.class_type === 'recorded' ? 'Watch Recording' : 'Join Class'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Recorded Class"
        description="Are you sure you want to delete this recorded class? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}
