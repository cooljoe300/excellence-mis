'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/page-header';
import { formatCurrency } from '@/lib/utils';
import {
  addCurriculumUnit,
  createCurriculum,
  deleteCurriculum,
  deleteCurriculumUnit,
  getCurriculumConfiguration,
  updateCurriculum,
  updateCurriculumUnit,
} from '@/app/actions/curriculum';
import type { CurriculumWithUnits } from '@/lib/curriculum';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';

interface ProgrammeRow {
  id: string;
  name: string;
  code: string;
  admission_prefix: string | null;
  admission_number_format: string | null;
  admission_sequence_start: number;
  program_type: string | null;
  study_modes: string[] | null;
  campus: string | null;
  is_active: boolean;
}

interface CourseRow {
  id: string;
  program_id: string | null;
  code: string;
  name: string;
  credits: number;
  unit_fee: number;
  is_active: boolean;
}

interface Configuration {
  programs: ProgrammeRow[];
  curricula: CurriculumWithUnits[];
  courses: CourseRow[];
}

export function CurriculumClient() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [curriculumModalProgramme, setCurriculumModalProgramme] = useState<ProgrammeRow | null>(null);
  const [curriculumForm, setCurriculumForm] = useState({
    name: '',
    academic_year: '',
    version: 'v1',
    effective_from: '',
    effective_to: '',
    is_active: true,
  });

  const [unitModalCurriculum, setUnitModalCurriculum] = useState<CurriculumWithUnits | null>(null);
  const [unitForm, setUnitForm] = useState({
    course_id: '',
    semester: '1',
    sort_order: '',
  });

  const [editingUnit, setEditingUnit] = useState<
    (CurriculumWithUnits['units'][number] & { curriculum_id: string }) | null
  >(null);
  const [editUnitForm, setEditUnitForm] = useState({
    semester: '1',
    sort_order: '',
    is_active: true,
  });

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'curriculum' | 'unit';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const result = await getCurriculumConfiguration();
    if ('error' in result) {
      setError(result.error);
      setConfig(null);
    } else {
      setConfig(result as Configuration);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const curriculaByProgram = useMemo(() => {
    const map = new Map<string, CurriculumWithUnits[]>();
    for (const curriculum of config?.curricula ?? []) {
      const list = map.get(curriculum.program_id) ?? [];
      list.push(curriculum);
      map.set(curriculum.program_id, list);
    }
    return map;
  }, [config]);

  function resetCurriculumForm(programme: ProgrammeRow) {
    setCurriculumForm({
      name: `${programme.name} Curriculum`,
      academic_year: '',
      version: 'v1',
      effective_from: '',
      effective_to: '',
      is_active: true,
    });
  }

  function openCurriculumModal(programme: ProgrammeRow) {
    resetCurriculumForm(programme);
    setCurriculumModalProgramme(programme);
  }

  async function handleCreateCurriculum(e: React.FormEvent) {
    e.preventDefault();
    if (!curriculumModalProgramme) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createCurriculum({
      program_id: curriculumModalProgramme.id,
      name: curriculumForm.name,
      academic_year: curriculumForm.academic_year,
      version: curriculumForm.version,
      effective_from: curriculumForm.effective_from || null,
      effective_to: curriculumForm.effective_to || null,
      is_active: curriculumForm.is_active,
    });

    setSaving(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setCurriculumModalProgramme(null);
    setSuccess('Curriculum created. Add its units next.');
    await load();
  }

  async function toggleCurriculum(curriculum: CurriculumWithUnits) {
    setError(null);
    setSuccess(null);
    const result = await updateCurriculum(curriculum.id, { is_active: !curriculum.is_active });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setSuccess(
      `Curriculum “${curriculum.name}” ${curriculum.is_active ? 'deactivated' : 'activated'}.`
    );
    await load();
  }

  function openUnitModal(curriculum: CurriculumWithUnits) {
    setUnitForm({ course_id: '', semester: '1', sort_order: '' });
    setUnitModalCurriculum(curriculum);
  }

  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitModalCurriculum) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await addCurriculumUnit({
      curriculum_id: unitModalCurriculum.id,
      course_id: unitForm.course_id,
      semester: Number(unitForm.semester),
      sort_order: unitForm.sort_order ? Number(unitForm.sort_order) : null,
    });

    setSaving(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setUnitModalCurriculum(null);
    setSuccess('Unit added to the curriculum.');
    await load();
  }

  function openEditUnit(curriculum: CurriculumWithUnits, unit: CurriculumWithUnits['units'][number]) {
    setEditUnitForm({
      semester: String(unit.semester),
      sort_order: unit.sort_order != null ? String(unit.sort_order) : '',
      is_active: unit.is_active,
    });
    setEditingUnit({ ...unit, curriculum_id: curriculum.id });
  }

  async function handleUpdateUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUnit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateCurriculumUnit(editingUnit.id, {
      semester: Number(editUnitForm.semester),
      sort_order: editUnitForm.sort_order ? Number(editUnitForm.sort_order) : null,
      is_active: editUnitForm.is_active,
    });

    setSaving(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setEditingUnit(null);
    setSuccess('Curriculum unit updated.');
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    const result =
      deleteTarget.type === 'curriculum'
        ? await deleteCurriculum(deleteTarget.id)
        : await deleteCurriculumUnit(deleteTarget.id);

    setDeleting(false);

    if ('error' in result) {
      setError(result.error);
      setDeleteTarget(null);
      return;
    }

    setSuccess(
      deleteTarget.type === 'curriculum'
        ? 'Curriculum deleted.'
        : 'Unit removed from the curriculum. Existing enrollments are preserved.'
    );
    setDeleteTarget(null);
    await load();
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? 'Unable to load curriculum configuration.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">Configuration flow</p>
        <p className="mt-1 text-blue-800">
          Programme → admission number format → curriculum → academic year/version → semester →
          units. Students are then enrolled or moved using these settings; no code changes are
          needed.
        </p>
      </div>

      {config.programs.length === 0 ? (
        <EmptyState
          title="No programmes configured"
          description="Create a programme first, then add its curriculum and units."
          icon={GraduationCap}
          action={
            <Link href="/dashboard/programs">
              <Button>Manage programmes</Button>
            </Link>
          }
        />
      ) : (
        config.programs.map((programme) => {
          const curricula = curriculaByProgram.get(programme.id) ?? [];
          return (
            <Card key={programme.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-700" />
                      {programme.code} — {programme.name}
                      <Badge status={programme.is_active ? 'active' : 'inactive'}>
                        {programme.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Prefix: <span className="font-mono">{programme.admission_prefix ?? '—'}</span>
                      {' · '}Format:{' '}
                      <span className="font-mono">
                        {programme.admission_number_format ?? 'Global default'}
                      </span>
                      {programme.program_type ? ` · ${programme.program_type}` : ''}
                      {programme.study_modes && programme.study_modes.length > 0
                        ? ` · ${programme.study_modes.join(', ')}`
                        : ''}
                      {programme.campus ? ` · ${programme.campus}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/programs">
                      <Button type="button" variant="secondary" size="sm">
                        <Settings2 className="h-4 w-4" />
                        Programme settings
                      </Button>
                    </Link>
                    <Button type="button" size="sm" onClick={() => openCurriculumModal(programme)}>
                      <Plus className="h-4 w-4" />
                      Curriculum
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {curricula.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm text-slate-600">
                      No curriculum configured. Add a curriculum, then assign its semester units.
                    </p>
                  </div>
                ) : (
                  curricula.map((curriculum) => (
                    <CurriculumBlock
                      key={curriculum.id}
                      curriculum={curriculum}
                      onAddUnit={() => openUnitModal(curriculum)}
                      onToggle={() => void toggleCurriculum(curriculum)}
                      onEditUnit={(unit) => openEditUnit(curriculum, unit)}
                      onDeleteUnit={(unit) =>
                        setDeleteTarget({
                          type: 'unit',
                          id: unit.id,
                          name: `${unit.course?.code ?? 'Unit'} — ${unit.course?.name ?? unit.course_id}`,
                        })
                      }
                      onDelete={() =>
                        setDeleteTarget({
                          type: 'curriculum',
                          id: curriculum.id,
                          name: curriculum.name,
                        })
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <Modal
        open={Boolean(curriculumModalProgramme)}
        onClose={() => setCurriculumModalProgramme(null)}
        title="Add curriculum"
        description={
          curriculumModalProgramme
            ? `${curriculumModalProgramme.code} — ${curriculumModalProgramme.name}`
            : undefined
        }
        size="lg"
      >
        <form onSubmit={handleCreateCurriculum} className="space-y-4">
          <Input
            label="Curriculum name"
            value={curriculumForm.name}
            onChange={(e) => setCurriculumForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Academic year"
              value={curriculumForm.academic_year}
              onChange={(e) =>
                setCurriculumForm((prev) => ({ ...prev, academic_year: e.target.value }))
              }
              placeholder="e.g. 2026/2027"
              required
            />
            <Input
              label="Version"
              value={curriculumForm.version}
              onChange={(e) => setCurriculumForm((prev) => ({ ...prev, version: e.target.value }))}
              placeholder="v1"
            />
            <Input
              label="Effective from (optional)"
              type="date"
              value={curriculumForm.effective_from}
              onChange={(e) =>
                setCurriculumForm((prev) => ({ ...prev, effective_from: e.target.value }))
              }
            />
            <Input
              label="Effective to (optional)"
              type="date"
              value={curriculumForm.effective_to}
              onChange={(e) =>
                setCurriculumForm((prev) => ({ ...prev, effective_to: e.target.value }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
              checked={curriculumForm.is_active}
              onChange={(e) =>
                setCurriculumForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
            />
            Active (available for new student registrations and programme changes)
          </label>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurriculumModalProgramme(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create curriculum'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(unitModalCurriculum)}
        onClose={() => setUnitModalCurriculum(null)}
        title="Add unit to curriculum"
        description={unitModalCurriculum?.name}
        size="lg"
      >
        {unitModalCurriculum && (
          <form onSubmit={handleAddUnit} className="space-y-4">
            <div>
              <label htmlFor="unit_course" className="block text-sm font-medium text-slate-700">
                Unit
              </label>
              <Select
                id="unit_course"
                value={unitForm.course_id}
                options={[
                  { value: '', label: 'Select unit' },
                  ...config.courses
                    .filter(
                      (course) =>
                        (!course.program_id ||
                          course.program_id === unitModalCurriculum.program_id) &&
                        course.is_active
                    )
                    .filter(
                      (course) =>
                        !unitModalCurriculum.units.some(
                          (unit) => unit.course_id === course.id
                        )
                    )
                    .map((course) => ({
                      value: course.id,
                      label: `${course.code} — ${course.name} (${course.credits} credits)`,
                    })),
                ]}
                onChange={(value) => setUnitForm((prev) => ({ ...prev, course_id: value }))}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Only units belonging to this programme (or shared units) are listed.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="unit_semester" className="block text-sm font-medium text-slate-700">
                  Semester
                </label>
                <Select
                  id="unit_semester"
                  value={unitForm.semester}
                  options={semesterOptions()}
                  onChange={(value) => setUnitForm((prev) => ({ ...prev, semester: value }))}
                />
              </div>
              <Input
                label="Sort order (optional)"
                type="number"
                min={1}
                value={unitForm.sort_order}
                onChange={(e) =>
                  setUnitForm((prev) => ({ ...prev, sort_order: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setUnitModalCurriculum(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !unitForm.course_id}>
                {saving ? 'Adding…' : 'Add unit'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(editingUnit)}
        onClose={() => setEditingUnit(null)}
        title="Edit curriculum unit"
        description={
          editingUnit?.course
            ? `${editingUnit.course.code} — ${editingUnit.course.name}`
            : undefined
        }
      >
        <form onSubmit={handleUpdateUnit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit_semester" className="block text-sm font-medium text-slate-700">
                Semester
              </label>
              <Select
                id="edit_semester"
                value={editUnitForm.semester}
                options={semesterOptions()}
                onChange={(value) =>
                  setEditUnitForm((prev) => ({ ...prev, semester: value }))
                }
              />
            </div>
            <Input
              label="Sort order (optional)"
              type="number"
              min={1}
              value={editUnitForm.sort_order}
              onChange={(e) =>
                setEditUnitForm((prev) => ({ ...prev, sort_order: e.target.value }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
              checked={editUnitForm.is_active}
              onChange={(e) =>
                setEditUnitForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
            />
            Active in this curriculum
          </label>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingUnit(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save unit'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'curriculum' ? 'Delete curriculum?' : 'Remove unit?'}
        description={
          deleteTarget?.type === 'curriculum'
            ? `Delete “${deleteTarget?.name}”? This is blocked if any student is pinned to it. Existing enrollments are never deleted.`
            : `Remove “${deleteTarget?.name}” from the curriculum? Existing student enrollments are preserved.`
        }
        confirmLabel={deleteTarget?.type === 'curriculum' ? 'Delete curriculum' : 'Remove unit'}
        loading={deleting}
      />
    </div>
  );
}

function semesterOptions() {
  return Array.from({ length: 20 }, (_, index) => index + 1).map((value) => ({
    value: String(value),
    label: `Semester ${value}`,
  }));
}

function CurriculumBlock({
  curriculum,
  onAddUnit,
  onToggle,
  onEditUnit,
  onDeleteUnit,
  onDelete,
}: {
  curriculum: CurriculumWithUnits;
  onAddUnit: () => void;
  onToggle: () => void;
  onEditUnit: (unit: CurriculumWithUnits['units'][number]) => void;
  onDeleteUnit: (unit: CurriculumWithUnits['units'][number]) => void;
  onDelete: () => void;
}) {
  const semesters = curriculum.semesters;

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{curriculum.name}</p>
            <Badge status={curriculum.is_active ? 'active' : 'inactive'}>
              {curriculum.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            {curriculum.academic_year} · {curriculum.version} · {curriculum.unit_count} units
            {curriculum.effective_from
              ? ` · from ${curriculum.effective_from}`
              : ''}
            {curriculum.effective_to ? ` · to ${curriculum.effective_to}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onAddUnit}>
            <Plus className="h-4 w-4" />
            Unit
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onToggle}>
            <Layers className="h-4 w-4" />
            {curriculum.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {semesters.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No units yet. Add units to define this curriculum&apos;s semesters.
          </div>
        ) : (
          semesters.map((semester) => {
            const units = curriculum.units.filter(
              (unit) => Number(unit.semester) === semester
            );
            return (
              <div key={semester} className="px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-700" />
                  <p className="text-sm font-semibold text-slate-900">Semester {semester}</p>
                  <span className="text-xs text-slate-500">
                    {units.length} unit{units.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-1 pr-3 font-medium">Code</th>
                        <th className="py-1 pr-3 font-medium">Unit</th>
                        <th className="py-1 pr-3 font-medium">Credits</th>
                        <th className="py-1 pr-3 font-medium">Fee</th>
                        <th className="py-1 pr-3 font-medium">Sort</th>
                        <th className="py-1 pr-3 font-medium">Status</th>
                        <th className="py-1" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {units.map((unit) => (
                        <tr key={unit.id}>
                          <td className="py-1.5 pr-3 font-mono text-xs text-slate-700">
                            {unit.course?.code ?? '—'}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-800">
                            {unit.course?.name ?? unit.course_id}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-600">
                            {unit.course?.credits ?? '—'}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-600">
                            {formatCurrency(Number(unit.course?.unit_fee ?? 0))}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-600">
                            {unit.sort_order ?? '—'}
                          </td>
                          <td className="py-1.5 pr-3">
                            <Badge status={unit.is_active ? 'active' : 'inactive'}>
                              {unit.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-1.5 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditUnit(unit)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteUnit(unit)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
