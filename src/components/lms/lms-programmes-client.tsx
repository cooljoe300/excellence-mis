'use client';

import Link from 'next/link';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { Program } from '@/lib/types';
import { GraduationCap, BookOpen } from 'lucide-react';

export function LmsProgrammesClient({ programs }: { programs: Program[] }) {
  return (
    <div>
      <PageHeader
        title="LMS Programmes"
        description="Select a programme to manage learning activities for its courses"
      />

      {programs.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No programmes available"
          description="Programmes need to be created in the main Programs section before they can be used in the LMS."
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">S/N</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Tuition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program, index) => (
                <TableRow key={program.id}>
                  <TableCell className="text-slate-600">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{program.code}</TableCell>
                  <TableCell className="font-medium text-slate-900">{program.name}</TableCell>
                  <TableCell className="text-muted">{program.duration_months} months</TableCell>
                  <TableCell className="text-muted">{formatCurrency(program.tuition_fee)}</TableCell>
                  <TableCell>
                    <Badge status={program.is_active ? 'active' : 'inactive'}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/lms/programmes/${program.id}`}>
                      <Button size="sm" variant="secondary">
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Courses
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      )}
    </div>
  );
}
