'use client';

import { useMemo } from 'react';
import type { Program, Timetable } from '@/lib/types';
import { getProgrammeColourClasses, getSharedClassColourClasses } from '@/lib/programme-colours';

interface ProgrammeLegendProps {
  programmes: Program[];
  timetables: Timetable[];
  showCompact?: boolean;
}

export function ProgrammeLegend({ programmes, timetables, showCompact = false }: ProgrammeLegendProps) {
  // Get unique programmes from timetables and combine with available programmes
  const uniqueProgrammes = useMemo(() => {
    const programmeIds = new Set<string>();
    
    // Add programmes from timetables
    timetables.forEach((tt) => {
      if (tt.program_id) programmeIds.add(tt.program_id);
      if (tt.programme_assignments) {
        tt.programme_assignments.forEach((pa) => {
          if (pa.programme_id) programmeIds.add(pa.programme_id);
        });
      }
    });

    // Get programme details
    return programmes.filter((p) => programmeIds.has(p.id));
  }, [programmes, timetables]);

  const hasSharedClasses = timetables.some((tt) => tt.class_type === 'shared');

  if (showCompact && uniqueProgrammes.length === 0 && !hasSharedClasses) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${showCompact ? 'flex-wrap' : ''}`}>
      <span className="text-xs font-medium text-slate-600">
        {showCompact ? '' : 'Programmes:'}
      </span>
      
      <div className="flex flex-wrap gap-2">
        {uniqueProgrammes.map((programme) => {
          const colours = getProgrammeColourClasses(programme.id);
          return (
            <div
              key={programme.id}
              className="flex items-center gap-1.5"
              title={programme.name}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: colours.border,
                  border: `2px solid ${colours.border}`,
                }}
              />
              <span className="text-xs text-slate-700">
                {showCompact ? programme.code : `${programme.code} - ${programme.name}`}
              </span>
            </div>
          );
        })}
        
        {hasSharedClasses && (
          <div className="flex items-center gap-1.5" title="Shared/Common Classes">
            <div
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: '#e1a916',
                border: '2px solid #e1a916',
              }}
            />
            <span className="text-xs text-slate-700">
              {showCompact ? 'Shared' : 'Shared Classes'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}