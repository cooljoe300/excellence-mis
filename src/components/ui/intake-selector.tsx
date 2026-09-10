'use client';

import { useState, useEffect } from 'react';
import Select from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Program, Intake } from '@/lib/types';

interface IntakeSelectorProps {
  programmes: Program[];
  selectedProgramIds: string[];
  intakes: Intake[];
  selectedIntakeId: string;
  onIntakeChange: (intakeId: string) => void;
  error?: string;
  disabled?: boolean;
}

export function IntakeSelector({
  programmes,
  selectedProgramIds,
  intakes,
  selectedIntakeId,
  onIntakeChange,
  error,
  disabled,
}: IntakeSelectorProps) {
  const [commonIntake, setCommonIntake] = useState<Intake | null>(null);
  const [hasMultipleIntakes, setHasMultipleIntakes] = useState(false);

  // Check if all selected programmes have the same intake
  useEffect(() => {
    if (selectedProgramIds.length === 0) {
      setCommonIntake(null);
      setHasMultipleIntakes(false);
      return;
    }

    const selectedPrograms = programmes.filter((p) => p.id && selectedProgramIds.includes(p.id));
    
    if (selectedPrograms.length === 0) {
      setCommonIntake(null);
      setHasMultipleIntakes(false);
      return;
    }

    // For now, we'll assume all programmes can use the same intake
    // In a more complex implementation, you'd check if programmes have different intake requirements
    const firstIntake = intakes[0];
    setCommonIntake(firstIntake || null);
    setHasMultipleIntakes(false);
  }, [selectedProgramIds, programmes, intakes]);

  if (selectedProgramIds.length === 0) {
    return (
      <Select
        label="Intake"
        value=""
        onChange={() => {}}
        options={[{ value: '', label: 'Select programmes first' }]}
        disabled
      />
    );
  }

  if (hasMultipleIntakes) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Intake Assignment
        </label>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Multiple Intakes Detected</p>
          <p className="mt-1 text-xs">
            The selected programmes have different intake requirements. Please configure intake assignments individually.
          </p>
        </div>
        {/* Future: Add programme-to-intake mapping interface */}
      </div>
    );
  }

  return (
    <Select
      label="Intake"
      required
      value={selectedIntakeId}
      onChange={(value) => onIntakeChange(value)}
      error={error}
      disabled={disabled}
      options={[
        { value: '', label: 'Select intake' },
        ...intakes.map((intake) => ({ value: intake.id, label: intake.name })),
      ]}
    />
  );
}