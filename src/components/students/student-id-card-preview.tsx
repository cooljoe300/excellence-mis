'use client';

import { useMemo, useState } from 'react';
import type { Program, Student } from '@/lib/types';
import { StudentIdCardDocument } from '@/components/students/student-id-card-document';

export function StudentIdCardPreview({
  student,
  photoPreviewUrl,
  programs,
  programId,
}: {
  student?: Student;
  photoPreviewUrl?: string | null;
  programs: Program[];
  programId?: string;
}) {
  const previewStudent = useMemo(() => {
    if (!student) return null;
    const program =
      student.program ??
      programs.find((p) => p.id === (programId || student.program_id)) ??
      null;

    return {
      ...student,
      photo_url: photoPreviewUrl ?? student.photo_url,
      program,
    } as Student;
  }, [student, photoPreviewUrl, programs, programId]);

  if (!previewStudent?.id) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Complete registration first, then upload a passport photo to preview your ID card.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">ID card preview</p>
      <StudentIdCardDocument student={previewStudent} />
      <p className="text-xs text-slate-500">
        This is how your student ID card will look. Save your details after uploading a photo.
      </p>
    </div>
  );
}

export function PassportPhotoUpload({
  existingPhotoUrl,
  onPreviewChange,
}: {
  existingPhotoUrl?: string | null;
  onPreviewChange: (url: string | null) => void;
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setLocalPreview(null);
      onPreviewChange(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    onPreviewChange(url);
  }

  const displayUrl = localPreview ?? existingPhotoUrl ?? null;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-36 w-28 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="Passport preview" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-slate-400">Passport photo</span>
          )}
        </div>
        <label className="cursor-pointer">
          <span className="inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover">
            Choose photo
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleChange}
          />
        </label>
        <p className="max-w-[140px] text-center text-xs text-slate-500">
          JPG, PNG or WebP · max 2 MB · plain background recommended
        </p>
      </div>
    </div>
  );
}
